// ─────────────────────────────────────────────────────────────────────────────
// Der Prüfstand: die echte Anwendung gegen eine echte Datenbank (v0.481)
//
// Anlass, wörtlich: „Es ist immer noch ein Fehler, dass der NDA quasi, wenn ich
// den über das Chatfenster freigebe, anscheinend den Datenraum nicht
// freigeschalten wird."
//
// Warum dieser Fehler monatelang durchkam: Alle bisherigen Prüfungen in
// server/tests sind Textprüfungen auf dem Quelltext. Sie lesen Dateien und
// suchen Muster darin. Das findet eine fehlende Zeile, aber nie einen Fehler,
// der erst entsteht, wenn zwei richtige Zeilen zusammenarbeiten. Genau das war
// es: Die Route gab frei, was man ihr nannte, und die Oberfläche nannte ihr das
// falsche Mandat. Jede Hälfte für sich war in Ordnung.
//
// Dieser Prüfstand macht es anders. Er fährt die Anwendung hoch, wie sie ist,
// legt eine erfundene Welt an und spricht über HTTP mit ihr, wie ein Browser es
// täte. Er prüft also die Anlage und nicht eine Nachbildung.
//
// Die Datenbank kommt von aussen, über PRUEFSTAND_DATABASE_URL. Sie wird
// migriert und beschrieben, deshalb darf sie NIE die Produktion sein: Die
// Prüfung weigert sich, wenn die Adresse nicht deutlich als Prüfstand oder
// Teststufe erkennbar ist.
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');

const WURZEL = path.join(__dirname, '..', '..', '..');

/** Sieht diese Adresse nach einer Wegwerf-Datenbank aus? */
function istWegwerfbar(url) {
  const u = String(url || '').toLowerCase();
  if (!u) return false;
  if (/\b(prod|production)\b/.test(u)) return false;
  return /test|pruef|pruefstand|staging|localhost|127\.0\.0\.1/.test(u);
}

/**
 * Anwendung hochfahren und einen Rufer zurückgeben.
 *
 * @returns {Promise<{db, ruf, alsNutzer, mandat, kaeufer, stufe, ende}>}
 */
async function hochfahren({ port = 5599 } = {}) {
  const url = process.env.PRUEFSTAND_DATABASE_URL;
  if (!url) {
    console.log('⏭  Übersprungen: PRUEFSTAND_DATABASE_URL ist nicht gesetzt.');
    console.log('   Diese Prüfung braucht eine eigene, leere PostgreSQL. Siehe README, Abschnitt „Prüfstand".');
    process.exit(0);
  }
  if (!istWegwerfbar(url)) {
    console.error('❌ PRUEFSTAND_DATABASE_URL sieht nicht nach einer Wegwerf-Datenbank aus.');
    console.error('   Der Prüfstand migriert und beschreibt die Datenbank. Er läuft nie gegen die Produktion.');
    process.exit(1);
  }
  process.env.DATABASE_URL = url;
  process.env.PORT = String(port);
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'pruefstand'.repeat(6);
  process.env.STORAGE_PROVIDER = 'local';
  process.env.STORAGE_DIR = process.env.STORAGE_DIR || path.join(require('os').tmpdir(), 'pruefstand-ablage');
  delete process.env.BREVO_API_KEY;   // kein Versand aus der Prüfung
  delete process.env.SMTP_HOST;

  const db = require(path.join(WURZEL, 'server', 'db', 'database'));
  await db.initialize();
  require(path.join(WURZEL, 'server', 'index.js'));
  await new Promise((r) => setTimeout(r, 2500));

  const jwt = require(path.join(WURZEL, 'server', 'node_modules', 'jsonwebtoken'));
  const bcrypt = require(path.join(WURZEL, 'server', 'node_modules', 'bcryptjs'));
  const basis = `http://127.0.0.1:${port}`;

  async function ruf(pfad, { token, methode = 'GET', koerper } = {}) {
    const r = await fetch(basis + pfad, {
      method: methode,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: koerper ? JSON.stringify(koerper) : undefined,
    });
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch { /* Dateien kommen als Rohdaten */ }
    return { status: r.status, json, text, laenge: text.length, daten: json && json.data };
  }

  const alsNutzer = (u) => jwt.sign(
    { userId: u.id, role: u.role, tv: u.token_version || 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });

  async function mandat(codename, { art = 'ma' } = {}) {
    await db.run('DELETE FROM projects WHERE codename = ?', [codename]).catch(() => {});
    return db.insert(
      `INSERT INTO projects (tenant_id, codename, mandate_type, status, created_by, industry, region, short_description)
       VALUES (1, ?, ?, 'active', (SELECT id FROM users WHERE role = 'super_admin' ORDER BY id LIMIT 1),
               'C27', 'Bayern', 'Nur für den Prüfstand.') RETURNING id`,
      [codename, art]);
  }

  // Das Profil wird vollstaendig angelegt. Die Plattform verlangt sieben
  // Felder, bevor ein Interessent ein Mandat auch nur ansehen darf
  // (requireCompleteProfile). Ein Pruefkonto ohne diese Felder scheitert an
  // der Huerde und nicht an der Sache, die geprueft werden soll.
  async function kaeufer(email, { vorname = 'Kim', nachname = 'Kaeufer' } = {}) {
    const hash = await bcrypt.hash('Pruefstand!2026', 10);
    await db.run(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role,
                          salutation, company, position, mobile, phone, street, postal_code, city,
                          is_active, is_approved, email_verified)
       VALUES (1, ?, ?, ?, ?, 'buyer', 'Frau', ?, 'Geschaeftsfuehrung', '+49 160 0000000',
               '+49 911 0000000', 'Pruefweg 1', '90000', 'Pruefstadt', 1, 1, 1)
       ON CONFLICT (email) DO UPDATE SET is_approved = 1, is_active = 1,
             salutation = 'Frau', company = EXCLUDED.company, position = 'Geschaeftsfuehrung',
             mobile = '+49 160 0000000', street = 'Pruefweg 1', postal_code = '90000', city = 'Pruefstadt'`,
      [email, hash, vorname, nachname, `${nachname} Beteiligungen`]);
    return db.get('SELECT * FROM users WHERE email = ?', [email]);
  }

  async function stufe(projectId, userId) {
    const r = await db.get('SELECT stage FROM interests WHERE project_id = ? AND buyer_id = ?', [projectId, userId]);
    return r ? r.stage : null;
  }

  async function datei(schluessel, inhalt = '%PDF-1.4 Pruefstand') {
    const { getStorage } = require(path.join(WURZEL, 'server', 'providers', 'storage'));
    await getStorage().put(schluessel, Buffer.from(inhalt), 'application/pdf');
    return Buffer.from(inhalt).length;
  }

  return { db, ruf, alsNutzer, mandat, kaeufer, stufe, datei, ende: () => process.exit(0) };
}

/** Kleine Zählung, wie in den übrigen Prüfungen dieses Projekts. */
function zaehler() {
  let fail = 0;
  const ok = (name, bedingung, zusatz = '') => {
    console.log(`${bedingung ? '✓' : '✗ FEHLER'} ${name}${zusatz ? `  [${zusatz}]` : ''}`);
    if (!bedingung) fail += 1;
  };
  const schluss = () => {
    console.log(fail ? `\n${fail} Fehler` : '\nAlles grün');
    process.exit(fail ? 1 : 0);
  };
  return { ok, schluss };
}

module.exports = { hochfahren, zaehler, istWegwerfbar };
