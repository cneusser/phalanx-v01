const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'phalanx-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

router.post('/register', (req, res) => {
  const { email, password, first_name, last_name, company, position, buyer_type, phone } = req.body;
  if (!email || !password || !first_name || !last_name)
    return res.status(400).json({ success: false, error: 'Pflichtfelder fehlen' });
  if (password.length < 8)
    return res.status(400).json({ success: false, error: 'Passwort muss mindestens 8 Zeichen haben' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ success: false, error: 'E-Mail bereits registriert' });

  const password_hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    `INSERT INTO users (email, password_hash, role, first_name, last_name, company, position, buyer_type, phone, created_at) VALUES (?, ?, 'buyer', ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(email.toLowerCase(), password_hash, first_name, last_name, company||null, position||null, buyer_type||null, phone||null);

  const userId = result.lastInsertRowid;
  db.prepare(`INSERT INTO buyer_profiles (user_id, industries, regions, deal_types) VALUES (?, '[]', '[]', '[]')`).run(userId);
  db.auditLog(userId, 'REGISTER', 'user', userId, null, req.ip);

  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const user = db.prepare('SELECT id, email, role, first_name, last_name, company FROM users WHERE id = ?').get(userId);
  res.status(201).json({ success: true, data: { token, user } });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, error: 'E-Mail und Passwort erforderlich' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !user.is_active) return res.status(401).json({ success: false, error: 'Ungültige Anmeldedaten' });

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    db.auditLog(user.id, 'LOGIN_FAILED', 'user', user.id, null, req.ip);
    return res.status(401).json({ success: false, error: 'Ungültige Anmeldedaten' });
  }

  db.auditLog(user.id, 'LOGIN', 'user', user.id, null, req.ip);
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const { password_hash, ...safeUser } = user;
  res.json({ success: true, data: { token, user: safeUser } });
});

router.get('/me', authenticate, (req, res) => {
  const profile = db.prepare('SELECT * FROM buyer_profiles WHERE user_id = ?').get(req.user.id);
  res.json({ success: true, data: { user: req.user, profile } });
});

module.exports = router;
