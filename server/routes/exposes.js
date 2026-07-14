// ─────────────────────────────────────────────────────────────────────────────
// Sprint 9: Exposé-Builder.
//   GET  /api/exposes/:projectId            Manager: voller Editor-Stand + Safe-Bilder;
//                                           Käufer: nur published hinter IM-Gate
//   PUT  /api/exposes/:projectId            Manager: speichern (Autosave)
//   POST /api/exposes/:projectId/publish    Manager: veröffentlichen (Anonymisierungs-Ack)
//   POST /api/exposes/:projectId/unpublish  Manager: zurück auf Entwurf
//   GET  /api/exposes/:projectId/image/:id  Bild (gate-geprüft) aus dem Safe
//   GET  /api/exposes/:projectId/pdf        Exposé-PDF mit Empfänger-Wasserzeichen
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const wrap = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { getStage } = require('../middleware/gates');
const { stageAllows } = require('../utils/dealStateMachine');
const { getStorage } = require('../providers/storage');
const { generateExposeReport } = require('../valuation/exposeReport');
const router = express.Router();

// Upload eines fertigen Exposé-PDFs (landet im Safe, wird von dort ausgeliefert)
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf';
    cb(ok ? null : new Error('Nur PDF-Dateien erlaubt'), ok);
  },
});

const scoped = (req, fn) => (req.tenantId && req.tenantId !== 1) ? db.withTenant(req.tenantId, fn) : fn(db);
const ADMIN_ROLES = ['super_admin', 'advisor', 'tenant_owner'];

const DEFAULT_SECTIONS = [
  { key: 'company', title: 'Unternehmen & Historie', enabled: true, body: '' },
  { key: 'offering', title: 'Leistungsspektrum & Geschäftsmodell', enabled: true, body: '' },
  { key: 'market', title: 'Markt & Wettbewerb', enabled: true, body: '' },
  { key: 'organization', title: 'Organisation & Mitarbeiter', enabled: true, body: '' },
  { key: 'financials', title: 'Finanzen (Kurzüberblick)', enabled: true, body: '' },
  { key: 'swot', title: 'Stärken & Entwicklungspotenziale', enabled: true, body: '' },
  { key: 'realestate', title: 'Immobilien & Anlagen', enabled: false, body: '' },
  { key: 'buyer', title: 'Käuferanforderungen & Verkaufsgrund', enabled: true, body: '' },
  { key: 'process', title: 'Prozess & nächste Schritte', enabled: true, body: '' },
];

// Sprint 19: Rollentrennung: „Betrachter" dürfen das Exposé sehen, aber nicht
// bearbeiten oder veröffentlichen.
const access = require('../utils/projectAccess');
const getFn = (req) => (sql, p) => scoped(req, (t) => t.get(sql, p));

async function canManage(req, projectId) {
  return access.canManage(getFn(req), req.user, projectId);
}
async function canViewProject(req, projectId) {
  return access.canView(getFn(req), req.user, projectId);
}

async function loadExpose(req, projectId) {
  return scoped(req, (t) => t.get('SELECT * FROM exposes WHERE project_id = ?', [projectId]));
}
function parseExpose(row) {
  if (!row) return null;
  let keyfacts = {}, sections = [], gallery = [];
  try { keyfacts = JSON.parse(row.keyfacts_json || '{}'); } catch {}
  try { sections = JSON.parse(row.sections_json || '[]'); } catch {}
  try { gallery = JSON.parse(row.gallery_json || '[]'); } catch {}
  if (!sections.length) sections = DEFAULT_SECTIONS;
  return { id: row.id, status: row.status, keyfacts, sections, hero_image_id: row.hero_image_id,
    gallery, anonymized_ack: !!row.anonymized_ack, published_at: row.published_at, updated_at: row.updated_at,
    pdf_item_id: row.pdf_item_id || null };
}

// Neuesten geprüften Bewertungskorridor des Mandats holen (optional)
async function reviewedCorridor(req, projectId) {
  const v = await scoped(req, (t) => t.get(
    `SELECT results_json FROM detailed_valuations WHERE project_id = ? AND status = 'reviewed' ORDER BY reviewed_at DESC LIMIT 1`, [projectId]));
  if (!v) return null;
  try { const r = JSON.parse(v.results_json || '{}'); return r.corridor && r.positive ? r.corridor : null; } catch { return null; }
}

// ── GET: Editor (Manager) oder gated Web-Exposé (Käufer) ───────────────────
router.get('/:projectId', authenticate, wrap(async (req, res) => {
  const projectId = req.params.projectId;
  const project = await scoped(req, (t) => t.get('SELECT id, codename, mandate_type, industry, region, status FROM projects WHERE id = ?', [projectId]));
  if (!project) return res.status(404).json({ success: false, error: 'Mandat nicht gefunden' });
  const manage = await canManage(req, projectId);
  const row = await loadExpose(req, projectId);
  const expose = parseExpose(row) || { status: 'draft', keyfacts: {}, sections: DEFAULT_SECTIONS, hero_image_id: null, gallery: [], anonymized_ack: false };
  const corridor = await reviewedCorridor(req, projectId);

  if (manage) {
    const safeImages = await scoped(req, (t) => t.all(
      `SELECT id, name, mime FROM safe_items WHERE project_id = ? AND is_folder = 0 AND deleted_at IS NULL AND mime LIKE 'image/%' ORDER BY created_at DESC`, [projectId]));
    return res.json({ success: true, data: { expose, project, corridor, safeImages, can_manage: true } });
  }
  // Sprint 19: „Betrachter" sehen das Exposé (auch im Entwurf), aber schreibgeschützt
  if (await canViewProject(req, projectId)) {
    return res.json({ success: true, data: { expose, project, corridor, safeImages: [], can_manage: false, read_only: true } });
  }
  // Käufer: nur veröffentlicht + IM-Gate passiert
  const stage = await getStage(req.user.id, projectId);
  if (expose.status !== 'published' || !stageAllows(stage, 'im')) {
    return res.status(403).json({ success: false, error: 'Exposé erst nach unterzeichnetem NDA verfügbar' });
  }
  db.activityLog(req.user.id, 'EXPOSE_VIEW', 'expose', row ? row.id : null, req.ip);
  res.json({ success: true, data: { expose: { ...expose, anonymized_ack: undefined }, project, corridor, can_manage: false } });
}));

// ── PUT: speichern (Manager, Autosave) ─────────────────────────────────────
router.put('/:projectId', authenticate, wrap(async (req, res) => {
  const projectId = req.params.projectId;
  if (!(await canManage(req, projectId))) return res.status(403).json({ success: false, error: 'Kein Zugriff' });
  const { keyfacts, sections, hero_image_id, gallery, anonymized_ack } = req.body;
  const existing = await loadExpose(req, projectId);
  if (existing) {
    await scoped(req, (t) => t.run(
      `UPDATE exposes SET keyfacts_json = COALESCE(?, keyfacts_json), sections_json = COALESCE(?, sections_json),
         hero_image_id = ?, gallery_json = COALESCE(?, gallery_json), anonymized_ack = COALESCE(?, anonymized_ack),
         updated_by = ?, updated_at = now() WHERE project_id = ?`,
      [keyfacts ? JSON.stringify(keyfacts) : null, sections ? JSON.stringify(sections) : null,
       hero_image_id !== undefined ? hero_image_id : existing.hero_image_id,
       gallery ? JSON.stringify(gallery) : null, anonymized_ack != null ? (anonymized_ack ? 1 : 0) : null,
       req.user.id, projectId]));
  } else {
    await scoped(req, (t) => t.insert(
      `INSERT INTO exposes (tenant_id, project_id, status, keyfacts_json, sections_json, hero_image_id, gallery_json, anonymized_ack, updated_by)
       VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?)`,
      [req.tenantId || 1, projectId, JSON.stringify(keyfacts || {}), JSON.stringify(sections || DEFAULT_SECTIONS),
       hero_image_id || null, JSON.stringify(gallery || []), anonymized_ack ? 1 : 0, req.user.id]));
  }
  res.json({ success: true, data: { message: 'Gespeichert' } });
}));

// ── Publish / Unpublish ─────────────────────────────────────────────────────
router.post('/:projectId/publish', authenticate, wrap(async (req, res) => {
  const projectId = req.params.projectId;
  if (!(await canManage(req, projectId))) return res.status(403).json({ success: false, error: 'Kein Zugriff' });
  const row = await loadExpose(req, projectId);
  const ack = req.body.anonymized_ack != null ? req.body.anonymized_ack : (row && row.anonymized_ack);
  if (!ack) return res.status(400).json({ success: false, error: 'Bitte bestätigen Sie die Anonymisierungs-Checkliste vor der Veröffentlichung.' });
  if (!row) return res.status(400).json({ success: false, error: 'Bitte zuerst Inhalte speichern.' });
  await scoped(req, (t) => t.run(`UPDATE exposes SET status = 'published', anonymized_ack = 1, published_at = now(), updated_at = now() WHERE project_id = ?`, [projectId]));
  db.auditLog(req.user.id, 'EXPOSE_PUBLISH', 'expose', row.id, null, req.ip);
  // Sprint 18: Follower über das neue Exposé informieren
  require('../utils/notify').notifyFollowers(projectId, {
    title: 'Exposé verfügbar',
    message: 'zu einem Mandat, dem Sie folgen, ist jetzt das ausführliche Exposé verfügbar (nach unterzeichneter Vertraulichkeitsvereinbarung einsehbar).',
    ctaLabel: 'Exposé ansehen',
  }).catch(() => {});
  res.json({ success: true, data: { message: 'Exposé veröffentlicht' } });
}));

router.post('/:projectId/unpublish', authenticate, wrap(async (req, res) => {
  const projectId = req.params.projectId;
  if (!(await canManage(req, projectId))) return res.status(403).json({ success: false, error: 'Kein Zugriff' });
  await scoped(req, (t) => t.run(`UPDATE exposes SET status = 'draft', updated_at = now() WHERE project_id = ?`, [projectId]));
  db.auditLog(req.user.id, 'EXPOSE_UNPUBLISH', 'expose', null, null, req.ip);
  res.json({ success: true, data: { message: 'Exposé zurückgezogen' } });
}));

// ── Kurzprofil-Ableitung: öffentliche Teaser-Karte aus dem Exposé befüllen ──
router.post('/:projectId/derive-teaser', authenticate, wrap(async (req, res) => {
  const projectId = req.params.projectId;
  if (!(await canManage(req, projectId))) return res.status(403).json({ success: false, error: 'Kein Zugriff' });
  const expose = parseExpose(await loadExpose(req, projectId));
  if (!expose) return res.status(400).json({ success: false, error: 'Bitte zuerst Exposé-Inhalte speichern.' });
  const kf = expose.keyfacts || {};
  const sec = (key) => { const s = (expose.sections || []).find(x => x.key === key && x.enabled && String(x.body || '').trim()); return s ? String(s.body).trim() : ''; };

  // Kurzbeschreibung: Unternehmens- bzw. Leistungssektion (anonymisiert, gekürzt)
  const shortDesc = (sec('company') || sec('offering') || '').slice(0, 600) || null;
  // Highlights aus der Stärken-Sektion (zeilen-/satzweise), max. 5
  const swot = sec('swot');
  let highlights = [];
  if (swot) highlights = swot.split(/\n|(?<=\.)\s+/).map(s => s.trim()).filter(s => s.length > 8).slice(0, 5);

  await scoped(req, (t) => t.run(
    `UPDATE projects SET
       industry     = COALESCE(NULLIF(?, ''), industry),
       region       = COALESCE(NULLIF(?, ''), region),
       revenue_band = COALESCE(NULLIF(?, ''), revenue_band),
       ebitda_band  = COALESCE(NULLIF(?, ''), ebitda_band),
       short_description = COALESCE(?, short_description),
       highlights   = COALESCE(?, highlights)
     WHERE id = ?`,
    [kf.industries || '', kf.region || '', kf.revenue_band || '', kf.ebit_band || '',
     shortDesc, highlights.length ? JSON.stringify(highlights) : null, projectId]));
  db.auditLog(req.user.id, 'EXPOSE_DERIVE_TEASER', 'project', projectId, null, req.ip);
  res.json({ success: true, data: { message: 'Öffentliche Teaser-Karte aktualisiert', fields: { industry: kf.industries, region: kf.region, revenue_band: kf.revenue_band, ebitda_band: kf.ebit_band, highlights: highlights.length } } });
}));

// Zugriffsprüfung für Exposé-Bilder + PDF (Manager oder published+Gate)
async function exposeAccess(req, projectId) {
  if (await canManage(req, projectId)) return { ok: true, manage: true, expose: parseExpose(await loadExpose(req, projectId)) };
  const row = await loadExpose(req, projectId);
  const expose = parseExpose(row);
  const stage = await getStage(req.user.id, projectId);
  if (!expose || expose.status !== 'published' || !stageAllows(stage, 'im')) return { ok: false };
  return { ok: true, manage: false, expose };
}

// ── Bild aus dem Safe (gate-geprüft, nur wenn im Exposé referenziert) ───────
router.get('/:projectId/image/:safeId', authenticate, wrap(async (req, res) => {
  const projectId = req.params.projectId;
  const acc = await exposeAccess(req, projectId);
  if (!acc.ok) return res.status(403).json({ success: false, error: 'Kein Zugriff' });
  const safeId = Number(req.params.safeId);
  // Käufer dürfen nur referenzierte Bilder sehen
  if (!acc.manage) {
    const refd = acc.expose && (acc.expose.hero_image_id === safeId || (acc.expose.gallery || []).includes(safeId));
    if (!refd) return res.status(403).json({ success: false, error: 'Kein Zugriff' });
  }
  const item = await scoped(req, (t) => t.get('SELECT * FROM safe_items WHERE id = ? AND project_id = ? AND is_folder = 0', [safeId, projectId]));
  if (!item || !item.storage_key || !(item.mime || '').startsWith('image/')) return res.status(404).json({ success: false, error: 'Bild nicht gefunden' });
  const buf = await getStorage().get(item.storage_key);
  res.setHeader('Content-Type', item.mime);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(item.name)}"`);
  res.send(buf);
}));

// ── Fertiges Exposé-PDF hochladen (in den Safe) ─────────────────────────────
// Legt die Datei über den StorageProvider im Safe ab, erzeugt ein safe_items-
// Element und verknüpft es mit dem Exposé. Danach liefert /pdf diese Datei aus.
router.post('/:projectId/pdf-upload', authenticate, pdfUpload.single('file'), wrap(async (req, res) => {
  const projectId = req.params.projectId;
  if (!(await canManage(req, projectId))) return res.status(403).json({ success: false, error: 'Kein Zugriff' });
  if (!req.file) return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });

  const project = await scoped(req, (t) => t.get('SELECT id, codename FROM projects WHERE id = ?', [projectId]));
  if (!project) return res.status(404).json({ success: false, error: 'Mandat nicht gefunden' });

  const name = req.file.originalname && req.file.originalname.toLowerCase().endsWith('.pdf')
    ? req.file.originalname
    : `Expose_${String(project.codename).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  const key = `project_${projectId}/${uuidv4()}.pdf`;
  await getStorage().put(key, req.file.buffer, 'application/pdf');
  const checksum = crypto.createHash('sha256').update(req.file.buffer).digest('hex');

  const safeId = await scoped(req, (t) => t.insert(
    `INSERT INTO safe_items (tenant_id, project_id, parent_id, name, is_folder, storage_key, size, mime, checksum_sha256, version, uploaded_by)
     VALUES (?, ?, NULL, ?, 0, ?, ?, 'application/pdf', ?, 1, ?)`,
    [req.tenantId || 1, projectId, name, key, req.file.size, checksum, req.user.id]));

  // Exposé-Zeile sicherstellen und verknüpfen
  const existing = await loadExpose(req, projectId);
  if (existing) {
    await scoped(req, (t) => t.run(`UPDATE exposes SET pdf_item_id = ?, updated_by = ?, updated_at = now() WHERE project_id = ?`,
      [safeId, req.user.id, projectId]));
  } else {
    await scoped(req, (t) => t.insert(
      `INSERT INTO exposes (tenant_id, project_id, status, keyfacts_json, sections_json, gallery_json, anonymized_ack, pdf_item_id, updated_by)
       VALUES (?, ?, 'draft', '{}', ?, '[]', 0, ?, ?)`,
      [req.tenantId || 1, projectId, JSON.stringify(DEFAULT_SECTIONS), safeId, req.user.id]));
  }

  db.auditLog(req.user.id, 'EXPOSE_PDF_UPLOAD', 'expose', Number(projectId), `${name} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`, req.ip);
  res.status(201).json({ success: true, data: { pdf_item_id: safeId, name, size: req.file.size } });
}));

// ── Hochgeladenes Exposé-PDF wieder entfernen (zurück zur Generierung) ──────
router.post('/:projectId/pdf-remove', authenticate, wrap(async (req, res) => {
  const projectId = req.params.projectId;
  if (!(await canManage(req, projectId))) return res.status(403).json({ success: false, error: 'Kein Zugriff' });
  await scoped(req, (t) => t.run(`UPDATE exposes SET pdf_item_id = NULL, updated_by = ?, updated_at = now() WHERE project_id = ?`, [req.user.id, projectId]));
  db.auditLog(req.user.id, 'EXPOSE_PDF_REMOVE', 'expose', Number(projectId), null, req.ip);
  res.json({ success: true, data: { message: 'Hochgeladenes PDF entfernt, es wird wieder generiert.' } });
}));

// ── PDF-Export: hochgeladenes PDF bevorzugt, sonst generiert (Wasserzeichen) ─
router.get('/:projectId/pdf', authenticate, wrap(async (req, res) => {
  const projectId = req.params.projectId;
  const acc = await exposeAccess(req, projectId);
  if (!acc.ok) return res.status(403).json({ success: false, error: 'Exposé nicht verfügbar' });
  const project = await scoped(req, (t) => t.get('SELECT codename FROM projects WHERE id = ?', [projectId]));
  const expose = acc.expose;

  // Vorrang: fertig hochgeladenes Exposé-PDF aus dem Safe ausliefern
  if (expose && expose.pdf_item_id) {
    const item = await scoped(req, (t) => t.get(
      'SELECT * FROM safe_items WHERE id = ? AND project_id = ? AND is_folder = 0 AND deleted_at IS NULL',
      [expose.pdf_item_id, projectId]));
    if (item && item.storage_key) {
      try {
        const buf = await getStorage().get(item.storage_key);
        db.activityLog(req.user.id, 'EXPOSE_PDF', 'expose', expose.id || null, req.ip);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(item.name)}"`);
        return res.send(buf);
      } catch (e) {
        console.warn('[expose pdf upload] Fallback auf Generierung:', e.message);
      }
    }
  }
  const corridor = await reviewedCorridor(req, projectId);
  let heroBuffer = null;
  if (expose && expose.hero_image_id) {
    const hero = await scoped(req, (t) => t.get('SELECT storage_key, mime FROM safe_items WHERE id = ? AND project_id = ?', [expose.hero_image_id, projectId]));
    if (hero && hero.storage_key) { try { heroBuffer = await getStorage().get(hero.storage_key); } catch {} }
  }
  const pdf = await generateExposeReport({
    project, keyfacts: expose.keyfacts, sections: expose.sections, corridor, heroBuffer,
    recipient: { name: [req.user.title, req.user.first_name, req.user.last_name].filter(Boolean).join(' '), email: req.user.email },
    date: new Date(),
  });
  db.activityLog(req.user.id, 'EXPOSE_PDF', 'expose', expose.id || null, req.ip);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Expose_${project ? project.codename.replace(/[^a-zA-Z0-9]/g, '_') : projectId}.pdf"`);
  res.send(pdf);
}));

module.exports = router;
