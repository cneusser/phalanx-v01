// CapitalMatch – Admin-Route — PostgreSQL/Knex
const express = require('express');
const db = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');
const wrap = require('../utils/asyncHandler');
const router = express.Router();
const isAdmin = [authenticate, requireRole('super_admin', 'advisor')];

// ── Stats ─────────────────────────────────────────────────────────────────
router.get('/stats', ...isAdmin, wrap(async (req, res) => {
  const p = await db.get(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status='active')::int AS active,
           COUNT(*) FILTER (WHERE status='draft')::int  AS draft
    FROM projects
  `);
  const u = await db.get(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE is_approved = 0)::int AS pending,
           COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS this_week
    FROM users WHERE role NOT IN ('super_admin','advisor')
  `);
  const n = await db.get(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status='requested')::int AS requested,
           COUNT(*) FILTER (WHERE status='signed')::int    AS signed,
           COUNT(*) FILTER (WHERE status='approved')::int  AS approved
    FROM nda_requests
  `);
  res.json({
    success: true,
    data: {
      projects: { total: p.total, active: p.active, draft: p.draft },
      users:    { total: u.total, pending: u.pending, this_week: u.this_week },
      ndas:     { requested: n.requested, signed: n.signed, approved: n.approved, total: n.total },
    },
  });
}));

// ── Projects ──────────────────────────────────────────────────────────────
router.get('/projects', ...isAdmin, wrap(async (req, res) => {
  const projects = (await db.all(`
    SELECT p.*, u.first_name || ' ' || u.last_name as created_by_name,
      (SELECT COUNT(*)::int FROM nda_requests nr WHERE nr.project_id = p.id) as nda_count,
      (SELECT COUNT(*)::int FROM nda_requests nr WHERE nr.project_id = p.id AND nr.status='approved') as approved_count
    FROM projects p LEFT JOIN users u ON u.id = p.created_by ORDER BY p.created_at DESC
  `)).map(p => ({ ...p, highlights: JSON.parse(p.highlights || '[]') }));
  res.json({ success: true, data: projects });
}));

router.post('/projects', ...isAdmin, wrap(async (req, res) => {
  const { codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights, status,
          mandate_type, stage, investment_needed, equity_stake, post_money_valuation, tam_band, sector_emoji, location_city } = req.body;
  if (!codename || !industry || !region || !short_description)
    return res.status(400).json({ success: false, error: 'Pflichtfelder fehlen (codename, industry, region, short_description)' });
  const existing = await db.get('SELECT id FROM projects WHERE codename = ?', [codename]);
  if (existing) return res.status(409).json({ success: false, error: 'Name/Codename bereits vergeben' });

  const projectId = await db.insert(`
    INSERT INTO projects (codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights, status,
      mandate_type, stage, investment_needed, equity_stake, post_money_valuation, tam_band, sector_emoji, location_city,
      created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    codename, industry, region, revenue_band || '—', ebitda_band || '—',
    deal_type || '', short_description, JSON.stringify(highlights || []), status || 'draft',
    mandate_type || 'ma', stage || null, investment_needed || null, equity_stake || null,
    post_money_valuation || null, tam_band || null, sector_emoji || null, location_city || null,
    req.user.id,
  ]);
  db.auditLog(req.user.id, 'CREATE_PROJECT', 'project', projectId, codename, req.ip);
  res.status(201).json({ success: true, data: { id: projectId } });
}));

router.put('/projects/:id', ...isAdmin, wrap(async (req, res) => {
  const { codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights, status,
          mandate_type, stage, investment_needed, equity_stake, post_money_valuation, tam_band, sector_emoji, location_city } = req.body;
  const project = await db.get('SELECT id FROM projects WHERE id = ?', [req.params.id]);
  if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });
  await db.run(`
    UPDATE projects SET
      codename=COALESCE(?,codename), industry=COALESCE(?,industry), region=COALESCE(?,region),
      revenue_band=COALESCE(?,revenue_band), ebitda_band=COALESCE(?,ebitda_band),
      deal_type=COALESCE(?,deal_type), short_description=COALESCE(?,short_description),
      highlights=COALESCE(?,highlights), status=COALESCE(?,status),
      mandate_type=COALESCE(?,mandate_type), stage=COALESCE(?,stage),
      investment_needed=COALESCE(?,investment_needed), equity_stake=COALESCE(?,equity_stake),
      post_money_valuation=COALESCE(?,post_money_valuation), tam_band=COALESCE(?,tam_band),
      sector_emoji=COALESCE(?,sector_emoji), location_city=COALESCE(?,location_city),
      updated_at=now() WHERE id=?
  `, [
    codename||null, industry||null, region||null, revenue_band||null, ebitda_band||null,
    deal_type||null, short_description||null, highlights?JSON.stringify(highlights):null, status||null,
    mandate_type||null, stage||null, investment_needed||null, equity_stake||null,
    post_money_valuation||null, tam_band||null, sector_emoji||null, location_city||null,
    req.params.id,
  ]);
  db.auditLog(req.user.id, 'UPDATE_PROJECT', 'project', req.params.id, null, req.ip);
  res.json({ success: true, data: { message: 'Aktualisiert' } });
}));

// Publish project (set active)
router.put('/projects/:id/publish', ...isAdmin, wrap(async (req, res) => {
  const project = await db.get('SELECT id, codename FROM projects WHERE id = ?', [req.params.id]);
  if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });
  await db.run(`UPDATE projects SET status = 'active', updated_at = now() WHERE id = ?`, [req.params.id]);
  db.auditLog(req.user.id, 'PROJECT_PUBLISHED', 'project', req.params.id, project.codename, req.ip);
  res.json({ success: true, data: { message: 'Projekt veröffentlicht' } });
}));

// Unpublish project (set draft)
router.put('/projects/:id/unpublish', ...isAdmin, wrap(async (req, res) => {
  const project = await db.get('SELECT id, codename FROM projects WHERE id = ?', [req.params.id]);
  if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });
  await db.run(`UPDATE projects SET status = 'draft', updated_at = now() WHERE id = ?`, [req.params.id]);
  db.auditLog(req.user.id, 'PROJECT_UNPUBLISHED', 'project', req.params.id, project.codename, req.ip);
  res.json({ success: true, data: { message: 'Projekt zurückgezogen (Entwurf)' } });
}));

// ── Users ─────────────────────────────────────────────────────────────────
router.get('/users', ...isAdmin, wrap(async (req, res) => {
  const users = await db.all(`
    SELECT u.id, u.email, u.first_name, u.last_name, u.company, u.role, u.buyer_type,
      u.is_active, u.is_approved, u.created_at,
      (SELECT COUNT(*)::int FROM nda_requests nr WHERE nr.user_id = u.id) as nda_count,
      (SELECT COUNT(*)::int FROM nda_requests nr WHERE nr.user_id = u.id AND nr.status='approved') as approved_count
    FROM users u
    WHERE u.role NOT IN ('super_admin', 'advisor')
    ORDER BY u.is_approved ASC, u.created_at DESC
  `);
  res.json({ success: true, data: users });
}));

// Approve user
router.put('/users/:id/approve', ...isAdmin, wrap(async (req, res) => {
  const user = await db.get('SELECT id, email, first_name FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ success: false, error: 'Nutzer nicht gefunden' });
  await db.run('UPDATE users SET is_approved = 1, is_active = 1 WHERE id = ?', [req.params.id]);
  db.auditLog(req.user.id, 'USER_APPROVED', 'user', user.id, user.email, req.ip);
  console.log(`✅ User freigegeben: ${user.first_name} <${user.email}>`);
  res.json({ success: true, data: { message: `${user.first_name} wurde freigegeben` } });
}));

// Deactivate/reject user
router.put('/users/:id/deactivate', ...isAdmin, wrap(async (req, res) => {
  const user = await db.get('SELECT id, email FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ success: false, error: 'Nutzer nicht gefunden' });
  await db.run('UPDATE users SET is_active = 0, is_approved = 0 WHERE id = ?', [req.params.id]);
  db.auditLog(req.user.id, 'USER_DEACTIVATED', 'user', user.id, user.email, req.ip);
  res.json({ success: true, data: { message: 'Nutzer deaktiviert' } });
}));

// ── NDAs ──────────────────────────────────────────────────────────────────
router.get('/ndas', ...isAdmin, wrap(async (req, res) => {
  const ndas = await db.all(`
    SELECT nr.*, u.first_name || ' ' || u.last_name as user_name, u.email as user_email, u.company as user_company,
      p.codename as project_codename, p.industry as project_industry,
      a.first_name || ' ' || a.last_name as approved_by_name
    FROM nda_requests nr
    JOIN users u ON u.id = nr.user_id JOIN projects p ON p.id = nr.project_id
    LEFT JOIN users a ON a.id = nr.approved_by ORDER BY nr.requested_at DESC
  `);
  res.json({ success: true, data: ndas });
}));

router.put('/ndas/:id/approve', ...isAdmin, wrap(async (req, res) => {
  const nda = await db.get('SELECT * FROM nda_requests WHERE id = ?', [req.params.id]);
  if (!nda) return res.status(404).json({ success: false, error: 'NDA nicht gefunden' });
  await db.run(`UPDATE nda_requests SET status='approved', approved_at=now(), approved_by=? WHERE id=?`, [req.user.id, req.params.id]);
  db.auditLog(req.user.id, 'NDA_APPROVED', 'nda_request', nda.id, null, req.ip);
  res.json({ success: true, data: { message: 'NDA freigegeben' } });
}));

router.put('/ndas/:id/reject', ...isAdmin, wrap(async (req, res) => {
  const nda = await db.get('SELECT * FROM nda_requests WHERE id = ?', [req.params.id]);
  if (!nda) return res.status(404).json({ success: false, error: 'NDA nicht gefunden' });
  await db.run(`UPDATE nda_requests SET status='rejected', rejected_at=now() WHERE id=?`, [req.params.id]);
  db.auditLog(req.user.id, 'NDA_REJECTED', 'nda_request', nda.id, null, req.ip);
  res.json({ success: true, data: { message: 'NDA abgelehnt' } });
}));

// ── Activity + Audit ──────────────────────────────────────────────────────
router.get('/activity', ...isAdmin, wrap(async (req, res) => {
  const logs = await db.all(`
    SELECT al.*, u.first_name || ' ' || u.last_name as user_name, u.email as user_email
    FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id ORDER BY al.created_at DESC LIMIT 50
  `);
  res.json({ success: true, data: logs });
}));

router.get('/audit-logs', ...isAdmin, wrap(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;
  const action = req.query.action || null;

  let query = `SELECT al.*, u.email, u.first_name, u.last_name FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id`;
  let countQuery = `SELECT COUNT(*)::int as count FROM audit_logs al`;
  const params = [];

  if (action) {
    query += ` WHERE al.action = ?`;
    countQuery += ` WHERE al.action = ?`;
    params.push(action);
  }

  query += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
  const logs = await db.all(query, [...params, limit, offset]);
  const totalRow = await db.get(countQuery, params);
  const total = totalRow ? totalRow.count : 0;

  res.json({ success: true, data: { logs, total, page, pages: Math.ceil(total / limit) } });
}));

module.exports = router;
