// ============================================================
// CapitalMatch – Dokumente-Route (Upload, Download, Delete)
// PostgreSQL/Knex
// ============================================================

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendDownloadNotification } = require('../utils/email');
const wrap = require('../utils/asyncHandler');
const { getStage } = require('../middleware/gates');
const { stageAllows } = require('../utils/dealStateMachine');

// Kategorie eines Dokuments (Fallback über access_level für Altbestände)
function docCategory(doc) {
  if (doc.category) return doc.category;
  return { public: 'teaser', nda: 'im', approved: 'dataroom' }[doc.access_level] || 'im';
}

const router = express.Router();
const isAdmin = [authenticate, requireRole('super_admin', 'advisor')];

// ── Upload-Verzeichnis ──────────────────────────────────────
const UPLOAD_DIR = process.env.UPLOAD_DIR
  || path.join(__dirname, '../../uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Erlaubte Dateitypen ─────────────────────────────────────
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',         // .xlsx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',   // .docx
  'application/msword',
  'image/jpeg', 'image/png', 'image/webp',
]);

const ALLOWED_EXT = new Set([
  '.pdf', '.pptx', '.ppt', '.xlsx', '.xls', '.docx', '.doc',
  '.jpg', '.jpeg', '.png', '.webp',
]);

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    // Unterordner pro Projekt
    const projectId = req.params.projectId || req.body.project_id || 'misc';
    const dir = path.join(UPLOAD_DIR, `project_${projectId}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_\-\.äöüÄÖÜ]/g, '_')
      .substring(0, 60);
    const ts = Date.now();
    cb(null, `${base}_${ts}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_TYPES.has(file.mimetype) || ALLOWED_EXT.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Dateityp nicht erlaubt: ${file.mimetype}`), false);
    }
  },
});

// ── POST /api/documents/:projectId  (Admin only) ───────────
router.post('/:projectId', ...isAdmin, upload.single('file'), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });

  const { projectId } = req.params;
  const project = await db.get('SELECT id FROM projects WHERE id = ?', [projectId]);
  if (!project) {
    // Datei wieder löschen wenn Projekt nicht gefunden
    fs.unlink(req.file.path, () => {});
    return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });
  }

  const { description = '', access_level = 'nda' } = req.body;
  const displayName = req.body.display_name || req.file.originalname;

  const docId = await db.insert(`
    INSERT INTO documents (project_id, filename, file_type, file_size, access_level, description, uploaded_by, file_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    projectId,
    displayName,
    req.file.mimetype,
    req.file.size,
    ['public', 'nda', 'approved'].includes(access_level) ? access_level : 'nda',
    description,
    req.user.id,
    req.file.path,
  ]);

  db.auditLog(req.user.id, 'UPLOAD_DOCUMENT', 'document', docId,
    `${displayName} → Projekt ${projectId}`, req.ip);

  // Berechtigte Interessenten über neue Unterlagen informieren:
  // nur diejenigen, deren Interest-Stage das Kategorie-Gate bereits passiert hat
  {
    const levelToCategory = { public: 'teaser', nda: 'im', approved: 'dataroom' };
    const category = levelToCategory[access_level] || 'im';
    const proj = await db.get('SELECT codename FROM projects WHERE id = ?', [projectId]);
    const interested = await db.all(`
      SELECT u.email, u.first_name, i.stage FROM interests i
      JOIN users u ON u.id = i.buyer_id
      WHERE i.project_id = ? AND i.stage != 'rejected' AND u.is_active = 1
    `, [projectId]);
    const { sendProcessUpdateEmail } = require('../utils/email');
    for (const b of interested.filter(b => stageAllows(b.stage, category))) {
      sendProcessUpdateEmail({
        to: b.email, firstName: b.first_name,
        title: `Neue Unterlagen verfügbar — ${proj ? proj.codename : 'Mandat'}`,
        message: `Für das Mandat <strong>${proj ? proj.codename : ''}</strong> wurden neue Unterlagen bereitgestellt: <strong>${displayName}</strong>.`,
        ctaLabel: 'Unterlagen ansehen', ctaPath: `/projekte/${projectId}`,
      }).catch(() => {});
    }
  }

  res.status(201).json({
    success: true,
    data: {
      id:           docId,
      filename:     displayName,
      file_type:    req.file.mimetype,
      file_size:    req.file.size,
      access_level,
      description,
    },
  });
}));

// ── GET /api/documents/:projectId  (gate-gefiltert je Kategorie) ─
router.get('/:projectId', authenticate, wrap(async (req, res) => {
  const { projectId } = req.params;
  const isAdminUser = ['super_admin', 'advisor'].includes(req.user.role);

  // has_file: Seed-Einträge ohne physische Datei → Download-Button deaktivieren
  const docs = await db.all(`
    SELECT id, filename, file_type, file_size, access_level, category, folder, version, description, created_at,
           (file_path IS NOT NULL)::int AS has_file
    FROM documents WHERE project_id = ? ORDER BY created_at DESC
  `, [projectId]);

  if (isAdminUser) {
    return res.json({ success: true, data: docs });
  }

  // Zustandsautomat: Nutzer sieht nur Dokumente, deren Kategorie-Gate seine
  // Interest-Stage bereits passiert hat (serverseitig, nicht umgehbar).
  const stage = await getStage(req.user.id, projectId);
  const visible = docs.filter(d => stageAllows(stage, docCategory(d)));
  if (visible.length === 0 && docs.length > 0) {
    db.activityLog(req.user.id, 'ACCESS_DOCLIST_DENIED', 'documents', projectId, req.ip);
    return res.status(403).json({ success: false, error: 'NDA-Freigabe erforderlich' });
  }
  db.activityLog(req.user.id, 'ACCESS_DOCLIST', 'documents', projectId, req.ip);
  res.json({ success: true, data: visible });
}));

// ── GET /api/documents/:projectId/:docId/download ──────────
router.get('/:projectId/:docId/download', authenticate, wrap(async (req, res) => {
  const { projectId, docId } = req.params;
  const isAdminUser = ['super_admin', 'advisor'].includes(req.user.role);

  const doc = await db.get('SELECT * FROM documents WHERE id = ? AND project_id = ?', [docId, projectId]);
  if (!doc || !doc.file_path) return res.status(404).json({ success: false, error: 'Dokument nicht gefunden' });

  // Zugangskontrolle über den Zustandsautomaten: Kategorie-Gate muss
  // von der Interest-Stage des Nutzers passiert sein (teaser → Login genügt,
  // im → nda_signed, dataroom → dataroom_granted). Serverseitig erzwungen.
  if (!isAdminUser) {
    const stage = await getStage(req.user.id, projectId);
    const category = docCategory(doc);
    if (!stageAllows(stage, category)) {
      db.activityLog(req.user.id, 'DOWNLOAD_DENIED', category, docId, req.ip);
      return res.status(403).json({
        success: false,
        error: category === 'dataroom' ? 'Freigabe erforderlich' : 'NDA erforderlich',
      });
    }
  }
  db.activityLog(req.user.id, 'DOWNLOAD_DOCUMENT', docCategory(doc), docId, req.ip);

  if (!fs.existsSync(doc.file_path))
    return res.status(404).json({ success: false, error: 'Datei nicht gefunden' });

  db.auditLog(req.user.id, 'DOWNLOAD_DOCUMENT', 'document', docId,
    `${doc.filename} von Projekt ${projectId}`, req.ip);

  // ── Admin-Benachrichtigung per E-Mail ──────────────────────
  // Projektnamen nachladen (für leserliche E-Mail)
  const project = await db.get('SELECT codename FROM projects WHERE id = ?', [projectId]);
  sendDownloadNotification({
    documentName: doc.filename,
    projectName:  project ? project.codename : `Projekt ${projectId}`,
    accessLevel:  doc.access_level,
    user: {
      first_name: req.user.first_name,
      last_name:  req.user.last_name,
      email:      req.user.email,
      company:    req.user.company,
    },
    ip: req.ip,
    timestamp: new Date(),
  }).catch(err => console.error('Notification error:', err));

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.filename)}"`);
  res.setHeader('Content-Type', doc.file_type || 'application/octet-stream');
  res.sendFile(path.resolve(doc.file_path));
}));

// ── DELETE /api/documents/:projectId/:docId  (Admin only) ──
router.delete('/:projectId/:docId', ...isAdmin, wrap(async (req, res) => {
  const { projectId, docId } = req.params;
  const doc = await db.get('SELECT * FROM documents WHERE id = ? AND project_id = ?', [docId, projectId]);
  if (!doc) return res.status(404).json({ success: false, error: 'Dokument nicht gefunden' });

  // Datei löschen
  if (doc.file_path && fs.existsSync(doc.file_path)) {
    fs.unlink(doc.file_path, err => { if (err) console.error('File delete error:', err); });
  }

  await db.run('DELETE FROM documents WHERE id = ?', [docId]);
  db.auditLog(req.user.id, 'DELETE_DOCUMENT', 'document', docId, doc.filename, req.ip);

  res.json({ success: true, data: { message: 'Dokument gelöscht' } });
}));

module.exports = router;
