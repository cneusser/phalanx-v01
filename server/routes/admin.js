const express = require('express');
const db = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');
const router = express.Router();
const isAdmin = [authenticate, requireRole('super_admin', 'advisor')];

router.get('/stats', ...isAdmin, (req, res) => {
  const stats = {
    projects: {
      total: db.prepare(`SELECT COUNT(*) as c FROM projects`).get().c,
      active: db.prepare(`SELECT COUNT(*) as c FROM projects WHERE status='active'`).get().c,
      draft: db.prepare(`SELECT COUNT(*) as c FROM projects WHERE status='draft'`).get().c,
    },
    users: {
      total: db.prepare(`SELECT COUNT(*) as c FROM users WHERE role='buyer'`).get().c,
      this_week: db.prepare(`SELECT COUNT(*) as c FROM users WHERE role='buyer' AND created_at >= datetime('now','-7 days')`).get().c,
    },
    ndas: {
      requested: db.prepare(`SELECT COUNT(*) as c FROM nda_requests WHERE status='requested'`).get().c,
      signed: db.prepare(`SELECT COUNT(*) as c FROM nda_requests WHERE status='signed'`).get().c,
      approved: db.prepare(`SELECT COUNT(*) as c FROM nda_requests WHERE status='approved'`).get().c,
      total: db.prepare(`SELECT COUNT(*) as c FROM nda_requests`).get().c,
    }
  };
  res.json({ success: true, data: stats });
});

router.get('/projects', ...isAdmin, (req, res) => {
  const projects = db.prepare(`
    SELECT p.*, u.first_name || ' ' || u.last_name as created_by_name,
      (SELECT COUNT(*) FROM nda_requests nr WHERE nr.project_id = p.id) as nda_count,
      (SELECT COUNT(*) FROM nda_requests nr WHERE nr.project_id = p.id AND nr.status='approved') as approved_count
    FROM projects p LEFT JOIN users u ON u.id = p.created_by ORDER BY p.created_at DESC
  `).all().map(p => ({ ...p, highlights: JSON.parse(p.highlights || '[]') }));
  res.json({ success: true, data: projects });
});

router.post('/projects', ...isAdmin, (req, res) => {
  const { codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights, status } = req.body;
  if (!codename || !industry || !region || !revenue_band || !ebitda_band || !deal_type || !short_description)
    return res.status(400).json({ success: false, error: 'Pflichtfelder fehlen' });
  const existing = db.prepare('SELECT id FROM projects WHERE codename = ?').get(codename);
  if (existing) return res.status(409).json({ success: false, error: 'Codename bereits vergeben' });

  const result = db.prepare(`INSERT INTO projects (codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`)
    .run(codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, JSON.stringify(highlights || []), status || 'draft', req.user.id);
  db.auditLog(req.user.id, 'CREATE_PROJECT', 'project', result.lastInsertRowid, codename, req.ip);
  res.status(201).json({ success: true, data: { id: result.lastInsertRowid } });
});

router.put('/projects/:id', ...isAdmin, (req, res) => {
  const { codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights, status } = req.body;
  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });
  db.prepare(`UPDATE projects SET codename=COALESCE(?,codename), industry=COALESCE(?,industry), region=COALESCE(?,region), revenue_band=COALESCE(?,revenue_band), ebitda_band=COALESCE(?,ebitda_band), deal_type=COALESCE(?,deal_type), short_description=COALESCE(?,short_description), highlights=COALESCE(?,highlights), status=COALESCE(?,status), updated_at=datetime('now') WHERE id=?`)
    .run(codename||null, industry||null, region||null, revenue_band||null, ebitda_band||null, deal_type||null, short_description||null, highlights?JSON.stringify(highlights):null, status||null, req.params.id);
  db.auditLog(req.user.id, 'UPDATE_PROJECT', 'project', req.params.id, null, req.ip);
  res.json({ success: true, data: { message: 'Aktualisiert' } });
});

router.get('/users', ...isAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.email, u.first_name, u.last_name, u.company, u.buyer_type, u.is_active, u.created_at,
      (SELECT COUNT(*) FROM nda_requests nr WHERE nr.user_id = u.id) as nda_count,
      (SELECT COUNT(*) FROM nda_requests nr WHERE nr.user_id = u.id AND nr.status='approved') as approved_count
    FROM users u WHERE u.role = 'buyer' ORDER BY u.created_at DESC
  `).all();
  res.json({ success: true, data: users });
});

router.get('/ndas', ...isAdmin, (req, res) => {
  const ndas = db.prepare(`
    SELECT nr.*, u.first_name || ' ' || u.last_name as user_name, u.email as user_email, u.company as user_company,
      p.codename as project_codename, p.industry as project_industry,
      a.first_name || ' ' || a.last_name as approved_by_name
    FROM nda_requests nr
    JOIN users u ON u.id = nr.user_id JOIN projects p ON p.id = nr.project_id
    LEFT JOIN users a ON a.id = nr.approved_by ORDER BY nr.requested_at DESC
  `).all();
  res.json({ success: true, data: ndas });
});

router.put('/ndas/:id/approve', ...isAdmin, (req, res) => {
  const nda = db.prepare('SELECT * FROM nda_requests WHERE id = ?').get(req.params.id);
  if (!nda) return res.status(404).json({ success: false, error: 'NDA nicht gefunden' });
  db.prepare(`UPDATE nda_requests SET status='approved', approved_at=datetime('now'), approved_by=? WHERE id=?`).run(req.user.id, req.params.id);
  db.auditLog(req.user.id, 'NDA_APPROVED', 'nda_request', nda.id, null, req.ip);
  res.json({ success: true, data: { message: 'NDA freigegeben' } });
});

router.put('/ndas/:id/reject', ...isAdmin, (req, res) => {
  const nda = db.prepare('SELECT * FROM nda_requests WHERE id = ?').get(req.params.id);
  if (!nda) return res.status(404).json({ success: false, error: 'NDA nicht gefunden' });
  db.prepare(`UPDATE nda_requests SET status='rejected' WHERE id=?`).run(req.params.id);
  db.auditLog(req.user.id, 'NDA_REJECTED', 'nda_request', nda.id, null, req.ip);
  res.json({ success: true, data: { message: 'NDA abgelehnt' } });
});

router.get('/activity', ...isAdmin, (req, res) => {
  const logs = db.prepare(`
    SELECT al.*, u.first_name || ' ' || u.last_name as user_name, u.email as user_email
    FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id ORDER BY al.created_at DESC LIMIT 50
  `).all();
  res.json({ success: true, data: logs });
});

module.exports = router;
