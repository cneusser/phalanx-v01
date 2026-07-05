// ─────────────────────────────────────────────────────────────────────────────
// Feedback (Änderungswünsche), Changelog (Versionshistorie) und Suchprofile
// (gespeicherte Suchen der Käufer, Sprint 10).
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const db = require('../db/database');
const wrap = require('../utils/asyncHandler');
const { authenticate, requireRole } = require('../middleware/auth');
const router = express.Router();

const scoped = (req, fn) => (req.tenantId && req.tenantId !== 1) ? db.withTenant(req.tenantId, fn) : fn(db);
const isAdmin = [authenticate, requireRole('super_admin', 'advisor', 'tenant_owner')];

// ── FEEDBACK ────────────────────────────────────────────────────────────────
router.post('/feedback', authenticate, wrap(async (req, res) => {
  const { category, message } = req.body;
  if (!message || message.trim().length < 5) return res.status(400).json({ success: false, error: 'Bitte formulieren Sie Ihre Nachricht (mind. 5 Zeichen).' });
  const cat = ['idea', 'bug', 'change', 'other'].includes(category) ? category : 'idea';
  const id = await scoped(req, (t) => t.insert(
    `INSERT INTO feedback (tenant_id, user_id, role, category, message) VALUES (?, ?, ?, ?, ?)`,
    [req.tenantId || 1, req.user.id, req.user.role, cat, message.trim()]));
  db.auditLog(req.user.id, 'FEEDBACK_SUBMITTED', 'feedback', id, cat, req.ip);
  // Admin benachrichtigen (Branded-Mail)
  const { sendProcessUpdateEmail } = require('../utils/email');
  const catLabel = { idea: 'Idee/Wunsch', bug: 'Fehler', change: 'Änderungswunsch', other: 'Sonstiges' }[cat];
  sendProcessUpdateEmail({
    to: process.env.NOTIFICATION_EMAIL || 'neusser@phalanx.de', firstName: '',
    title: `Neues Feedback (${catLabel}) von ${req.user.first_name} ${req.user.last_name}`,
    message: `<strong>${req.user.first_name} ${req.user.last_name}</strong> (${req.user.email}, ${req.user.role}) hat Feedback gesendet:<br/><br/><span style="display:block;background:#F4F8FC;border-left:3px solid #5B8FC9;padding:10px 14px;color:#333;">${message.trim()}</span>`,
    ctaLabel: 'Im Admin ansehen', ctaPath: '/admin',
  }).catch(() => {});
  res.status(201).json({ success: true, data: { id } });
}));

router.get('/feedback', ...isAdmin, wrap(async (req, res) => {
  const rows = await scoped(req, (t) => t.all(`
    SELECT f.*, u.first_name || ' ' || u.last_name AS user_name, u.email AS user_email
    FROM feedback f LEFT JOIN users u ON u.id = f.user_id ORDER BY f.created_at DESC LIMIT 300`));
  res.json({ success: true, data: rows });
}));

router.put('/feedback/:id/status', ...isAdmin, wrap(async (req, res) => {
  const s = ['open', 'planned', 'done', 'declined'].includes(req.body.status) ? req.body.status : 'open';
  await scoped(req, (t) => t.run(`UPDATE feedback SET status = ? WHERE id = ?`, [s, req.params.id]));
  res.json({ success: true, data: { status: s } });
}));

// ── CHANGELOG ───────────────────────────────────────────────────────────────
router.get('/changelog', authenticate, wrap(async (req, res) => {
  const rows = await scoped(req, (t) => t.all(`SELECT * FROM changelog ORDER BY released_on DESC, id DESC LIMIT 100`));
  res.json({ success: true, data: rows.map(r => ({ ...r, items: safeJson(r.items_json, []) })) });
}));

router.post('/changelog', ...isAdmin, wrap(async (req, res) => {
  const { version, title, items, released_on } = req.body;
  if (!version || !title) return res.status(400).json({ success: false, error: 'Version und Titel erforderlich' });
  const id = await scoped(req, (t) => t.insert(
    `INSERT INTO changelog (tenant_id, version, released_on, title, items_json, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
    [req.tenantId || 1, version, released_on || new Date().toISOString().slice(0, 10), title,
     JSON.stringify(Array.isArray(items) ? items : String(items || '').split('\n').map(s => s.trim()).filter(Boolean)), req.user.id]));
  db.auditLog(req.user.id, 'CHANGELOG_ADDED', 'changelog', id, version, req.ip);
  res.status(201).json({ success: true, data: { id } });
}));

// ── SUCHPROFILE (Käufer) ────────────────────────────────────────────────────
router.get('/search-profiles', authenticate, wrap(async (req, res) => {
  const rows = await scoped(req, (t) => t.all(`SELECT * FROM search_profiles WHERE user_id = ? ORDER BY created_at DESC`, [req.user.id]));
  res.json({ success: true, data: rows.map(r => ({ ...r, criteria: safeJson(r.criteria_json, {}) })) });
}));

router.post('/search-profiles', authenticate, wrap(async (req, res) => {
  const { name, criteria, notify_frequency } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: 'Bitte einen Namen für das Suchprofil angeben.' });
  const freq = ['instant', 'daily', 'weekly', 'off'].includes(notify_frequency) ? notify_frequency : 'instant';
  const id = await scoped(req, (t) => t.insert(
    `INSERT INTO search_profiles (tenant_id, user_id, name, criteria_json, notify_frequency) VALUES (?, ?, ?, ?, ?)`,
    [req.tenantId || 1, req.user.id, String(name).trim(), JSON.stringify(criteria || {}), freq]));
  db.auditLog(req.user.id, 'SEARCH_PROFILE_SAVED', 'search_profile', id, null, req.ip);
  res.status(201).json({ success: true, data: { id } });
}));

router.put('/search-profiles/:id', authenticate, wrap(async (req, res) => {
  const row = await scoped(req, (t) => t.get(`SELECT * FROM search_profiles WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]));
  if (!row) return res.status(404).json({ success: false, error: 'Nicht gefunden' });
  const { name, criteria, notify_frequency } = req.body;
  const freq = ['instant', 'daily', 'weekly', 'off'].includes(notify_frequency) ? notify_frequency : row.notify_frequency;
  await scoped(req, (t) => t.run(
    `UPDATE search_profiles SET name = COALESCE(?, name), criteria_json = COALESCE(?, criteria_json), notify_frequency = ? WHERE id = ?`,
    [name || null, criteria ? JSON.stringify(criteria) : null, freq, req.params.id]));
  res.json({ success: true, data: { message: 'Gespeichert' } });
}));

router.delete('/search-profiles/:id', authenticate, wrap(async (req, res) => {
  await scoped(req, (t) => t.run(`DELETE FROM search_profiles WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]));
  res.json({ success: true, data: { message: 'Gelöscht' } });
}));

// Treffer eines Suchprofils (aktive Mandate, die den Kriterien entsprechen)
router.get('/search-profiles/:id/matches', authenticate, wrap(async (req, res) => {
  const row = await scoped(req, (t) => t.get(`SELECT criteria_json FROM search_profiles WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]));
  if (!row) return res.status(404).json({ success: false, error: 'Nicht gefunden' });
  const c = safeJson(row.criteria_json, {});
  const { sql, params } = matchWhere(c);
  const rows = await scoped(req, (t) => t.all(
    `SELECT id, codename, industry, region, revenue_band, ebitda_band, deal_type, mandate_type, created_at
     FROM projects WHERE status = 'active' ${sql} ORDER BY created_at DESC LIMIT 100`, params));
  res.json({ success: true, data: rows });
}));

// WHERE-Fragment aus Suchkriterien
function matchWhere(c) {
  const sql = []; const params = [];
  if (c.industry) { sql.push('AND industry = ?'); params.push(c.industry); }
  if (c.region) { sql.push('AND region = ?'); params.push(c.region); }
  if (c.deal_type) { sql.push('AND deal_type = ?'); params.push(c.deal_type); }
  if (c.mandate_type) { sql.push('AND mandate_type = ?'); params.push(c.mandate_type); }
  if (c.search) { sql.push('AND (codename ILIKE ? OR short_description ILIKE ?)'); params.push(`%${c.search}%`, `%${c.search}%`); }
  return { sql: sql.join(' '), params };
}

function safeJson(s, def) { try { return JSON.parse(s || ''); } catch { return def; } }

module.exports = router;
module.exports.matchWhere = matchWhere;
