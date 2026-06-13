// CapitalMatch – Projekte-Route
const express = require('express');
const db = require('../db/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const router = express.Router();

const PUBLIC_FIELDS = 'id, codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights, status, created_at, stage, investment_needed, equity_stake, post_money_valuation, tam_band, sector_emoji, location_city, mandate_type';

// ── GET /stats — Public platform statistics ───────────────────────────────
router.get('/stats', (req, res) => {
  const maActive    = db.prepare(`SELECT COUNT(*) as c FROM projects WHERE status='active' AND mandate_type='ma'`).get().c;
  const maTotal     = db.prepare(`SELECT COUNT(*) as c FROM projects WHERE mandate_type='ma'`).get().c;
  const fundActive  = db.prepare(`SELECT COUNT(*) as c FROM projects WHERE status='active' AND mandate_type='fundraising'`).get().c;
  const fundTotal   = db.prepare(`SELECT COUNT(*) as c FROM projects WHERE mandate_type='fundraising'`).get().c;
  const investors   = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role='buyer' AND is_approved=1 AND is_active=1`).get().c;

  res.json({
    success: true,
    data: {
      ma:          { active: maActive,   total: maTotal },
      fundraising: { active: fundActive, total: fundTotal },
      investors,
      total_active: maActive + fundActive,
    },
  });
});

// ── GET / — Public list (active projects only) ─────────────────────────────
router.get('/', (req, res) => {
  const { industry, region, deal_type, search, mandate_type } = req.query;
  let query = `SELECT ${PUBLIC_FIELDS} FROM projects WHERE status = 'active'`;
  const params = [];
  if (industry)     { query += ' AND industry = ?';     params.push(industry); }
  if (region)       { query += ' AND region = ?';       params.push(region); }
  if (deal_type)    { query += ' AND deal_type = ?';    params.push(deal_type); }
  if (mandate_type) { query += ' AND mandate_type = ?'; params.push(mandate_type); }
  if (search) { query += ' AND (codename LIKE ? OR short_description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  query += ' ORDER BY created_at DESC';

  const projects = db.prepare(query).all(...params).map(p => ({ ...p, highlights: JSON.parse(p.highlights || '[]') }));
  const industries = db.prepare(`SELECT DISTINCT industry FROM projects WHERE status='active' ORDER BY industry`).all().map(r => r.industry);
  const regions    = db.prepare(`SELECT DISTINCT region FROM projects WHERE status='active' ORDER BY region`).all().map(r => r.region);
  const deal_types = db.prepare(`SELECT DISTINCT deal_type FROM projects WHERE status='active' ORDER BY deal_type`).all().map(r => r.deal_type);
  const stages     = db.prepare(`SELECT DISTINCT stage FROM projects WHERE status='active' AND stage IS NOT NULL ORDER BY stage`).all().map(r => r.stage);

  res.json({ success: true, data: { projects, filters: { industries, regions, deal_types, stages } } });
});

// ── GET /my-projects — Seller's own projects (all statuses) ───────────────
router.get('/my-projects', authenticate, (req, res) => {
  if (!['seller', 'super_admin', 'advisor'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Nicht berechtigt' });
  }
  const projects = db.prepare(
    `SELECT ${PUBLIC_FIELDS}, created_by FROM projects WHERE created_by = ? ORDER BY created_at DESC`
  ).all(req.user.id).map(p => ({ ...p, highlights: JSON.parse(p.highlights || '[]') }));
  res.json({ success: true, data: projects });
});

// ── POST /my-project — Seller submits a new project (starts as draft) ─────
router.post('/my-project', authenticate, (req, res) => {
  if (!['seller', 'super_admin', 'advisor'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Nur Verkäufer können Projekte einreichen' });
  }
  const { codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights, mandate_type } = req.body;
  if (!codename || !industry || !region || !short_description)
    return res.status(400).json({ success: false, error: 'Pflichtfelder fehlen (Unternehmensname, Branche, Region, Beschreibung)' });

  const existing = db.prepare('SELECT id FROM projects WHERE codename = ?').get(codename);
  if (existing) return res.status(409).json({ success: false, error: 'Dieser Unternehmensname ist bereits vergeben' });

  const result = db.prepare(`
    INSERT INTO projects (codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights,
      status, mandate_type, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, datetime('now'))
  `).run(
    codename, industry, region,
    revenue_band || '—', ebitda_band || '—',
    deal_type || 'Nachfolge', short_description,
    JSON.stringify(highlights || []),
    mandate_type || 'ma',
    req.user.id
  );

  db.auditLog(req.user.id, 'SELLER_SUBMITTED_PROJECT', 'project', result.lastInsertRowid, codename, req.ip);
  console.log(`\n📬 Neues Mandat eingereicht: "${codename}" von User #${req.user.id} — wartet auf Admin-Freigabe`);

  res.status(201).json({ success: true, data: { id: result.lastInsertRowid, message: 'Projekt eingereicht. Es wird nach Prüfung veröffentlicht.' } });
});

// ── GET /:id/teaser — Public teaser ───────────────────────────────────────
router.get('/:id/teaser', (req, res) => {
  const project = db.prepare(`SELECT ${PUBLIC_FIELDS} FROM projects WHERE id = ? AND status = 'active'`).get(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });
  res.json({ success: true, data: { ...project, highlights: JSON.parse(project.highlights || '[]') } });
});

// ── GET /:id — Full detail (requires auth + NDA approval) ─────────────────
router.get('/:id', authenticate, (req, res) => {
  const project = db.prepare(`SELECT ${PUBLIC_FIELDS} FROM projects WHERE id = ? AND status = 'active'`).get(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });

  const isAdmin = ['super_admin', 'advisor'].includes(req.user.role);
  let ndaStatus = null;
  if (!isAdmin) {
    const nda = db.prepare(`SELECT status FROM nda_requests WHERE user_id = ? AND project_id = ?`).get(req.user.id, project.id);
    ndaStatus = nda ? nda.status : null;
    if (ndaStatus !== 'approved') {
      return res.status(403).json({ success: false, error: 'NDA-Freigabe erforderlich', ndaStatus, projectId: project.id });
    }
  }

  const details   = db.prepare('SELECT * FROM project_details WHERE project_id = ?').get(project.id);
  const documents = db.prepare(`SELECT id, filename, file_type, file_size, access_level, description, created_at FROM documents WHERE project_id = ? ORDER BY access_level, created_at`).all(project.id);
  db.auditLog(req.user.id, 'VIEW_PROJECT', 'project', project.id, null, req.ip);

  res.json({ success: true, data: { ...project, highlights: JSON.parse(project.highlights || '[]'), details, documents, ndaStatus: isAdmin ? 'admin' : ndaStatus } });
});

module.exports = router;
