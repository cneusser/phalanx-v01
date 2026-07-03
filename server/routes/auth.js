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
  const { email, password, first_name, last_name, company, position, buyer_type, phone, role, privacy_consent } = req.body;
  if (!email || !password || !first_name || !last_name)
    return res.status(400).json({ success: false, error: 'Pflichtfelder fehlen (Vorname, Nachname, E-Mail, Passwort)' });
  if (password.length < 8)
    return res.status(400).json({ success: false, error: 'Passwort muss mindestens 8 Zeichen haben' });
  // DSGVO: Einwilligung in Datenspeicherung und projektbezogene Ansprache ist Pflicht
  if (!privacy_consent)
    return res.status(400).json({ success: false, error: 'Bitte stimmen Sie der Datenschutzerklärung zu (Speicherung und projektbezogene Nutzung Ihrer Daten)' });

  const validRoles = ['buyer', 'seller'];
  const userRole = validRoles.includes(role) ? role : 'buyer';

  const existing = await db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
  if (existing) return res.status(409).json({ success: false, error: 'Diese E-Mail-Adresse ist bereits registriert' });

  const password_hash = bcrypt.hashSync(password, 10);
  const userId = await db.insert(
    `INSERT INTO users (email, password_hash, role, first_name, last_name, company, position, buyer_type, phone, is_approved, is_active, privacy_consent_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, now())`,
    [email.toLowerCase(), password_hash, userRole,
     first_name, last_name,
     company || null, position || null,
     userRole === 'buyer' ? (buyer_type || null) : null,
     phone || null]
  );

  // Create buyer profile only for buyers
  if (userRole === 'buyer') {
    await db.run(`INSERT INTO buyer_profiles (user_id, industries, regions, deal_types) VALUES (?, '[]', '[]', '[]')`, [userId]);
  }

  db.auditLog(userId, 'REGISTER', 'user', userId, `role=${userRole}`, req.ip);

  console.log(`\n📬 Neue Registrierung: ${first_name} ${last_name} <${email}> (${userRole}) — wartet auf Freigabe`);
  // Bestätigung an den Nutzer + Benachrichtigung an den Admin
  const { sendRegistrationNotification, sendRegistrationConfirmationEmail } = require('../utils/email');
  sendRegistrationConfirmationEmail({ to: email.toLowerCase(), firstName: first_name }).catch(() => {});
  sendRegistrationNotification({ firstName: first_name, lastName: last_name, email, company, role: userRole })
    .catch(() => {});

  // Return pending status — NO TOKEN
  return res.status(201).json({
    success: true,
    data: {
      pending: true,
      message: 'Registrierung erfolgreich! Ihr Konto wird geprüft und in Kürze freigeschaltet.',
    },
  });
}));

// ── POST /login ────────────────────────────────────────────────────────────
router.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, error: 'E-Mail und Passwort erforderlich' });

  const user = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);

  if (!user || !user.is_active) {
    return res.status(401).json({ success: false, error: 'Ungültige Anmeldedaten' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    db.auditLog(user.id, 'LOGIN_FAILED', 'user', user.id, null, req.ip);
    return res.status(401).json({ success: false, error: 'Ungültige Anmeldedaten' });
  }

  // Check approval — admins are always allowed
  const isAdmin = ['super_admin', 'advisor'].includes(user.role);
  if (!isAdmin && !user.is_approved) {
    db.auditLog(user.id, 'LOGIN_PENDING', 'user', user.id, null, req.ip);
    return res.status(403).json({
      success: false,
      error: 'Ihr Konto wurde noch nicht freigeschaltet. Sie werden benachrichtigt, sobald der Admin Ihren Zugang aktiviert hat.',
    });
  }

  db.auditLog(user.id, 'LOGIN', 'user', user.id, null, req.ip);
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const { password_hash, reset_token, reset_token_expires, ...safeUser } = user;
  res.json({ success: true, data: { token, user: safeUser } });
}));

// ── GET /me ────────────────────────────────────────────────────────────────
router.get('/me', authenticate, wrap(async (req, res) => {
  const profile = await db.get('SELECT * FROM buyer_profiles WHERE user_id = ?', [req.user.id]);
  res.json({ success: true, data: { user: req.user, profile } });
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

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
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

module.exports = router;
