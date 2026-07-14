const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'phalanx-secret';

const USER_FIELDS = 'id, tenant_id, email, role, salutation, title, first_name, last_name, company, is_active';

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
    return res.status(401).json({ success: false, error: 'Ungültiges Token' });
  }
  const user = await lookupUser(req, decoded.userId);
  if (!user || !user.is_active) {
    return res.status(401).json({ success: false, error: 'Benutzer nicht gefunden' });
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
  const user = await lookupUser(req, decoded.userId).catch(() => null);
  if (user && user.is_active) {
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

module.exports = { authenticate, optionalAuth, requireRole };
