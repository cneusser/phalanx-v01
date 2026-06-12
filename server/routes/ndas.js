const express = require('express');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.post('/', authenticate, (req, res) => {
  const { project_id } = req.body;
  if (!project_id) return res.status(400).json({ success: false, error: 'project_id fehlt' });
  const project = db.prepare(`SELECT id, codename FROM projects WHERE id = ? AND status = 'active'`).get(project_id);
  if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });
  const existing = db.prepare('SELECT * FROM nda_requests WHERE user_id = ? AND project_id = ?').get(req.user.id, project_id);
  if (existing) return res.status(409).json({ success: false, error: 'NDA bereits angefordert', data: { status: existing.status } });

  const result = db.prepare(`INSERT INTO nda_requests (user_id, project_id, status, requested_at) VALUES (?, ?, 'requested', datetime('now'))`).run(req.user.id, project_id);
  db.auditLog(req.user.id, 'NDA_REQUESTED', 'nda_request', result.lastInsertRowid, `Projekt: ${project.codename}`, req.ip);
  console.log(`[EMAIL MOCK] NDA-Anfrage für ${project.codename} von ${req.user.email}`);
  res.status(201).json({ success: true, data: { id: result.lastInsertRowid, status: 'requested' } });
});

router.get('/', authenticate, (req, res) => {
  const ndas = db.prepare(`
    SELECT nr.*, p.codename, p.industry, p.region, p.deal_type
    FROM nda_requests nr JOIN projects p ON p.id = nr.project_id
    WHERE nr.user_id = ? ORDER BY nr.requested_at DESC
  `).all(req.user.id);
  res.json({ success: true, data: ndas });
});

router.get('/:projectId/status', authenticate, (req, res) => {
  const nda = db.prepare('SELECT * FROM nda_requests WHERE user_id = ? AND project_id = ?').get(req.user.id, req.params.projectId);
  res.json({ success: true, data: nda || { status: null } });
});

module.exports = router;
