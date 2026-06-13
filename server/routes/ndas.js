const express = require('express');
const path = require('path');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { generateNDA, saveNDA, NDA_DIR } = require('../utils/ndaGenerator');
const router = express.Router();

// ─── NDA anfordern ───────────────────────────────────────────────────────────
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

// ─── Meine NDAs ──────────────────────────────────────────────────────────────
router.get('/', authenticate, (req, res) => {
  const ndas = db.prepare(`
    SELECT nr.*, p.codename, p.industry, p.region, p.deal_type
    FROM nda_requests nr JOIN projects p ON p.id = nr.project_id
    WHERE nr.user_id = ? ORDER BY nr.requested_at DESC
  `).all(req.user.id);
  res.json({ success: true, data: ndas });
});

// ─── NDA Status ──────────────────────────────────────────────────────────────
router.get('/:projectId/status', authenticate, (req, res) => {
  const nda = db.prepare('SELECT * FROM nda_requests WHERE user_id = ? AND project_id = ?').get(req.user.id, req.params.projectId);
  res.json({ success: true, data: nda || { status: null } });
});

// ─── NDA Dokument als PDF abrufen (Preview zum Lesen) ────────────────────────
router.get('/:projectId/document', authenticate, async (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
    if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const nda = db.prepare('SELECT * FROM nda_requests WHERE user_id = ? AND project_id = ?').get(req.user.id, req.params.projectId);

    const buyerData = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      company: user.company || '',
      position: user.position || '',
      email: user.email,
      address: '',
      city: '',
      country: 'Deutschland',
    };

    // If already signed, include signature info
    const signature = (nda && nda.online_consent_at) ? {
      name: nda.consent_name || `${user.first_name} ${user.last_name}`,
      company: user.company || '',
      date: nda.online_consent_at,
      ip: nda.consent_ip || null,
    } : null;

    const pdfBuffer = await generateNDA({
      buyer: buyerData,
      project: { codename: project.codename, industry: project.industry, region: project.region },
      signature,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="NDA_${project.codename}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (e) {
    console.error('PDF generation error:', e);
    res.status(500).json({ success: false, error: 'PDF-Generierung fehlgeschlagen: ' + e.message });
  }
});

// ─── NDA Online unterzeichnen (§10) ──────────────────────────────────────────
router.post('/:projectId/sign-online', authenticate, async (req, res) => {
  const { consent_name, consent_confirmed } = req.body;
  if (!consent_confirmed) return res.status(400).json({ success: false, error: 'Bestätigung erforderlich' });
  if (!consent_name || consent_name.trim().length < 3) return res.status(400).json({ success: false, error: 'Name muss mindestens 3 Zeichen haben' });

  const nda = db.prepare('SELECT * FROM nda_requests WHERE user_id = ? AND project_id = ?').get(req.user.id, req.params.projectId);
  if (!nda) return res.status(404).json({ success: false, error: 'NDA nicht gefunden' });
  if (!['requested', 'sent'].includes(nda.status)) {
    return res.status(400).json({ success: false, error: `NDA hat bereits den Status: ${nda.status}` });
  }

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  const consentIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = new Date().toISOString();

  try {
    // Generate signed PDF and save it
    const pdfFilename = await saveNDA({
      buyer: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        company: user.company || '',
        position: user.position || '',
        email: user.email,
        address: '',
        city: '',
        country: 'Deutschland',
      },
      project: { codename: project.codename, industry: project.industry, region: project.region },
      signature: {
        name: consent_name.trim(),
        company: user.company || '',
        date: now,
        ip: consentIp,
      },
    });

    // Update DB
    db.prepare(`
      UPDATE nda_requests
      SET status='signed',
          signed_at=datetime('now'),
          online_consent_at=?,
          consent_name=?,
          consent_ip=?,
          signed_pdf_path=?
      WHERE user_id=? AND project_id=?
    `).run(now, consent_name.trim(), consentIp, pdfFilename, req.user.id, req.params.projectId);

    db.auditLog(req.user.id, 'NDA_SIGNED_ONLINE', 'nda_request', nda.id,
      `Online §10: ${consent_name.trim()} | IP: ${consentIp} | PDF: ${pdfFilename}`, consentIp);

    console.log(`[EMAIL MOCK] NDA für ${project.codename} online unterzeichnet von ${user.email} (${consent_name.trim()})`);

    res.json({ success: true, data: { status: 'signed', pdf_filename: pdfFilename } });
  } catch (e) {
    console.error('Sign error:', e);
    res.status(500).json({ success: false, error: 'Fehler beim Unterzeichnen: ' + e.message });
  }
});

// ─── Buyer: NDA Unterschrift simulieren (status: sent → signed) [Legacy] ─────
router.put('/:projectId/sign', authenticate, (req, res) => {
  const nda = db.prepare('SELECT * FROM nda_requests WHERE user_id = ? AND project_id = ?').get(req.user.id, req.params.projectId);
  if (!nda) return res.status(404).json({ success: false, error: 'NDA nicht gefunden' });
  if (nda.status !== 'sent') return res.status(400).json({ success: false, error: 'NDA muss den Status "versendet" haben um unterzeichnet werden zu können' });
  db.prepare(`UPDATE nda_requests SET status='signed', signed_at=datetime('now') WHERE user_id=? AND project_id=?`).run(req.user.id, req.params.projectId);
  db.auditLog(req.user.id, 'NDA_SIGNED', 'nda_request', nda.id, null, req.ip);
  res.json({ success: true, data: { status: 'signed' } });
});

// ─── Admin: NDA als "Versendet" markieren (requested → sent) ─────────────────
router.put('/:projectId/send', authenticate, (req, res) => {
  const { user_id } = req.body;
  if (!['super_admin', 'advisor'].includes(req.user.role)) return res.status(403).json({ success: false, error: 'Keine Berechtigung' });
  const targetUserId = user_id || req.user.id;
  const nda = db.prepare('SELECT * FROM nda_requests WHERE user_id = ? AND project_id = ?').get(targetUserId, req.params.projectId);
  if (!nda) return res.status(404).json({ success: false, error: 'NDA nicht gefunden' });
  if (nda.status !== 'requested') return res.status(400).json({ success: false, error: 'NDA muss den Status "angefordert" haben' });
  db.prepare(`UPDATE nda_requests SET status='sent', sent_at=datetime('now') WHERE user_id=? AND project_id=?`).run(targetUserId, req.params.projectId);
  db.auditLog(req.user.id, 'NDA_SENT', 'nda_request', nda.id, null, req.ip);
  res.json({ success: true, data: { status: 'sent' } });
});

// ─── Signed NDA PDF herunterladen ─────────────────────────────────────────────
router.get('/:projectId/download', authenticate, (req, res) => {
  // Admins can pass ?user_id=X
  const targetUserId = (req.query.user_id && ['super_admin', 'advisor'].includes(req.user.role))
    ? parseInt(req.query.user_id)
    : req.user.id;

  const nda = db.prepare('SELECT * FROM nda_requests WHERE user_id = ? AND project_id = ?').get(targetUserId, req.params.projectId);
  if (!nda || !nda.signed_pdf_path) {
    return res.status(404).json({ success: false, error: 'Kein unterzeichnetes NDA-Dokument verfügbar' });
  }

  const filePath = path.join(NDA_DIR, nda.signed_pdf_path);
  if (!require('fs').existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'PDF-Datei nicht gefunden' });
  }

  res.download(filePath, nda.signed_pdf_path);
});

module.exports = router;
