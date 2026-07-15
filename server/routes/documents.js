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
const { getStage, hasPermission } = require('../middleware/gates');
const { stageAllows } = require('../utils/dealStateMachine');
const { addWatermark } = require('../utils/watermark');
const { createDownloadToken, verifyDownloadToken, DEFAULT_TTL_MS } = require('../utils/signedLinks');

// Kategorie eines Dokuments (Fallback über access_level für Altbestände)
function docCategory(doc) {
  if (doc.category) return doc.category;
  return { public: 'teaser', nda: 'im', approved: 'dataroom' }[doc.access_level] || 'im';
}

// ── Zentrale Zugriffs-Prüfung für einen Dokument-Download ───────────────────
// Zustandsautomat (Stage-Gate) + granulare Datenraum-Rechte (Sprint 4)
async function checkDownloadAccess(user, doc, projectId) {
  const isAdminUser = ['super_admin', 'advisor'].includes(user.role);
  if (isAdminUser) return { ok: true };
  const category = docCategory(doc);
  const stage = await getStage(user.id, projectId);
  if (!stageAllows(stage, category)) {
    return { ok: false, error: category === 'dataroom' ? 'Freigabe erforderlich' : 'NDA erforderlich' };
  }
  if (category === 'dataroom' && !(await hasPermission(user, projectId, 'download'))) {
    return { ok: false, error: 'Kein Download-Recht für den Datenraum, bitte an den Berater wenden' };
  }
  return { ok: true };
}

// ── Datei ausliefern: PDFs aus IM/Datenraum mit dynamischem Wasserzeichen ──
async function streamDocument(res, doc, user, projectId, via) {
  const category = docCategory(doc);
  db.activityLog(user.id, via === 'signed' ? 'DOWNLOAD_SIGNED_LINK' : 'DOWNLOAD_DOCUMENT', category, doc.id, null);

  const isPdf = (doc.file_type || '').includes('pdf') || String(doc.filename).toLowerCase().endsWith('.pdf');
  const needsWatermark = ['im', 'dataroom'].includes(category) && isPdf;

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.filename)}"`);
  res.setHeader('Content-Type', doc.file_type || 'application/octet-stream');

  if (needsWatermark) {
    try {
      const stamped = await addWatermark(fs.readFileSync(doc.file_path), {
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
      });
      return res.send(stamped);
    } catch (e) {
      console.warn('Wasserzeichen fehlgeschlagen, liefere Original:', e.message);
    }
  }
  res.sendFile(path.resolve(doc.file_path));
}

const router = express.Router();
const isAdmin = [authenticate, requireRole('super_admin', 'advisor')];

// ── Upload-Verzeichnis (persistent: Railway-Volume bevorzugt) ──────────────
const UPLOAD_DIR = process.env.UPLOAD_DIR
  || (process.env.RAILWAY_VOLUME_MOUNT_PATH
        ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads')
        : path.join(__dirname, '../../uploads'));

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
      SELECT u.email, u.first_name, u.last_name, i.stage FROM interests i
      JOIN users u ON u.id = i.buyer_id
      WHERE i.project_id = ? AND i.stage != 'rejected' AND u.is_active = 1
    `, [projectId]);
    const { sendProcessUpdateEmail } = require('../utils/email');
    for (const b of interested.filter(b => stageAllows(b.stage, category))) {
      sendProcessUpdateEmail({
        to: b.email, firstName: b.first_name, person: b,
        title: `Neue Unterlagen verfügbar: ${proj ? proj.codename : 'Mandat'}`,
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

// ── GET /api/documents/signed/:token: Download via signiertem Link ────────
// Keine Bearer-Auth nötig: die HMAC-Signatur MIT Ablaufzeit ist die
// Autorisierung. Zugriffsrechte werden trotzdem erneut serverseitig geprüft.
router.get('/signed/:token', wrap(async (req, res) => {
  const parsed = verifyDownloadToken(req.params.token);
  if (!parsed) return res.status(403).json({ success: false, error: 'Link ungültig oder abgelaufen, bitte neuen Download-Link anfordern' });

  const user = await db.get('SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = ?', [parsed.userId]);
  const doc = await db.get('SELECT * FROM documents WHERE id = ?', [parsed.docId]);
  if (!user || !user.is_active || !doc || !doc.file_path || !fs.existsSync(doc.file_path)) {
    return res.status(404).json({ success: false, error: 'Dokument nicht gefunden' });
  }
  const access = await checkDownloadAccess(user, doc, doc.project_id);
  if (!access.ok) return res.status(403).json({ success: false, error: access.error });

  await streamDocument(res, doc, user, doc.project_id, 'signed');
}));

// ── POST /api/documents/:projectId/:docId/link, signierten Link erzeugen ──
// Ablaufender Download-Link (Standard 15 Min.), z. B. zum Öffnen im Browser
router.post('/:projectId/:docId/link', authenticate, wrap(async (req, res) => {
  const doc = await db.get('SELECT * FROM documents WHERE id = ? AND project_id = ?', [req.params.docId, req.params.projectId]);
  if (!doc || !doc.file_path) return res.status(404).json({ success: false, error: 'Dokument nicht gefunden' });
  const access = await checkDownloadAccess(req.user, doc, req.params.projectId);
  if (!access.ok) {
    db.activityLog(req.user.id, 'DOWNLOAD_LINK_DENIED', docCategory(doc), doc.id, req.ip);
    return res.status(403).json({ success: false, error: access.error });
  }
  const token = createDownloadToken({ docId: doc.id, userId: req.user.id });
  db.activityLog(req.user.id, 'DOWNLOAD_LINK_CREATED', docCategory(doc), doc.id, req.ip);
  res.json({ success: true, data: { url: `/api/documents/signed/${token}`, expires_in_seconds: DEFAULT_TTL_MS / 1000 } });
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
  // Datenraum zusätzlich nur mit granularem Lese-Recht (Sprint 4).
  const stage = await getStage(req.user.id, projectId);
  const dataroomRead = await hasPermission(req.user, projectId, 'read');
  const visible = docs.filter(d => {
    const cat = docCategory(d);
    if (!stageAllows(stage, cat)) return false;
    if (cat === 'dataroom' && !dataroomRead) return false;
    return true;
  });
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

  // Zugangskontrolle: Stage-Gate + granulare Datenraum-Rechte (Sprint 4)
  const access = await checkDownloadAccess(req.user, doc, projectId);
  if (!access.ok) {
    db.activityLog(req.user.id, 'DOWNLOAD_DENIED', docCategory(doc), docId, req.ip);
    return res.status(403).json({ success: false, error: access.error });
  }

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

  // Auslieferung mit dynamischem Wasserzeichen (PDF, IM/Datenraum)
  await streamDocument(res, doc, req.user, projectId, 'bearer');
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

// ── PATCH /api/documents/:projectId/:docId  (Admin: Einordnung ändern) ─────
// Zugangslevel (public/nda/approved) und/oder Bezeichnung nachträglich anpassen.
// Kategorie (teaser/im/dataroom) wird passend zum access_level mitgeführt.
router.patch('/:projectId/:docId', ...isAdmin, wrap(async (req, res) => {
  const { projectId, docId } = req.params;
  const { access_level, description } = req.body;
  const doc = await db.get('SELECT * FROM documents WHERE id = ? AND project_id = ?', [docId, projectId]);
  if (!doc) return res.status(404).json({ success: false, error: 'Dokument nicht gefunden' });

  const levelToCategory = { public: 'teaser', nda: 'im', approved: 'dataroom' };
  const newLevel = ['public', 'nda', 'approved'].includes(access_level) ? access_level : doc.access_level;
  const newCategory = levelToCategory[newLevel] || doc.category;

  // Bezeichnung ändern: Das ist der Name, den Interessenten sehen, er muss
  // unabhängig vom hochgeladenen Dateinamen korrigierbar sein. Pfadangaben und
  // Steuerzeichen fliegen raus, die Endung der echten Datei bleibt erhalten
  // (sonst öffnet der Browser die Datei falsch).
  let newName = null;
  if (typeof req.body.filename === 'string') {
    const clean = String(req.body.filename)
      .replace(/[/\\]/g, '_')                 // keine Pfadangaben
      .replace(/[\u0000-\u001F\u007F]/g, '')   // keine Steuerzeichen
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);
    if (!clean) return res.status(400).json({ success: false, error: 'Die Bezeichnung darf nicht leer sein.' });

    const ext = (doc.filename.match(/\.[A-Za-z0-9]{1,8}$/) || [''])[0];
    newName = (ext && !clean.toLowerCase().endsWith(ext.toLowerCase())) ? clean + ext : clean;
  }

  await db.run(
    `UPDATE documents SET
       filename = COALESCE(?, filename),
       access_level = ?, category = ?,
       description = COALESCE(?, description)
     WHERE id = ?`,
    [newName, newLevel, newCategory, description ?? null, docId]
  );

  const changes = [];
  if (newName && newName !== doc.filename) changes.push(`Name: „${doc.filename}" → „${newName}"`);
  if (newLevel !== doc.access_level) changes.push(`Zugang: ${doc.access_level} → ${newLevel}`);
  if (description != null && description !== doc.description) changes.push('Beschreibung geändert');

  db.auditLog(req.user.id, 'UPDATE_DOCUMENT', 'document', docId,
    changes.length ? changes.join(' · ') : `${doc.filename}: unverändert`, req.ip);
  res.json({
    success: true,
    data: {
      message: 'Dokument aktualisiert',
      filename: newName || doc.filename,
      access_level: newLevel, category: newCategory,
    },
  });
}));

// ── POST /api/documents/:projectId/:docId/file  (Admin: Datei nachreichen/ersetzen) ──
// Hängt eine echte Datei an eine BESTEHENDE Dokumentzeile (z. B. vorbereitete
// Teaser-/IM-Einträge ohne Datei). Bezeichnung, Beschreibung und Zugangslevel
// bleiben erhalten; Dateityp/-größe werden aktualisiert, alte Datei entfernt.
router.post('/:projectId/:docId/file', ...isAdmin, upload.single('file'), wrap(async (req, res) => {
  const { projectId, docId } = req.params;
  if (!req.file) return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });

  const doc = await db.get('SELECT * FROM documents WHERE id = ? AND project_id = ?', [docId, projectId]);
  if (!doc) {
    fs.unlink(req.file.path, () => {});
    return res.status(404).json({ success: false, error: 'Dokument nicht gefunden' });
  }

  const oldPath = doc.file_path;
  await db.run(
    `UPDATE documents
     SET file_path = ?, file_type = ?, file_size = ?, storage_ref = ?, version = COALESCE(version, 1) + 1
     WHERE id = ?`,
    [req.file.path, req.file.mimetype, req.file.size, req.file.path, docId]
  );
  // Alte Datei aufräumen (falls vorhanden und nicht identisch)
  if (oldPath && oldPath !== req.file.path) fs.unlink(oldPath, () => {});

  db.auditLog(req.user.id, 'UPLOAD_DOCUMENT_FILE', 'document', docId,
    `${doc.filename}: Datei hinterlegt (${req.file.originalname}, ${(req.file.size / 1024 / 1024).toFixed(2)} MB)`, req.ip);
  res.status(201).json({
    success: true,
    data: { id: Number(docId), filename: doc.filename, file_size: req.file.size, file_type: req.file.mimetype, has_file: 1 },
  });
}));

module.exports = router;
