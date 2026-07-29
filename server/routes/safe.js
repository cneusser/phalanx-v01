// ─────────────────────────────────────────────────────────────────────────────
// Sprint 8: Container-Safe (Ordner, Bilder, beliebige Dateien je Mandat).
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

// Sprint 19: Rollentrennung: Pflegende dürfen alles, BETRACHTER nur lesen.
const access = require('../utils/projectAccess');
const getFn = (req) => (sql, p) => scoped(req, (t) => t.get(sql, p));

async function canManage(req, projectId) {
  return access.canManage(getFn(req), req.user, projectId);
}
// Schreib-/Löschzugriff (Upload, Ordner, Papierkorb, Publish), nur Pflegende.
async function guard(req, res) {
  if (!(await canManage(req, req.params.projectId))) {
    res.status(403).json({ success: false, error: 'Kein Schreibzugriff auf den Safe dieses Mandats' });
    return false;
  }
  return true;
}
// Lesezugriff (Liste, Baum, Download, Speicherverbrauch), auch Betrachter.
async function guardRead(req, res) {
  if (!(await access.canView(getFn(req), req.user, req.params.projectId))) {
    res.status(403).json({ success: false, error: 'Kein Zugriff auf den Safe dieses Mandats' });
    return false;
  }
  return true;
}

// Revisionssichere Zugriffs-Dokumentation (Ansicht/Download) je Datei.
async function logSafeAccess(req, projectId, itemId, action) {
  await scoped(req, (t) => t.run(
    `INSERT INTO safe_access_log (tenant_id, project_id, item_id, user_id, action) VALUES (?, ?, ?, ?, ?)`,
    [req.tenantId || 1, projectId, itemId, req.user.id, action])).catch(() => {});
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024, files: 500 } });

function rowOut(r) {
  return { id: r.id, name: r.name, is_folder: !!r.is_folder, parent_id: r.parent_id,
    position: Number(r.position || 0),
    size: Number(r.size || 0), mime: r.mime, version: r.version, checksum: r.checksum_sha256,
    uploaded_by: r.uploaded_by, created_at: r.created_at, deleted_at: r.deleted_at };
}

// Nächste freie Position (1..N) innerhalb eines Ordners.
async function nextPosition(req, projectId, parentId) {
  const r = await scoped(req, (t) => t.get(
    `SELECT COALESCE(MAX(position), 0) AS m FROM safe_items WHERE project_id = ? AND deleted_at IS NULL AND ${parentId == null ? 'parent_id IS NULL' : 'parent_id = ?'}`,
    parentId == null ? [projectId] : [projectId, parentId]));
  return (r ? Number(r.m) : 0) + 1;
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
      const pos = await nextPosition(req, projectId, pid);
      const id = await scoped(req, (t) => t.insert(
        `INSERT INTO safe_items (tenant_id, project_id, parent_id, name, is_folder, position, uploaded_by) VALUES (?, ?, ?, ?, 1, ?, ?)`,
        [req.tenantId || 1, projectId, pid, seg, pos, req.user.id]));
      pid = id;
    } else pid = f.id;
  }
  return pid;
}

// ── Liste (ein Ordner) + Breadcrumb + Mandats-Info ──────────────────────────
router.get('/:projectId', authenticate, wrap(async (req, res) => {
  if (!(await guardRead(req, res))) return;
  const project = await scoped(req, (t) => t.get('SELECT id, codename, mandate_type, industry, status FROM projects WHERE id = ?', [req.params.projectId]));
  if (!project) return res.status(404).json({ success: false, error: 'Mandat nicht gefunden' });
  const pid = req.query.parent_id ? Number(req.query.parent_id) : null;
  const items = await scoped(req, (t) => t.all(
    `SELECT * FROM safe_items WHERE project_id = ? AND deleted_at IS NULL AND ${pid == null ? 'parent_id IS NULL' : 'parent_id = ?'}
     ORDER BY position ASC, name ASC`,
    pid == null ? [req.params.projectId] : [req.params.projectId, pid]));
  // Breadcrumb mit Rang je Ebene (1..N), damit die Nummer strukturbasiert und
  // lückenrobust ist (Rang statt Rohposition).
  const crumbs = [];
  let cur = pid;
  while (cur) {
    const f = await scoped(req, (t) => t.get('SELECT id, name, parent_id, position FROM safe_items WHERE id = ?', [cur]));
    if (!f) break;
    const rk = await scoped(req, (t) => t.get(
      `SELECT COUNT(*)::int AS c FROM safe_items WHERE project_id = ? AND deleted_at IS NULL AND ${f.parent_id == null ? 'parent_id IS NULL' : 'parent_id = ?'} AND position < ?`,
      f.parent_id == null ? [req.params.projectId, f.position] : [req.params.projectId, f.parent_id, f.position]));
    crumbs.unshift({ id: f.id, name: f.name, number_index: (rk ? rk.c : 0) + 1 });
    cur = f.parent_id;
  }
  // Strukturbasierte Nummer je Objekt: Präfix aus den Ebenen + laufender Rang.
  const prefix = crumbs.map(c => c.number_index).join('.');
  let idx = 0;
  const out = items.map(r => { idx += 1; const o = rowOut(r); o.number = prefix ? `${prefix}.${idx}` : String(idx); return o; });
  res.json({ success: true, data: { items: out, breadcrumb: crumbs, parent_id: pid, project } });
}));

// ── Umsortieren (Position tauschen), Nummerierung ergibt sich neu ────────────
router.post('/:projectId/item/:id/move', authenticate, wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  const dir = req.body.dir === 'down' ? 'down' : 'up';
  const item = await scoped(req, (t) => t.get(
    'SELECT id, parent_id, position FROM safe_items WHERE id = ? AND project_id = ? AND deleted_at IS NULL',
    [req.params.id, req.params.projectId]));
  if (!item) return res.status(404).json({ success: false, error: 'Objekt nicht gefunden' });
  const parentCond = item.parent_id == null ? 'parent_id IS NULL' : 'parent_id = ?';
  const base = item.parent_id == null ? [req.params.projectId] : [req.params.projectId, item.parent_id];
  const neighbor = await scoped(req, (t) => t.get(
    `SELECT id, position FROM safe_items WHERE project_id = ? AND deleted_at IS NULL AND ${parentCond}
       AND position ${dir === 'up' ? '<' : '>'} ? ORDER BY position ${dir === 'up' ? 'DESC' : 'ASC'} LIMIT 1`,
    [...base, item.position]));
  if (!neighbor) return res.json({ success: true, data: { moved: false } });
  await scoped(req, (t) => t.run('UPDATE safe_items SET position = ? WHERE id = ?', [neighbor.position, item.id]));
  await scoped(req, (t) => t.run('UPDATE safe_items SET position = ? WHERE id = ?', [item.position, neighbor.id]));
  res.json({ success: true, data: { moved: true } });
}));

// ── Ordnerbaum (alle Ordner, für Sidebar) ───────────────────────────────────
router.get('/:projectId/tree', authenticate, wrap(async (req, res) => {
  if (!(await guardRead(req, res))) return;
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
  const pos = await nextPosition(req, req.params.projectId, parent_id || null);
  const id = await scoped(req, (t) => t.insert(
    `INSERT INTO safe_items (tenant_id, project_id, parent_id, name, is_folder, position, uploaded_by) VALUES (?, ?, ?, ?, 1, ?, ?)`,
    [req.tenantId || 1, req.params.projectId, parent_id || null, String(name).trim(), pos, req.user.id]));
  db.auditLog(req.user.id, 'SAFE_FOLDER_CREATE', 'safe_item', id, name, req.ip);
  res.json({ success: true, data: { id } });
}));

// ── Upload (mehrere Dateien; optional Ordnerbaum via relative Pfade) ─────────
router.post('/:projectId/upload', authenticate, upload.array('files', 500), wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  const projectId = req.params.projectId;
  const baseParent = req.body.parent_id ? Number(req.body.parent_id) : null;
  let paths = [];
  try { paths = JSON.parse(req.body.paths || '[]'); } catch {}
  // Optional: leere Ordner (Drag-and-drop) mitanlegen, auch ohne enthaltene Datei.
  let folderPaths = [];
  try { folderPaths = JSON.parse(req.body.folder_paths || '[]'); } catch {}
  const hasFiles = req.files && req.files.length;
  if (!hasFiles && !folderPaths.length) return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });
  const storage = getStorage();
  const created = [];

  // Zuerst die (auch leeren) Ordnerpfade anlegen.
  for (const fp of folderPaths) {
    const segs = String(fp).split('/').filter(Boolean);
    if (segs.length) await ensureFolderPath(req, projectId, baseParent, segs);
  }

  for (let i = 0; i < (req.files ? req.files.length : 0); i++) {
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

    const pos = await nextPosition(req, projectId, parentId);
    const id = await scoped(req, (t) => t.insert(
      `INSERT INTO safe_items (tenant_id, project_id, parent_id, name, is_folder, position, storage_key, size, mime, checksum_sha256, version, uploaded_by)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
      [req.tenantId || 1, projectId, parentId, fileName, pos, key, file.size, file.mimetype, checksum, version, req.user.id]));
    created.push({ id, name: fileName, version });
  }
  // Mandat im Log mit Codenamen (nicht mit der Projekt-Id) benennen und als
  // Projekt-Ressource ablegen, damit der Aktivitätslog das Mandat sauber auflöst.
  const proj = await scoped(req, (t) => t.get('SELECT codename FROM projects WHERE id = ?', [projectId])).catch(() => null);
  const label = proj && proj.codename ? proj.codename : `Mandat #${projectId}`;
  db.auditLog(req.user.id, 'SAFE_UPLOAD', 'project', projectId, `${created.length} Datei(en) in ${label}`, req.ip);
  res.json({ success: true, data: { created } });
}));

// ── Umbenennen (Datei oder Ordner) ──────────────────────────────────────────
router.patch('/:projectId/item/:id', authenticate, wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  const item = await scoped(req, (t) => t.get(
    'SELECT id, name, is_folder FROM safe_items WHERE id = ? AND project_id = ? AND deleted_at IS NULL',
    [req.params.id, req.params.projectId]));
  if (!item) return res.status(404).json({ success: false, error: 'Objekt nicht gefunden' });
  let clean = String(req.body.name || '')
    .replace(/[/\\]/g, '_')                      // keine Pfadangaben
    .replace(/[\u0000-\u001F\u007F]/g, '')       // keine Steuerzeichen
    .replace(/\s+/g, ' ').trim().slice(0, 200);
  if (!clean) return res.status(400).json({ success: false, error: 'Der Name darf nicht leer sein.' });
  // Bei Dateien die Endung der Originaldatei erhalten (sonst öffnet der Browser falsch).
  if (!item.is_folder) {
    const ext = (item.name.match(/\.[A-Za-z0-9]{1,8}$/) || [''])[0];
    if (ext && !clean.toLowerCase().endsWith(ext.toLowerCase())) clean += ext;
  }
  await scoped(req, (t) => t.run('UPDATE safe_items SET name = ? WHERE id = ?', [clean, item.id]));
  db.auditLog(req.user.id, 'SAFE_RENAME', 'safe_item', item.id, `${item.name} -> ${clean}`, req.ip);
  res.json({ success: true, data: { name: clean } });
}));

// ── Download / Inline-Vorschau ──────────────────────────────────────────────
router.get('/:projectId/item/:id/download', authenticate, wrap(async (req, res) => {
  if (!(await guardRead(req, res))) return;
  const item = await scoped(req, (t) => t.get('SELECT * FROM safe_items WHERE id = ? AND project_id = ?', [req.params.id, req.params.projectId]));
  if (!item || item.is_folder || !item.storage_key) return res.status(404).json({ success: false, error: 'Datei nicht gefunden' });
  const buf = await getStorage().get(item.storage_key);
  const inline = !!req.query.inline;
  db.activityLog(req.user.id, inline ? 'SAFE_VIEW' : 'SAFE_DOWNLOAD', 'safe_item', item.id, req.ip);
  await logSafeAccess(req, Number(req.params.projectId), item.id, inline ? 'view' : 'download');
  res.setHeader('Content-Type', item.mime || 'application/octet-stream');
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(item.name)}"`);
  res.send(buf);
}));

// Sichere Vorschau: PDFs werden mit Wasserzeichen auf den Betrachter gestempelt
// und nur zur Ansicht (inline) ausgeliefert. Andere Dateitypen unverändert inline.
// Zählt als Ansicht in der Zugriffs-Dokumentation.
router.get('/:projectId/item/:id/preview', authenticate, wrap(async (req, res) => {
  if (!(await guardRead(req, res))) return;
  const item = await scoped(req, (t) => t.get('SELECT * FROM safe_items WHERE id = ? AND project_id = ?', [req.params.id, req.params.projectId]));
  if (!item || item.is_folder || !item.storage_key) return res.status(404).json({ success: false, error: 'Datei nicht gefunden' });
  let buf = await getStorage().get(item.storage_key);
  const isPdf = (item.mime || '').includes('pdf') || /\.pdf$/i.test(item.name || '');
  if (isPdf) {
    try {
      const { addWatermark } = require('../utils/watermark');
      buf = await addWatermark(buf, { name: `${req.user.first_name} ${req.user.last_name}`, email: req.user.email });
    } catch (e) { console.warn('Safe-Vorschau Wasserzeichen fehlgeschlagen:', e.message); }
  }
  db.activityLog(req.user.id, 'SAFE_VIEW', 'safe_item', item.id, req.ip);
  await logSafeAccess(req, Number(req.params.projectId), item.id, 'view');
  res.setHeader('Content-Type', item.mime || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(item.name)}"`);
  res.send(buf);
}));

// Zugriffsbericht (nur Pflegende/Admin): wer hat welche Datei wie oft angesehen
// oder heruntergeladen, und wann zuletzt.
router.get('/:projectId/access-report', authenticate, wrap(async (req, res) => {
  if (!(await canManage(req, req.params.projectId))) {
    return res.status(403).json({ success: false, error: 'Nur Pflegende sehen den Zugriffsbericht.' });
  }
  const projectId = req.params.projectId;
  const perUser = await scoped(req, (t) => t.all(`
    SELECT l.user_id, u.first_name || ' ' || u.last_name AS name, u.email, u.role,
           COUNT(*) FILTER (WHERE l.action = 'view')::int     AS views,
           COUNT(*) FILTER (WHERE l.action = 'download')::int AS downloads,
           COUNT(DISTINCT l.item_id)::int                     AS documents,
           MAX(l.created_at) AS last_access
    FROM safe_access_log l LEFT JOIN users u ON u.id = l.user_id
    WHERE l.project_id = ? GROUP BY l.user_id, u.first_name, u.last_name, u.email, u.role
    ORDER BY last_access DESC NULLS LAST`, [projectId]));
  const perItem = await scoped(req, (t) => t.all(`
    SELECT l.item_id, s.name,
           COUNT(*) FILTER (WHERE l.action = 'view')::int     AS views,
           COUNT(*) FILTER (WHERE l.action = 'download')::int AS downloads,
           COUNT(DISTINCT l.user_id)::int                     AS users,
           MAX(l.created_at) AS last_access
    FROM safe_access_log l LEFT JOIN safe_items s ON s.id = l.item_id
    WHERE l.project_id = ? GROUP BY l.item_id, s.name
    ORDER BY (COUNT(*) FILTER (WHERE l.action = 'download')) DESC, views DESC`, [projectId]));
  const recent = await scoped(req, (t) => t.all(`
    SELECT l.created_at, l.action, s.name AS item_name,
           u.first_name || ' ' || u.last_name AS user_name, u.email
    FROM safe_access_log l LEFT JOIN safe_items s ON s.id = l.item_id LEFT JOIN users u ON u.id = l.user_id
    WHERE l.project_id = ? ORDER BY l.created_at DESC LIMIT 100`, [projectId]));
  res.json({ success: true, data: { per_user: perUser, per_item: perItem, recent } });
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

// Eine Safe-Datei in den Datenraum (documents) materialisieren. Dublettenschutz
// über den Dateinamen je Mandat, damit Sammel-Übernahmen nichts doppeln.
async function materializeToDocument(req, projectId, item, accessLevel, desc) {
  if (!item || item.is_folder || !item.storage_key) return { skipped: 'keine Datei' };
  const dup = await scoped(req, (t) => t.get('SELECT id FROM documents WHERE project_id = ? AND filename = ?', [projectId, item.name]));
  if (dup) return { skipped: 'bereits im Datenraum', document_id: dup.id };
  const buf = await getStorage().get(item.storage_key);
  const dir = path.join(DOC_UPLOAD_DIR, `project_${projectId}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(item.name).toLowerCase();
  const base = path.basename(item.name, ext).replace(/[^a-zA-Z0-9_\-\.äöüÄÖÜ]/g, '_').substring(0, 60);
  const diskPath = path.join(dir, `${base}_${Date.now()}${ext}`);
  fs.writeFileSync(diskPath, buf);
  const docId = await scoped(req, (t) => t.insert(
    `INSERT INTO documents (project_id, filename, file_type, file_size, access_level, description, uploaded_by, file_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [projectId, item.name, item.mime || 'application/octet-stream', item.size, accessLevel, desc || '', req.user.id, diskPath]));
  return { document_id: docId };
}

router.post('/:projectId/item/:id/publish', authenticate, wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  const item = await scoped(req, (t) => t.get('SELECT * FROM safe_items WHERE id = ? AND project_id = ? AND deleted_at IS NULL', [req.params.id, req.params.projectId]));
  if (!item || item.is_folder || !item.storage_key) return res.status(404).json({ success: false, error: 'Datei nicht gefunden' });
  const access_level = ['public', 'nda', 'approved'].includes(req.body.access_level) ? req.body.access_level : 'nda';
  const r = await materializeToDocument(req, req.params.projectId, item, access_level, req.body.description);
  if (r.skipped && !r.document_id) return res.status(400).json({ success: false, error: r.skipped });
  db.auditLog(req.user.id, 'SAFE_PUBLISH', 'document', r.document_id, `${item.name} (${access_level}) aus Safe`, req.ip);
  res.json({ success: true, data: { document_id: r.document_id, access_level, skipped: r.skipped || null } });
}));

// Sammel-Übernahme in den Datenraum: ein ganzer Ordner (rekursiv) oder alles.
router.post('/:projectId/publish-bulk', authenticate, wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  const projectId = req.params.projectId;
  const access_level = ['public', 'nda', 'approved'].includes(req.body.access_level) ? req.body.access_level : 'nda';
  let files;
  if (req.body.all) {
    files = await scoped(req, (t) => t.all(
      'SELECT * FROM safe_items WHERE project_id = ? AND is_folder = 0 AND deleted_at IS NULL AND storage_key IS NOT NULL', [projectId]));
  } else if (req.body.item_id) {
    const folder = await scoped(req, (t) => t.get('SELECT id, is_folder FROM safe_items WHERE id = ? AND project_id = ? AND deleted_at IS NULL', [req.body.item_id, projectId]));
    if (!folder || !folder.is_folder) return res.status(400).json({ success: false, error: 'Kein Ordner angegeben' });
    const ids = await descendantIds(req, projectId, folder.id);
    if (!ids.length) return res.json({ success: true, data: { published: 0, skipped: 0 } });
    files = await scoped(req, (t) => t.all(
      `SELECT * FROM safe_items WHERE project_id = ? AND is_folder = 0 AND deleted_at IS NULL AND storage_key IS NOT NULL AND id IN (${ids.map(() => '?').join(',')})`,
      [projectId, ...ids]));
  } else {
    return res.status(400).json({ success: false, error: 'Weder Ordner noch „alles" angegeben' });
  }
  let published = 0, skipped = 0;
  for (const f of files) {
    const r = await materializeToDocument(req, projectId, f, access_level, '');
    if (r.document_id && !r.skipped) published += 1; else skipped += 1;
  }
  db.auditLog(req.user.id, 'SAFE_PUBLISH_BULK', 'project', projectId, `${published} übernommen, ${skipped} übersprungen (${access_level})`, req.ip);
  res.json({ success: true, data: { published, skipped } });
}));

// ── Speicherverbrauch (Mandat) ──────────────────────────────────────────────
router.get('/:projectId/usage', authenticate, wrap(async (req, res) => {
  if (!(await guardRead(req, res))) return;
  const r = await scoped(req, (t) => t.get(
    `SELECT COUNT(*) FILTER (WHERE is_folder = 0)::int AS files,
            COUNT(*) FILTER (WHERE is_folder = 1)::int AS folders,
            COALESCE(SUM(size) FILTER (WHERE is_folder = 0), 0)::bigint AS bytes
     FROM safe_items WHERE project_id = ? AND deleted_at IS NULL`, [req.params.projectId]));
  res.json({ success: true, data: { files: r.files, folders: r.folders, bytes: Number(r.bytes) } });
}));

// ── Datenraum-Freigaben (Drooms-Modell): je Datei/Ordner an Person oder Gruppe ─
const SUBJECT_TYPES = ['user', 'buyer_group', 'party_all', 'group'];
const BUYER_GROUPS = [
  ['strategic', 'Strategen'], ['financial', 'Finanzinvestoren / PE'], ['business_angel', 'Business Angels'],
  ['venture_capital', 'Venture Capital'], ['family_office', 'Family Offices'], ['successor', 'Nachfolger'],
  ['private', 'Privat'], ['advisor_mandate', 'Berater mit Mandat'],
];

// Freigaben eines Items lesen + Auswahllisten (Beteiligte, Käufergruppen, eigene Gruppen)
router.get('/:projectId/item/:id/grants', authenticate, wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  const projectId = req.params.projectId;
  const item = await scoped(req, (t) => t.get('SELECT id, name, is_folder FROM safe_items WHERE id = ? AND project_id = ?', [req.params.id, projectId]));
  if (!item) return res.status(404).json({ success: false, error: 'Objekt nicht gefunden' });
  const grants = await scoped(req, (t) => t.all(`
    SELECT sg.id, sg.subject_type, sg.subject_ref, sg.level,
           u.first_name || ' ' || u.last_name AS user_name, u.email AS user_email,
           g.name AS group_name
    FROM safe_grants sg
    LEFT JOIN users u ON sg.subject_type = 'user' AND u.id = sg.subject_ref::int
    LEFT JOIN safe_groups g ON sg.subject_type = 'group' AND g.id = sg.subject_ref::int
    WHERE sg.item_id = ? ORDER BY sg.created_at`, [item.id]));
  const parties = await scoped(req, (t) => t.all(`
    SELECT u.id, u.first_name || ' ' || u.last_name AS name, u.email
    FROM interests i JOIN users u ON u.id = i.buyer_id
    WHERE i.project_id = ? AND i.stage <> 'rejected' ORDER BY name`, [projectId]));
  const groups = await scoped(req, (t) => t.all(`
    SELECT g.id, g.name, (SELECT COUNT(*)::int FROM safe_group_members m WHERE m.group_id = g.id) AS members
    FROM safe_groups g WHERE g.project_id = ? ORDER BY g.name`, [projectId]));
  res.json({ success: true, data: { item: { id: item.id, name: item.name, is_folder: item.is_folder === 1 }, grants, parties, groups, buyer_groups: BUYER_GROUPS } });
}));

router.post('/:projectId/item/:id/grants', authenticate, wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  const { subject_type } = req.body;
  const level = ['read', 'download'].includes(req.body.level) ? req.body.level : 'read';
  if (!SUBJECT_TYPES.includes(subject_type)) return res.status(400).json({ success: false, error: 'Ungültiger Empfängertyp' });
  const item = await scoped(req, (t) => t.get('SELECT id FROM safe_items WHERE id = ? AND project_id = ?', [req.params.id, req.params.projectId]));
  if (!item) return res.status(404).json({ success: false, error: 'Objekt nicht gefunden' });
  const ref = subject_type === 'party_all' ? null : String(req.body.subject_ref || '');
  if (subject_type !== 'party_all' && !ref) return res.status(400).json({ success: false, error: 'Empfänger fehlt' });
  await scoped(req, (t) => t.run(`
    INSERT INTO safe_grants (tenant_id, project_id, item_id, subject_type, subject_ref, level, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (item_id, subject_type, subject_ref) DO UPDATE SET level = EXCLUDED.level`,
    [req.tenantId || 1, req.params.projectId, item.id, subject_type, ref, level, req.user.id]));
  db.auditLog(req.user.id, 'SAFE_GRANT_SET', 'safe_item', item.id, `${subject_type}:${ref || 'alle'} (${level})`, req.ip);
  res.status(201).json({ success: true, data: { message: 'Freigabe gesetzt' } });
}));

router.delete('/:projectId/item/:id/grants/:grantId', authenticate, wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  await scoped(req, (t) => t.run('DELETE FROM safe_grants WHERE id = ? AND item_id = ?', [req.params.grantId, req.params.id]));
  db.auditLog(req.user.id, 'SAFE_GRANT_REMOVED', 'safe_item', req.params.id, `Freigabe #${req.params.grantId}`, req.ip);
  res.json({ success: true, data: { message: 'Freigabe entfernt' } });
}));

// Eigene Gruppen je Mandat
router.get('/:projectId/groups', authenticate, wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  const groups = await scoped(req, (t) => t.all(`
    SELECT g.id, g.name FROM safe_groups g WHERE g.project_id = ? ORDER BY g.name`, [req.params.projectId]));
  for (const g of groups) {
    g.members = await scoped(req, (t) => t.all(`
      SELECT u.id, u.first_name || ' ' || u.last_name AS name, u.email
      FROM safe_group_members m JOIN users u ON u.id = m.user_id WHERE m.group_id = ? ORDER BY name`, [g.id]));
  }
  res.json({ success: true, data: groups });
}));

router.post('/:projectId/groups', authenticate, wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  const name = String(req.body.name || '').trim().slice(0, 120);
  if (!name) return res.status(400).json({ success: false, error: 'Name fehlt' });
  const id = await scoped(req, (t) => t.insert(
    `INSERT INTO safe_groups (tenant_id, project_id, name, created_by) VALUES (?, ?, ?, ?)`,
    [req.tenantId || 1, req.params.projectId, name, req.user.id]));
  res.status(201).json({ success: true, data: { id, name } });
}));

router.delete('/:projectId/groups/:groupId', authenticate, wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  await scoped(req, (t) => t.run('DELETE FROM safe_groups WHERE id = ? AND project_id = ?', [req.params.groupId, req.params.projectId]));
  res.json({ success: true, data: { message: 'Gruppe entfernt' } });
}));

router.post('/:projectId/groups/:groupId/members', authenticate, wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  const userId = Number(req.body.user_id);
  if (!userId) return res.status(400).json({ success: false, error: 'user_id fehlt' });
  await scoped(req, (t) => t.run(
    `INSERT INTO safe_group_members (tenant_id, group_id, user_id) VALUES (?, ?, ?) ON CONFLICT (group_id, user_id) DO NOTHING`,
    [req.tenantId || 1, req.params.groupId, userId]));
  res.status(201).json({ success: true, data: { message: 'Mitglied hinzugefügt' } });
}));

router.delete('/:projectId/groups/:groupId/members/:userId', authenticate, wrap(async (req, res) => {
  if (!(await guard(req, res))) return;
  await scoped(req, (t) => t.run('DELETE FROM safe_group_members WHERE group_id = ? AND user_id = ?', [req.params.groupId, req.params.userId]));
  res.json({ success: true, data: { message: 'Mitglied entfernt' } });
}));

module.exports = router;
