// CapitalMatch – Auth-Route (Login, Register, Password Reset) — PostgreSQL/Knex
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const wrap = require('../utils/asyncHandler');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'phalanx-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// ── POST /register ─────────────────────────────────────────────────────────
// All new registrations require admin approval (is_approved = 0).
// No token is returned — user sees a "pending" message.
router.post('/register', wrap(async (req, res) => {
  const { email, password, first_name, last_name, company, position, buyer_type, mobile, phone, role, privacy_consent, salutation, title } = req.body;
  if (!email || !password || !first_name || !last_name)
    return res.status(400).json({ success: false, error: 'Pflichtfelder fehlen (Vorname, Nachname, E-Mail, Passwort)' });
  if (!mobile || String(mobile).trim().length < 6)
    return res.status(400).json({ success: false, error: 'Bitte geben Sie eine Mobilnummer an (Voraussetzung für die spätere 2-Faktor-Authentifizierung)' });
  // Anrede ist Pflicht — für alle Rollen
  if (!['Herr', 'Frau', 'Divers'].includes(salutation))
    return res.status(400).json({ success: false, error: 'Bitte wählen Sie eine Anrede (Herr, Frau oder Divers)' });
  if (password.length < 8)
    return res.status(400).json({ success: false, error: 'Passwort muss mindestens 8 Zeichen haben' });
  // DSGVO: Einwilligung in Datenspeicherung und projektbezogene Ansprache ist Pflicht
  if (!privacy_consent)
    return res.status(400).json({ success: false, error: 'Bitte stimmen Sie der Datenschutzerklärung zu (Speicherung und projektbezogene Nutzung Ihrer Daten)' });

  const validRoles = ['buyer', 'seller'];
  const userRole = validRoles.includes(role) ? role : 'buyer';

  // Sprint 5 (RLS): Registrierung läuft im Kontext des über die Subdomain
  // aufgelösten Tenants (Default: 1)
  const tenantId = req.tenantId || 1;
  const password_hash = bcrypt.hashSync(password, 10);
  const crypto = require('crypto');
  const verifyToken = crypto.randomBytes(32).toString('hex');
  const verifyExpires = new Date(Date.now() + 48 * 3600 * 1000); // 48 h

  const result = await db.withTenant(tenantId, async (t) => {
    const existing = await t.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing) return { conflict: true };
    const userId = await t.insert(
      `INSERT INTO users (tenant_id, email, password_hash, role, salutation, title, first_name, last_name, company, position, buyer_type, mobile, phone, is_approved, is_active, email_verified, email_verify_token, email_verify_expires, privacy_consent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 0, ?, ?, now())`,
      [tenantId, email.toLowerCase(), password_hash, userRole,
       salutation, title || null,
       first_name, last_name,
       company || null, position || null,
       userRole === 'buyer' ? (buyer_type || null) : null,
       mobile || null, phone || null, verifyToken, verifyExpires]
    );
    // Create buyer profile only for buyers
    if (userRole === 'buyer') {
      await t.run(`INSERT INTO buyer_profiles (tenant_id, user_id, industries, regions, deal_types) VALUES (?, ?, '[]', '[]', '[]')`, [tenantId, userId]);
    }
    return { userId };
  });
  if (result.conflict) return res.status(409).json({ success: false, error: 'Diese E-Mail-Adresse ist bereits registriert' });
  const userId = result.userId;

  db.auditLog(userId, 'REGISTER', 'user', userId, `role=${userRole}`, req.ip);

  console.log(`\n📬 Neue Registrierung: ${first_name} ${last_name} <${email}> — E-Mail-Bestätigung ausstehend`);
  // Verifizierungs-Mail an den Nutzer (Registrierung erst nach Bestätigung abgeschlossen).
  const { sendEmailVerification } = require('../utils/email');
  const verifyUrl = `${process.env.FRONTEND_URL || 'https://www.capitalmatch.de'}/email-bestaetigen?token=${verifyToken}`;
  sendEmailVerification({ to: email.toLowerCase(), firstName: first_name, verifyUrl }).catch(() => {});

  // Return pending status — NO TOKEN (erst E-Mail bestätigen, dann Admin-Freigabe)
  return res.status(201).json({
    success: true,
    data: {
      pending: true,
      needs_verification: true,
      message: 'Fast geschafft! Wir haben Ihnen eine E-Mail geschickt. Bitte bestätigen Sie Ihre E-Mail-Adresse, um die Registrierung abzuschließen.',
    },
  });
}));

// ── POST /login ────────────────────────────────────────────────────────────
router.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, error: 'E-Mail und Passwort erforderlich' });

  // Sprint 5 (RLS): Lookup im Tenant-Kontext der Subdomain (Default: 1)
  const user = await db.withTenant(req.tenantId || 1, (t) =>
    t.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]));

  if (!user || !user.is_active) {
    return res.status(401).json({ success: false, error: 'Ungültige Anmeldedaten' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    db.auditLog(user.id, 'LOGIN_FAILED', 'user', user.id, null, req.ip);
    return res.status(401).json({ success: false, error: 'Ungültige Anmeldedaten' });
  }

  const isAdmin = ['super_admin', 'advisor'].includes(user.role);
  // E-Mail-Bestätigung ist Voraussetzung (Registrierung erst danach abgeschlossen)
  if (!isAdmin && !user.email_verified) {
    db.auditLog(user.id, 'LOGIN_UNVERIFIED', 'user', user.id, null, req.ip);
    return res.status(403).json({
      success: false, code: 'EMAIL_UNVERIFIED',
      error: 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse. Wir haben Ihnen bei der Registrierung einen Bestätigungslink gesendet.',
    });
  }
  // Check approval — admins are always allowed
  if (!isAdmin && !user.is_approved) {
    db.auditLog(user.id, 'LOGIN_PENDING', 'user', user.id, null, req.ip);
    return res.status(403).json({
      success: false,
      error: 'Ihr Konto wurde noch nicht freigeschaltet. Sie werden benachrichtigt, sobald der Admin Ihren Zugang aktiviert hat.',
    });
  }

  // ── Sprint 13: Zweiter Faktor ───────────────────────────────────────────
  // Ist 2FA aktiv, gibt es hier noch kein Sitzungs-Token, sondern nur eine
  // kurzlebige Challenge (5 Minuten). Erst der richtige Code schaltet frei.
  if (user.totp_enabled === 1) {
    const challenge = jwt.sign({ userId: user.id, twofa: true }, JWT_SECRET, { expiresIn: '5m' });
    db.auditLog(user.id, 'LOGIN_2FA_CHALLENGE', 'user', user.id, null, req.ip);
    return res.json({ success: true, data: { twofa_required: true, challenge } });
  }

  db.auditLog(user.id, 'LOGIN', 'user', user.id, null, req.ip);
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const { password_hash, reset_token, reset_token_expires, totp_secret, backup_codes_json, ...safeUser } = user;
  res.json({ success: true, data: { token, user: safeUser } });
}));

// ── POST /login/2fa — zweiter Faktor prüfen ────────────────────────────────
// Akzeptiert einen 6-stelligen TOTP-Code oder einen Backup-Code (einmalig).
router.post('/login/2fa', wrap(async (req, res) => {
  const { challenge, code } = req.body;
  if (!challenge || !code) return res.status(400).json({ success: false, error: 'Challenge und Code erforderlich' });

  let decoded;
  try { decoded = jwt.verify(challenge, JWT_SECRET); }
  catch { return res.status(401).json({ success: false, code: 'CHALLENGE_EXPIRED', error: 'Die Anmeldung ist abgelaufen. Bitte erneut anmelden.' }); }
  if (!decoded.twofa) return res.status(400).json({ success: false, error: 'Ungültige Challenge' });

  const user = await db.withTenant(req.tenantId || 1, (t) => t.get('SELECT * FROM users WHERE id = ?', [decoded.userId]));
  if (!user || !user.is_active || user.totp_enabled !== 1) {
    return res.status(401).json({ success: false, error: 'Zwei-Faktor-Authentifizierung nicht aktiv' });
  }

  const totp = require('../utils/totp');
  let ok = totp.verify(user.totp_secret, code);
  let usedBackup = false;

  if (!ok) {
    // Backup-Code? Wird verbraucht und danach entwertet.
    let hashes = [];
    try { hashes = JSON.parse(user.backup_codes_json || '[]'); } catch { /* leer */ }
    const r = totp.consumeBackupCode(hashes, code);
    if (r.ok) {
      ok = true; usedBackup = true;
      await db.run('UPDATE users SET backup_codes_json = ? WHERE id = ?', [JSON.stringify(r.remaining), user.id]);
      db.auditLog(user.id, 'LOGIN_2FA_BACKUP_CODE', 'user', user.id, `${r.remaining.length} Codes verbleiben`, req.ip);
    }
  }

  if (!ok) {
    db.auditLog(user.id, 'LOGIN_2FA_FAILED', 'user', user.id, null, req.ip);
    return res.status(401).json({ success: false, error: 'Code ist nicht korrekt.' });
  }

  db.auditLog(user.id, 'LOGIN', 'user', user.id, usedBackup ? 'mit Backup-Code' : 'mit 2FA', req.ip);
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const { password_hash, reset_token, reset_token_expires, totp_secret, backup_codes_json, ...safeUser } = user;
  res.json({ success: true, data: { token, user: safeUser, used_backup_code: usedBackup } });
}));

// ── 2FA einrichten / aktivieren / deaktivieren ─────────────────────────────
// Ablauf: setup → Geheimnis anzeigen (nur einmal) → enable mit korrektem Code.
router.post('/2fa/setup', authenticate, wrap(async (req, res) => {
  const totp = require('../utils/totp');
  if (req.impersonatedBy) return res.status(403).json({ success: false, error: 'Im Birdview nicht möglich.' });
  if (req.user.totp_enabled === 1) return res.status(409).json({ success: false, error: '2FA ist bereits aktiv. Bitte zuerst deaktivieren.' });

  const secret = totp.generateSecret();
  await db.run('UPDATE users SET totp_secret = ?, totp_enabled = 0 WHERE id = ?', [secret, req.user.id]);
  db.auditLog(req.user.id, '2FA_SETUP_STARTED', 'user', req.user.id, null, req.ip);
  res.json({
    success: true,
    data: {
      secret,
      otpauth_url: totp.otpauthUrl(secret, { account: req.user.email }),
      hint: 'Geheimnis in der Authenticator-App eintragen (oder den Link auf dem Handy öffnen) und anschließend mit einem Code bestätigen.',
    },
  });
}));

router.post('/2fa/enable', authenticate, wrap(async (req, res) => {
  const totp = require('../utils/totp');
  const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user.totp_secret) return res.status(400).json({ success: false, error: 'Bitte zuerst die Einrichtung starten.' });
  if (!totp.verify(user.totp_secret, req.body.code)) {
    return res.status(401).json({ success: false, error: 'Der Code stimmt nicht. Prüfen Sie die Uhrzeit auf dem Gerät.' });
  }
  const codes = totp.generateBackupCodes(8);
  await db.run(
    'UPDATE users SET totp_enabled = 1, totp_confirmed_at = now(), backup_codes_json = ? WHERE id = ?',
    [JSON.stringify(totp.hashCodes(codes)), req.user.id]);
  db.auditLog(req.user.id, '2FA_ENABLED', 'user', req.user.id, null, req.ip);
  // Die Backup-Codes gibt es genau EINMAL im Klartext.
  res.json({ success: true, data: { enabled: true, backup_codes: codes } });
}));

router.post('/2fa/disable', authenticate, wrap(async (req, res) => {
  const totp = require('../utils/totp');
  const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (user.totp_enabled !== 1) return res.status(400).json({ success: false, error: '2FA ist nicht aktiv.' });
  // Deaktivieren nur mit gültigem Code — sonst genügt ein gekaperter Cookie.
  if (!totp.verify(user.totp_secret, req.body.code)) {
    return res.status(401).json({ success: false, error: 'Zum Deaktivieren ist ein gültiger Code erforderlich.' });
  }
  if (process.env.REQUIRE_2FA_STAFF === '1' && ['super_admin', 'tenant_owner', 'advisor', 'assistant', 'analyst'].includes(user.role)) {
    return res.status(403).json({ success: false, error: 'Für interne Rollen ist 2FA verpflichtend und kann nicht deaktiviert werden.' });
  }
  await db.run('UPDATE users SET totp_enabled = 0, totp_secret = NULL, totp_confirmed_at = NULL, backup_codes_json = NULL WHERE id = ?', [req.user.id]);
  db.auditLog(req.user.id, '2FA_DISABLED', 'user', req.user.id, null, req.ip);
  res.json({ success: true, data: { enabled: false } });
}));

// Status (für die Sicherheits-Kachel im Profil)
router.get('/2fa/status', authenticate, wrap(async (req, res) => {
  const u = await db.get('SELECT totp_enabled, totp_confirmed_at, backup_codes_json FROM users WHERE id = ?', [req.user.id]);
  let remaining = 0;
  try { remaining = JSON.parse(u.backup_codes_json || '[]').length; } catch { /* egal */ }
  const { STAFF_ROLES } = require('../middleware/permissions');
  res.json({
    success: true,
    data: {
      enabled: u.totp_enabled === 1,
      confirmed_at: u.totp_confirmed_at,
      backup_codes_remaining: remaining,
      required: process.env.REQUIRE_2FA_STAFF === '1' && STAFF_ROLES.includes(req.user.role),
    },
  });
}));

// ── GET /me ────────────────────────────────────────────────────────────────
// req.user trägt im Birdview zusätzlich `impersonated_by` → der Client zeigt
// darauf das Warn-Banner an.
router.get('/me', authenticate, wrap(async (req, res) => {
  const profile = await db.get('SELECT * FROM buyer_profiles WHERE user_id = ?', [req.user.id]);
  res.json({ success: true, data: { user: req.user, profile } });
}));

// ── POST /impersonate/end — Birdview beenden ───────────────────────────────
// Muss auch im schreibgeschützten Zustand erlaubt sein (Ausnahme im Guard).
router.post('/impersonate/end', authenticate, wrap(async (req, res) => {
  if (!req.impersonatedBy) {
    return res.status(400).json({ success: false, error: 'Es ist keine Birdview-Sitzung aktiv.' });
  }
  const jwtLib = require('jsonwebtoken');
  let logId = null;
  try {
    const decoded = jwtLib.decode((req.headers.authorization || '').split(' ')[1]);
    logId = decoded && decoded.log ? decoded.log : null;
  } catch (_) { /* egal */ }

  if (logId) {
    await db.run(`UPDATE impersonation_log SET ended_at = now() WHERE id = ? AND ended_at IS NULL`, [logId]).catch(() => {});
  }
  db.auditLog(req.impersonatedBy, 'IMPERSONATE_END', 'user', req.user.id,
    `Birdview beendet (${req.user.email})`, req.ip);
  res.json({ success: true, data: { message: 'Birdview beendet' } });
}));

// ── POST /forgot-password ──────────────────────────────────────────────────
router.post('/forgot-password', wrap(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'E-Mail erforderlich' });

  // Always return success to avoid user enumeration
  const user = await db.get('SELECT id, first_name, email FROM users WHERE email = ? AND is_active = 1', [email.toLowerCase()]);

  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    await db.run('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [token, expires, user.id]);

    const frontendUrl = process.env.FRONTEND_URL || 'https://www.capitalmatch.de';
    const resetUrl = `${frontendUrl}/passwort-reset?token=${token}`;

    console.log(`\n🔑 Password Reset angefordert für ${user.email}`);
    console.log(`   Reset-Link: ${resetUrl}`);
    console.log(`   Gültig bis: ${new Date(expires).toLocaleString('de-DE')}\n`);

    // Reset-Mail an den Nutzer (nur wenn SMTP konfiguriert, sonst nur Log)
    const { sendPasswordResetEmail } = require('../utils/email');
    sendPasswordResetEmail({ to: user.email, firstName: user.first_name, resetUrl, expires }).catch(() => {});

    db.auditLog(user.id, 'PASSWORD_RESET_REQUESTED', 'user', user.id, null, req.ip);
  }

  res.json({
    success: true,
    data: { message: 'Falls ein Konto mit dieser E-Mail existiert, wurde ein Reset-Link gesendet.' },
  });
}));

// ── POST /reset-password ───────────────────────────────────────────────────
router.post('/reset-password', wrap(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ success: false, error: 'Token und neues Passwort erforderlich' });
  if (password.length < 8) return res.status(400).json({ success: false, error: 'Passwort muss mindestens 8 Zeichen haben' });

  const user = await db.get(
    `SELECT id, email FROM users WHERE reset_token = ? AND reset_token_expires > now()`,
    [token]
  );

  if (!user) {
    return res.status(400).json({ success: false, error: 'Reset-Link ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.' });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  await db.run('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [password_hash, user.id]);

  db.auditLog(user.id, 'PASSWORD_RESET_DONE', 'user', user.id, null, req.ip);
  console.log(`✅ Passwort geändert für ${user.email}`);

  res.json({ success: true, data: { message: 'Passwort erfolgreich geändert. Sie können sich jetzt anmelden.' } });
}));

// ── E-Mail bestätigen ───────────────────────────────────────────────────────
router.post('/verify-email', wrap(async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, error: 'Token fehlt' });
  const user = await db.withTenant(req.tenantId || 1, (t) => t.get('SELECT * FROM users WHERE email_verify_token = ?', [token]));
  if (!user) return res.status(400).json({ success: false, error: 'Ungültiger oder bereits verwendeter Bestätigungslink.' });
  if (user.email_verified) return res.json({ success: true, data: { message: 'Ihre E-Mail-Adresse ist bereits bestätigt.' } });
  if (user.email_verify_expires && new Date(user.email_verify_expires).getTime() < Date.now()) {
    return res.status(400).json({ success: false, error: 'Der Bestätigungslink ist abgelaufen. Bitte fordern Sie einen neuen an.', code: 'EXPIRED' });
  }
  await db.withTenant(req.tenantId || 1, (t) => t.run(`UPDATE users SET email_verified = 1, email_verify_token = NULL, email_verify_expires = NULL WHERE id = ?`, [user.id]));
  db.auditLog(user.id, 'EMAIL_VERIFIED', 'user', user.id, null, req.ip);
  // Jetzt erst den Admin über die (abgeschlossene) Registrierung informieren
  const { sendRegistrationNotification, sendRegistrationConfirmationEmail } = require('../utils/email');
  sendRegistrationConfirmationEmail({ to: user.email, firstName: user.first_name }).catch(() => {});
  sendRegistrationNotification({ firstName: user.first_name, lastName: user.last_name, email: user.email, company: user.company, role: user.role }).catch(() => {});
  res.json({ success: true, data: { message: 'E-Mail bestätigt! Ihr Konto wird nun geprüft und in Kürze freigeschaltet.' } });
}));

// ── Bestätigungs-Mail erneut senden ─────────────────────────────────────────
router.post('/resend-verification', wrap(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'E-Mail erforderlich' });
  const user = await db.withTenant(req.tenantId || 1, (t) => t.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]));
  // Immer generische Antwort (kein Nutzer-Enumeration-Leak)
  if (user && !user.email_verified) {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    await db.withTenant(req.tenantId || 1, (t) => t.run(`UPDATE users SET email_verify_token = ?, email_verify_expires = ? WHERE id = ?`, [token, new Date(Date.now() + 48 * 3600 * 1000), user.id]));
    const { sendEmailVerification } = require('../utils/email');
    const verifyUrl = `${process.env.FRONTEND_URL || 'https://www.capitalmatch.de'}/email-bestaetigen?token=${token}`;
    sendEmailVerification({ to: user.email, firstName: user.first_name, verifyUrl }).catch(() => {});
  }
  res.json({ success: true, data: { message: 'Falls ein unbestätigtes Konto existiert, haben wir eine neue Bestätigungs-E-Mail gesendet.' } });
}));

module.exports = router;
