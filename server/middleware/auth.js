const jwt = require('jsonwebtoken');
const db = require('../db/database');

const { getJwtSecret } = require('../utils/jwtSecret');
const JWT_SECRET = getJwtSecret();

const USER_FIELDS = 'id, tenant_id, email, role, salutation, title, first_name, last_name, company, buyer_type, succession_type, token_version, is_active, doc_notify_frequency';

// Passt die Token-Version zum aktuellen Stand des Nutzers? Ältere Tokens ohne
// den Claim gelten als Version 0 (kein Massen-Logout beim Einführen).
function tokenVersionOk(decoded, user) {
  return (decoded.tv || 0) === (user.token_version || 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Der Zwischenschein des zweiten Faktors ist kein Zugang (v0.473).
//
// Bei aktivem zweitem Faktor gibt die Anmeldung nach richtigem Passwort eine
// kurzlebige Bescheinigung aus, mit der NUR der Code eingelöst wird. Sie trug
// `{ userId, twofa: true }` und sonst nichts. Hier wurde aber allein
// `decoded.userId` gelesen, und `tv` fehlte, was als Version 0 durchging.
// Damit war diese Bescheinigung fünf Minuten lang ein vollwertiges
// Sitzungstoken: Wer das Passwort kannte, konnte den zweiten Faktor
// überspringen, indem er die Antwort der Anmeldung als `Bearer` weiterreichte.
//
// Ein Schein, der zwei Dinge kann, kann eines davon zu früh.
// ─────────────────────────────────────────────────────────────────────────────
function istZwischenschein(decoded) {
  return !!(decoded && (decoded.twofa === true || decoded.zweck === '2fa'));
}

// Sprint 5 (RLS): Nutzer-Lookup im Kontext des über die Subdomain aufgelösten
// Tenants: sonst wären Nutzer anderer Mandanten unsichtbar (fail closed).
async function lookupUser(req, userId) {
  const fn = (d) => d.get(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`, [userId]);
  return (req.tenantId && req.tenantId !== 1) ? db.withTenant(req.tenantId, fn) : fn(db);
}

// ─────────────────────────────────────────────────────────────────────────────
// Birdview (Ansicht als anderer Nutzer): STRENG SCHREIBGESCHÜTZT.
//
// Trägt das Token den Claim `imp` (= Id des Admins), sieht der Aufrufer die
// Plattform mit den Augen des Zielnutzers. In dieser Identität darf er NIEMALS
// handeln: sonst könnte ein Admin versehentlich in fremdem Namen ein NDA
// unterzeichnen, eine Nachricht senden oder Daten ändern.
//
//   erlaubt:  GET (Lesen) außerhalb von /api/admin und /api/crm + Beenden
//   gesperrt: alle schreibenden Methoden, kompletter Admin- und CRM-Bereich
// ─────────────────────────────────────────────────────────────────────────────
async function attachImpersonation(req, decoded) {
  if (!decoded || !decoded.imp) return;
  req.impersonatedBy = decoded.imp;
  const admin = await lookupUser(req, decoded.imp).catch(() => null);
  if (req.user) {
    req.user.impersonated_by = admin
      ? { id: admin.id, name: `${admin.first_name} ${admin.last_name}`.trim(), email: admin.email }
      : { id: decoded.imp, name: 'Administrator', email: null };
  }
}

function impersonationGuard(req, res) {
  if (!req.impersonatedBy) return true;
  const url = req.originalUrl || req.url || '';

  // Das Beenden der Ansicht muss immer möglich sein
  if (url.startsWith('/api/auth/impersonate/end')) return true;

  // Admin- und CRM-Bereich sind in fremder Identität komplett gesperrt
  if (url.startsWith('/api/admin') || url.startsWith('/api/crm')) {
    res.status(403).json({
      success: false, code: 'IMPERSONATION_BLOCKED',
      error: 'Im Birdview sind Admin- und CRM-Bereich gesperrt. Bitte beenden Sie die Ansicht.',
    });
    return false;
  }

  // Alles Schreibende ist gesperrt
  if (req.method !== 'GET') {
    res.status(403).json({
      success: false, code: 'IMPERSONATION_READONLY',
      error: 'Birdview ist schreibgeschützt, in fremder Identität sind keine Änderungen möglich. Bitte beenden Sie die Ansicht, um selbst zu handeln.',
    });
    return false;
  }
  return true;
}

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Nicht authentifiziert' });
  }
  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    // ── Abgelaufen ist nicht dasselbe wie gefälscht (v0.515) ──────────────
    //
    // Anlass: „wenn ich NDA freigeben möchte kommt diese Fehlermeldung."
    // Oben auf dem Dashboard stand „Fehler: Ungültiges Token", darunter
    // lagen die Kennzahlen einer Sitzung, die es nicht mehr gab. Ein Fenster
    // bleibt tagelang offen, die Sitzung läuft nach sieben Tagen ab, und von
    // da an scheitert jeder Klick mit einem Satz, der nichts erklärt und
    // nichts anbietet.
    //
    // Hier wird deshalb unterschieden. Abgelaufen ist der Normalfall und
    // verlangt nur eine neue Anmeldung. Alles andere ist ein Token, das so
    // nie ausgegeben wurde, und das sagt die Meldung auch.
    const abgelaufen = err && err.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      code: abgelaufen ? 'SITZUNG_ABGELAUFEN' : 'TOKEN_UNGUELTIG',
      error: abgelaufen
        ? 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.'
        : 'Diese Anmeldung lässt sich nicht prüfen. Bitte melden Sie sich erneut an.',
    });
  }
  if (istZwischenschein(decoded)) {
    return res.status(401).json({
      success: false, code: 'ZWEITER_FAKTOR_OFFEN',
      error: 'Bitte schließen Sie die Anmeldung mit Ihrem zweiten Faktor ab.',
    });
  }
  // ── Panne ist nicht dasselbe wie abgemeldet (v0.465) ────────────────────
  //
  // Scheitert diese Abfrage, etwa weil eine Spalte fehlt, flog bisher eine
  // Ausnahme. Die Oberfläche sah irgendeinen Fehler, warf das Token weg und
  // schickte den Benutzer auf die Anmeldeseite. Von dort ging er wieder über
  // Phalanx OS herein, und das Ganze von vorn: eine Schleife, die aussieht
  // wie ein Anmeldeproblem und keines ist.
  //
  // 503 statt 401, und die Meldung sagt, dass es nicht an den Zugangsdaten
  // liegt. Dann wirft die Oberfläche das Token nicht weg.
  let user;
  try {
    user = await lookupUser(req, decoded.userId);
  } catch (e) {
    console.error('Nutzerabfrage gescheitert:', e.message);
    return res.status(503).json({
      success: false, code: 'LOOKUP_FAILED',
      error: 'Ihr Konto lässt sich gerade nicht laden. Das liegt nicht an Ihren Zugangsdaten. '
        + `Bitte melden Sie den folgenden Hinweis: ${e.message}`,
    });
  }
  if (!user || !user.is_active) {
    return res.status(401).json({ success: false, code: 'KONTO_NICHT_AKTIV', error: 'Benutzer nicht gefunden' });
  }
  if (!tokenVersionOk(decoded, user)) {
    return res.status(401).json({
      success: false, code: 'SITZUNG_ABGELAUFEN',
      error: 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.',
    });
  }
  req.user = user;
  await attachImpersonation(req, decoded);
  if (!impersonationGuard(req, res)) return;   // Antwort wurde bereits gesendet
  next();
}

async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (_) {
    return next();   // ungültiges Token → als anonym behandeln
  }
  // Auch hier: ein offener zweiter Faktor ist keine Anmeldung.
  if (istZwischenschein(decoded)) return next();
  const user = await lookupUser(req, decoded.userId).catch(() => null);
  if (user && user.is_active && tokenVersionOk(decoded, user)) {
    req.user = user;
    await attachImpersonation(req, decoded);
    // Auch hier greift der Schreibschutz: sonst wäre optionalAuth ein Schlupfloch.
    if (!impersonationGuard(req, res)) return;
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Nicht authentifiziert' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, error: 'Keine Berechtigung' });
    next();
  };
}

module.exports = {
  istZwischenschein, authenticate, optionalAuth, requireRole };
