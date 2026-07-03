// CapitalMatch – Projekte-Route — PostgreSQL/Knex
const express = require('express');
const db = require('../db/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const wrap = require('../utils/asyncHandler');
const { getStage } = require('../middleware/gates');
const { stageAllows } = require('../utils/dealStateMachine');
const router = express.Router();

const PUBLIC_FIELDS = 'id, codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights, status, created_at, stage, investment_needed, equity_stake, post_money_valuation, tam_band, sector_emoji, location_city, mandate_type';

// ── GET /stats — Public platform statistics ───────────────────────────────
router.get('/stats', wrap(async (req, res) => {
  const row = await db.get(`
    SELECT
      COUNT(*) FILTER (WHERE status='active' AND mandate_type='ma')::int          AS ma_active,
      COUNT(*) FILTER (WHERE mandate_type='ma')::int                              AS ma_total,
      COUNT(*) FILTER (WHERE status='active' AND mandate_type='fundraising')::int AS fund_active,
      COUNT(*) FILTER (WHERE mandate_type='fundraising')::int                     AS fund_total
    FROM projects
  `);
  const inv = await db.get(`SELECT COUNT(*)::int AS c FROM users WHERE role='buyer' AND is_approved=1 AND is_active=1`);

  res.json({
    success: true,
    data: {
      ma:          { active: row.ma_active,   total: row.ma_total },
      fundraising: { active: row.fund_active, total: row.fund_total },
      investors: inv.c,
      total_active: row.ma_active + row.fund_active,
    },
  });
}));

// ── GET / — Public list (active projects only) ─────────────────────────────
router.get('/', wrap(async (req, res) => {
  const { industry, region, deal_type, search, mandate_type } = req.query;
  let query = `SELECT ${PUBLIC_FIELDS} FROM projects WHERE status = 'active'`;
  const params = [];
  if (industry)     { query += ' AND industry = ?';     params.push(industry); }
  if (region)       { query += ' AND region = ?';       params.push(region); }
  if (deal_type)    { query += ' AND deal_type = ?';    params.push(deal_type); }
  if (mandate_type) { query += ' AND mandate_type = ?'; params.push(mandate_type); }
  if (search) { query += ' AND (codename ILIKE ? OR short_description ILIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  query += ' ORDER BY created_at DESC';

  const projects = (await db.all(query, params)).map(p => ({ ...p, highlights: JSON.parse(p.highlights || '[]') }));
  const industries = (await db.all(`SELECT DISTINCT industry FROM projects WHERE status='active' ORDER BY industry`)).map(r => r.industry);
  const regions    = (await db.all(`SELECT DISTINCT region FROM projects WHERE status='active' ORDER BY region`)).map(r => r.region);
  const deal_types = (await db.all(`SELECT DISTINCT deal_type FROM projects WHERE status='active' ORDER BY deal_type`)).map(r => r.deal_type);
  const stages     = (await db.all(`SELECT DISTINCT stage FROM projects WHERE status='active' AND stage IS NOT NULL ORDER BY stage`)).map(r => r.stage);

  res.json({ success: true, data: { projects, filters: { industries, regions, deal_types, stages } } });
}));

// ── GET /my-projects — Seller's own projects (all statuses) ───────────────
router.get('/my-projects', authenticate, wrap(async (req, res) => {
  if (!['seller', 'super_admin', 'advisor'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Nicht berechtigt' });
  }
  const projects = (await db.all(
    `SELECT ${PUBLIC_FIELDS}, created_by FROM projects WHERE created_by = ? ORDER BY created_at DESC`,
    [req.user.id]
  )).map(p => ({ ...p, highlights: JSON.parse(p.highlights || '[]') }));
  res.json({ success: true, data: projects });
}));

// ── POST /my-project — Seller submits a new project (starts as draft) ─────
router.post('/my-project', authenticate, wrap(async (req, res) => {
  if (!['seller', 'super_admin', 'advisor'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Nur Verkäufer können Projekte einreichen' });
  }
  const { codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights, mandate_type } = req.body;
  if (!codename || !industry || !region || !short_description)
    return res.status(400).json({ success: false, error: 'Pflichtfelder fehlen (Unternehmensname, Branche, Region, Beschreibung)' });

  const existing = await db.get('SELECT id FROM projects WHERE codename = ?', [codename]);
  if (existing) return res.status(409).json({ success: false, error: 'Dieser Unternehmensname ist bereits vergeben' });

  const projectId = await db.insert(
    `INSERT INTO projects (codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights,
       status, mandate_type, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
    [codename, industry, region,
     revenue_band || '—', ebitda_band || '—',
     deal_type || 'Nachfolge', short_description,
     JSON.stringify(highlights || []),
     mandate_type || 'ma',
     req.user.id]
  );

  db.auditLog(req.user.id, 'SELLER_SUBMITTED_PROJECT', 'project', projectId, codename, req.ip);
  console.log(`\n📬 Neues Mandat eingereicht: "${codename}" von User #${req.user.id} — wartet auf Admin-Freigabe`);

  res.status(201).json({ success: true, data: { id: projectId, message: 'Projekt eingereicht. Es wird nach Prüfung veröffentlicht.' } });
}));

// ── GET /:id/teaser — Public teaser ───────────────────────────────────────
router.get('/:id/teaser', wrap(async (req, res) => {
  const project = await db.get(`SELECT ${PUBLIC_FIELDS} FROM projects WHERE id = ? AND status = 'active'`, [req.params.id]);
  if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });
  res.json({ success: true, data: { ...project, highlights: JSON.parse(project.highlights || '[]') } });
}));

// ── GET /:id — Full detail (requires auth + NDA approval) ─────────────────
router.get('/:id', authenticate, wrap(async (req, res) => {
  const project = await db.get(`SELECT ${PUBLIC_FIELDS} FROM projects WHERE id = ? AND status = 'active'`, [req.params.id]);
  if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });

  const isAdmin = ['super_admin', 'advisor'].includes(req.user.role);
  let ndaStatus = null;
  if (!isAdmin) {
    const nda = await db.get(`SELECT status FROM nda_requests WHERE user_id = ? AND project_id = ?`, [req.user.id, project.id]);
    ndaStatus = nda ? nda.status : null;
    // Zustandsautomat: Detaildaten erst ab Gate 'details' (dataroom_granted).
    // Serverseitig erzwungen — nicht über Direkt-URLs/API umgehbar.
    const stage = await getStage(req.user.id, project.id);
    if (!stageAllows(stage, 'details')) {
      db.activityLog(req.user.id, 'ACCESS_DETAILS_DENIED', 'details', project.id, req.ip);
      return res.status(403).json({ success: false, error: 'NDA-Freigabe erforderlich', ndaStatus, projectId: project.id });
    }
    db.activityLog(req.user.id, 'ACCESS_DETAILS', 'details', project.id, req.ip);
  }

  const details   = await db.get('SELECT * FROM project_details WHERE project_id = ?', [project.id]);
  const documents = await db.all(`SELECT id, filename, file_type, file_size, access_level, description, created_at FROM documents WHERE project_id = ? ORDER BY access_level, created_at`, [project.id]);
  db.auditLog(req.user.id, 'VIEW_PROJECT', 'project', project.id, null, req.ip);

  res.json({ success: true, data: { ...project, highlights: JSON.parse(project.highlights || '[]'), details, documents, ndaStatus: isAdmin ? 'admin' : ndaStatus } });
}));

module.exports = router;
