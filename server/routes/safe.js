// ─────────────────────────────────────────────────────────────────────────────
// Sprint 8 — Container-Safe (Ordner, Bilder, beliebige Dateien je Mandat).
// Zugriff: ausschließlich Admin + Projekt-Pfleger (can_manage). KEIN Investor.
// Speicher über StorageProvider (local | s3/R2), per ENV umschaltbar.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const wrap = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { getStorage } = require('../providers/storage');
const router = express.Router();

const scoped = (req, fn) => (req.tenantId && req.tenantId !== 1) ? db.withTenant(req.tenantId, fn) : fn(db);
const TRASH_DAYS = 30;

// Pflege-Berechtigung (wie projects.js): Admin/Berater, Ersteller oder Mitglied.
async function canManage(req, projectId) {
  const u = req.user;
  if (['super_admin', 'advisor', 'tenant_owner'].includes(u.role)) return true;
  const p = await scoped(req, (t) => t.get('SELECT created_by FROM projects WHERE id = ?', [projectId]));
  if (!p) return false;
  if (p.created_by === u.id) return true;
  const m = await scoped(req, (t) => t.get('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, u.id]));
  return !!m;
}
async function guard(req, res) {
  if (!(await canManage(req, req.params.projectId))) { res.status(403).json({ success: false, error: 'Kein Zugriff auf den Safe dieses Mandats' }); return false; }
  return true;
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024, files: 500 } });

function rowOut(r) {
  return { id: r.id, name: r.name, is_folder: !!r.is_folder, parent_id: r.parent_id,
    size: Number(r.size || 0), mime: r.mime, version: r.version, checksum: r.checksum_sha256,
    uploaded_by: r.uploaded_by, created_at: r.created_at, deleted_at: r.deleted_at };
}

// Ordner-Kette unter parent anlegen/auflösen (für Ordner-Uploads via relative Pfade)
async function ensureFolderPath(req, projectId, parentId, segments) {
  let pid = parentId || null;
  for (const seg of segments) {
    if (!seg) continue;
    let f = await scoped(req, (t) => t.get(
      `SELECT id FROM safe_items WHERE project_id = ? AND is_folder = 1 AND name = ? AND deleted_at IS NULL AND ${pid == null ? 'parent_id IS NULL' : 'parent_id = ?'}`,
      pid == null ? [projectId, seg] : [projectId, seg, pid]));
    if (!f) {
      const id = await scoped(req, (t) => t.insert(
        `INSERT INTO safe_items (tenant_id, project_id, parent_id, name, is_folder, uploaded_by) VALUES (?, ?, ?, ?, 1, ?)`,
        [req.tenantId || 1, projectId, pid, seg, req.user.id]));
      pid = id;
    } else pid = f.id;
  }
  return pid;
}

// ── Liste (ein Ordner) + Breadcrumb ─────────────────────────────────────────
router.get('/:projectId', authenticate, wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  const pid = req.query.parent_id ? Number(req.query.parent_id) : null;
  const items = await scoped(req, (t) => t.all(
    `SELECT * FROM safe_items WHERE project_id = ? AND deleted_at IS NULL AND ${pid == null ? 'parent_id IS NULL' : 'parent_id = ?'}
     ORDER BY is_folder DESC, name ASC`,
    pid == null ? [req.params.projectId] : [req.params.projectId, pid]));
  // Breadcrumb
  const crumbs = [];
  let cur = pid;
  while (cur) {
    const f = await scoped(req, (t) => t.get('SELECT id, name, parent_id FROM safe_items WHERE id = ?', [cur]));
    if (!f) break;
    crumbs.unshift({ id: f.id, name: f.name });
    cur = f.parent_id;
  }
  res.json({ success: true, data: { items: items.map(rowOut), breadcrumb: crumbs, parent_id: pid } });
}));

// ── Ordnerbaum (alle Ordner, für Sidebar) ───────────────────────────────────
router.get('/:projectId/tree', authenticate, wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  const folders = await scoped(req, (t) => t.all(
    `SELECT id, name, parent_id FROM safe_items WHERE project_id = ? AND is_folder = 1 AND deleted_at IS NULL ORDER BY name`,
    [req.params.projectId]));
  res.json({ success: true, data: folders });
}));

// ── Ordner anlegen ──────────────────────────────────────────────────────────
router.post('/:projectId/folder', authenticate, wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  const { name, parent_id } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: 'Ordnername fehlt' });
  const id = await scoped(req, (t) => t.insert(
    `INSERT INTO safe_items (tenant_id, project_id, parent_id, name, is_folder, uploaded_by) VALUES (?, ?, ?, ?, 1, ?)`,
    [req.tenantId || 1, req.params.projectId, parent_id || null, String(name).trim(), req.user.id]));
  db.auditLog(req.user.id, 'SAFE_FOLDER_CREATE', 'safe_item', id, name, req.ip);
  res.json({ success: true, data: { id } });
}));

// ── Upload (mehrere Dateien; optional Ordnerbaum via relative Pfade) ─────────
router.post('/:projectId/upload', authenticate, upload.array('files', 500), wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  if (!req.files || !req.files.length) return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });
  const projectId = req.params.projectId;
  const baseParent = req.body.parent_id ? Number(req.body.parent_id) : null;
  let paths = [];
  try { paths = JSON.parse(req.body.paths || '[]'); } catch {}
  const storage = getStorage();
  const created = [];

  for (let i = 0; i < req.files.length; i++) {
    const file = req.files[i];
    const rel = paths[i] || file.originalname;      // z. B. "Unterordner/Datei.pdf"
    const parts = String(rel).split('/').filter(Boolean);
    const fileName = parts.pop();
    const parentId = await ensureFolderPath(req, projectId, baseParent, parts);

    // Versionierung bei Namenskollision im Zielordner
    const existing = await scoped(req, (t) => t.get(
      `SELECT MAX(version) AS v FROM safe_items WHERE project_id = ? AND is_folder = 0 AND name = ? AND deleted_at IS NULL AND ${parentId == null ? 'parent_id IS NULL' : 'parent_id = ?'}`,
      parentId == null ? [projectId, fileName] : [projectId, fileName, parentId]));
    const version = existing && existing.v ? Number(existing.v) + 1 : 1;

    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const ext = path.extname(fileName).toLowerCase();
    const key = `project_${projectId}/${uuidv4()}${ext}`;
    await storage.put(key, file.buffer, file.mimetype);

    const id = await scoped(req, (t) => t.insert(
      `INSERT INTO safe_items (tenant_id, project_id, parent_id, name, is_folder, storage_key, size, mime, checksum_sha256, version, uploaded_by)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
      [req.tenantId || 1, projectId, parentId, fileName, key, file.size, file.mimetype, checksum, version, req.user.id]));
    created.push({ id, name: fileName, version });
  }
  db.auditLog(req.user.id, 'SAFE_UPLOAD', 'safe_item', null, `${created.length} Datei(en) → Projekt ${projectId}`, req.ip);
  res.json({ success: true, data: { created } });
}));

// ── Download / Inline-Vorschau ──────────────────────────────────────────────
router.get('/:projectId/item/:id/download', authenticate, wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  const item = await scoped(req, (t) => t.get('SELECT * FROM safe_items WHERE id = ? AND project_id = ?', [req.params.id, req.params.projectId]));
  if (!item || item.is_folder || !item.storage_key) return res.status(404).json({ success: false, error: 'Datei nicht gefunden' });
  const buf = await getStorage().get(item.storage_key);
  db.activityLog(req.user.id, 'SAFE_DOWNLOAD', 'safe_item', item.id, req.ip);
  res.setHeader('Content-Type', item.mime || 'application/octet-stream');
  res.setHeader('Content-Disposition', `${req.query.inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(item.name)}"`);
  res.send(buf);
}));

// ── Rekursiv alle Nachfahren-IDs sammeln ────────────────────────────────────
async function descendantIds(req, projectId, id) {
  const out = [Number(id)];
  let frontier = [Number(id)];
  while (frontier.length) {
    const kids = await scoped(req, (t) => t.all(
      `SELECT id FROM safe_items WHERE project_id = ? AND parent_id IN (${frontier.map(() => '?').join(',')})`,
      [projectId, ...frontier]));
    frontier = kids.map(k => k.id);
    out.push(...frontier);
  }
  return out;
}

// ── Soft-Delete → Papierkorb (Ordner rekursiv) ──────────────────────────────
router.delete('/:projectId/item/:id', authenticate, wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  const ids = await descendantIds(req, req.params.projectId, req.params.id);
  await scoped(req, (t) => t.run(
    `UPDATE safe_items SET deleted_at = now() WHERE project_id = ? AND id IN (${ids.map(() => '?').join(',')})`,
    [req.params.projectId, ...ids]));
  db.auditLog(req.user.id, 'SAFE_DELETE', 'safe_item', req.params.id, `${ids.length} Objekt(e)`, req.ip);
  res.json({ success: true, data: { deleted: ids.length } });
}));

// ── Papierkorb-Liste ────────────────────────────────────────────────────────
router.get('/:projectId/trash', authenticate, wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  const items = await scoped(req, (t) => t.all(
    `SELECT * FROM safe_items WHERE project_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT 500`,
    [req.params.projectId]));
  res.json({ success: true, data: items.map(rowOut) });
}));

// ── Wiederherstellen (aus Papierkorb) ───────────────────────────────────────
router.post('/:projectId/item/:id/restore', authenticate, wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  const item = await scoped(req, (t) => t.get('SELECT * FROM safe_items WHERE id = ? AND project_id = ?', [req.params.id, req.params.projectId]));
  if (!item) return res.status(404).json({ success: false, error: 'Nicht gefunden' });
  // Falls Elternordner gelöscht ist → in die Wurzel zurückholen
  let newParent = item.parent_id;
  if (newParent) {
    const par = await scoped(req, (t) => t.get('SELECT deleted_at FROM safe_items WHERE id = ?', [newParent]));
    if (!par || par.deleted_at) newParent = null;
  }
  await scoped(req, (t) => t.run('UPDATE safe_items SET deleted_at = NULL, parent_id = ? WHERE id = ?', [newParent, item.id]));
  db.auditLog(req.user.id, 'SAFE_RESTORE', 'safe_item', item.id, null, req.ip);
  res.json({ success: true, data: { message: 'Wiederhergestellt' } });
}));

// ── Endgültig löschen (Storage + DB) ────────────────────────────────────────
router.delete('/:projectId/item/:id/purge', authenticate, wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  const ids = await descendantIds(req, req.params.projectId, req.params.id);
  const files = await scoped(req, (t) => t.all(
    `SELECT storage_key FROM safe_items WHERE id IN (${ids.map(() => '?').join(',')}) AND storage_key IS NOT NULL`, ids));
  const storage = getStorage();
  for (const f of files) { try { await storage.delete(f.storage_key); } catch {} }
  await scoped(req, (t) => t.run(`DELETE FROM safe_items WHERE project_id = ? AND id IN (${ids.map(() => '?').join(',')})`, [req.params.projectId, ...ids]));
  db.auditLog(req.user.id, 'SAFE_PURGE', 'safe_item', req.params.id, `${ids.length} Objekt(e)`, req.ip);
  res.json({ success: true, data: { purged: ids.length } });
}));

// ── In Datenraum/IM/Teaser übernehmen (kopiert in documents) ────────────────
const DOC_UPLOAD_DIR = process.env.UPLOAD_DIR
  || (process.env.RAILWAY_VOLUME_MOUNT_PATH ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads') : path.join(__dirname, '../../uploads'));

router.post('/:projectId/item/:id/publish', authenticate, wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  const item = await scoped(req, (t) => t.get('SELECT * FROM safe_items WHERE id = ? AND project_id = ? AND deleted_at IS NULL', [req.params.id, req.params.projectId]));
  if (!item || item.is_folder || !item.storage_key) return res.status(404).json({ success: false, error: 'Datei nicht gefunden' });
  const access_level = ['public', 'nda', 'approved'].includes(req.body.access_level) ? req.body.access_level : 'nda';
  const buf = await getStorage().get(item.storage_key);
  // In das Dokumenten-Verzeichnis materialisieren (documents streamt von Disk)
  const dir = path.join(DOC_UPLOAD_DIR, `project_${req.params.projectId}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(item.name).toLowerCase();
  const base = path.basename(item.name, ext).replace(/[^a-zA-Z0-9_\-\.äöüÄÖÜ]/g, '_').substring(0, 60);
  const diskPath = path.join(dir, `${base}_${Date.now()}${ext}`);
  fs.writeFileSync(diskPath, buf);
  const docId = await scoped(req, (t) => t.insert(
    `INSERT INTO documents (project_id, filename, file_type, file_size, access_level, description, uploaded_by, file_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.params.projectId, item.name, item.mime || 'application/octet-stream', item.size, access_level, req.body.description || '', req.user.id, diskPath]));
  db.auditLog(req.user.id, 'SAFE_PUBLISH', 'document', docId, `${item.name} (${access_level}) aus Safe`, req.ip);
  res.json({ success: true, data: { document_id: docId, access_level } });
}));

// ── Speicherverbrauch (Mandat) ──────────────────────────────────────────────
router.get('/:projectId/usage', authenticate, wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  const r = await scoped(req, (t) => t.get(
    `SELECT COUNT(*) FILTER (WHERE is_folder = 0)::int AS files,
            COUNT(*) FILTER (WHERE is_folder = 1)::int AS folders,
            COALESCE(SUM(size) FILTER (WHERE is_folder = 0), 0)::bigint AS bytes
     FROM safe_items WHERE project_id = ? AND deleted_at IS NULL`, [req.params.projectId]));
  res.json({ success: true, data: { files: r.files, folders: r.folders, bytes: Number(r.bytes) } });
}));

module.exports = router;
