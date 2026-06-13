const express = require('express');
const db = require('../db/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const router = express.Router();

const PUBLIC_FIELDS = 'id, codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights, status, created_at, stage, investment_needed, equity_stake, post_money_valuation, tam_band, sector_emoji, location_city, mandate_type';

router.get('/', (req, res) => {
  const { industry, region, deal_type, search, mandate_type } = req.query;
  let query = `SELECT ${PUBLIC_FIELDS} FROM projects WHERE status = 'active'`;
  const params = [];
  if (industry) { query += ' AND industry = ?'; params.push(industry); }
  if (region) { query += ' AND region = ?'; params.push(region); }
  if (deal_type) { query += ' AND deal_type = ?'; params.push(deal_type); }
  if (mandate_type) { query += ' AND mandate_type = ?'; params.push(mandate_type); }
  if (search) { query += ' AND (codename LIKE ? OR short_description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  query += ' ORDER BY created_at DESC';

  const projects = db.prepare(query).all(...params).map(p => ({ ...p, highlights: JSON.parse(p.highlights || '[]') }));
  const industries = db.prepare(`SELECT DISTINCT industry FROM projects WHERE status='active' ORDER BY industry`).all().map(r => r.industry);
  const regions = db.prepare(`SELECT DISTINCT region FROM projects WHERE status='active' ORDER BY region`).all().map(r => r.region);
  const deal_types = db.prepare(`SELECT DISTINCT deal_type FROM projects WHERE status='active' ORDER BY deal_type`).all().map(r => r.deal_type);
  const stages = db.prepare(`SELECT DISTINCT stage FROM projects WHERE status='active' AND stage IS NOT NULL ORDER BY stage`).all().map(r => r.stage);

  res.json({ success: true, data: { projects, filters: { industries, regions, deal_types, stages } } });
});

router.get('/:id/teaser', (req, res) => {
  const project = db.prepare(`SELECT ${PUBLIC_FIELDS} FROM projects WHERE id = ? AND status = 'active'`).get(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });
  res.json({ success: true, data: { ...project, highlights: JSON.parse(project.highlights || '[]') } });
});

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

  const details = db.prepare('SELECT * FROM project_details WHERE project_id = ?').get(project.id);
  const documents = db.prepare(`SELECT id, filename, file_type, file_size, access_level, description, created_at FROM documents WHERE project_id = ? ORDER BY access_level, created_at`).all(project.id);
  db.auditLog(req.user.id, 'VIEW_PROJECT', 'project', project.id, null, req.ip);

  res.json({ success: true, data: { ...project, highlights: JSON.parse(project.highlights || '[]'), details, documents, ndaStatus: isAdmin ? 'admin' : ndaStatus } });
});

module.exports = router;
