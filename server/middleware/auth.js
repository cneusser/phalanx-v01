const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'phalanx-secret';

const USER_FIELDS = 'id, tenant_id, email, role, first_name, last_name, company, is_active';

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Nicht authentifiziert' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.get(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`, [decoded.userId]);
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, error: 'Benutzer nicht gefunden' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Ungültiges Token' });
  }
}

async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.get(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`, [decoded.userId]);
    if (user && user.is_active) req.user = user;
  } catch (_) {}
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
