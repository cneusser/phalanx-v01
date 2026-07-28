// ─────────────────────────────────────────────────────────────────────────────
// Nachfolge-Profil: der Nachfolge-Interessent pflegt sein Profil selbst.
// Grundlage für das spätere Matching gegen Nachfolge-Mandate (Fragebogen CH-NF-03).
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const wrap = require('../utils/asyncHandler');
const router = express.Router();

const ARRAYS = ['special_situations', 'ziel_laender', 'ziel_regionen', 'branchenfokus'];
const TEXTS = ['plz_ort', 'branchenerfahrung', 'funktionale_erfahrung', 'fuehrungserfahrung',
  'budgetverantwortung', 'umsatz_band', 'mbi_szenario', 'eigenkapital', 'verfuegbarkeit', 'bemerkungen'];
const UMSATZ = ['<1', '1-3', '3-10', '10-30', '>30'];
const MBI = ['reine_beteiligung', 'partnerschaft', 'operative_fuehrung', 'andere'];

function parseRow(row) {
  if (!row) return null;
  const out = { ...row };
  for (const a of ARRAYS) out[a] = JSON.parse(row[a] || '[]');
  return out;
}

const { SUCCESSION_DEAL_TYPES, scoreMatch } = require('../utils/successionMatch');

// Passende Nachfolge-Mandate für den eingeloggten Nachfolge-Interessenten
router.get('/matches', authenticate, wrap(async (req, res) => {
  const profile = parseRow(await db.get('SELECT * FROM succession_profiles WHERE user_id = ?', [req.user.id])) || {};
  const placeholders = SUCCESSION_DEAL_TYPES.map(() => '?').join(', ');
  const rows = await db.all(`
    SELECT id, codename, industry, region, revenue_band, revenue_class, ebitda_band, deal_type, short_description, sector_emoji, mandate_type
    FROM projects
    WHERE status = 'active' AND visibility = 'public' AND deal_type IN (${placeholders})`,
    SUCCESSION_DEAL_TYPES);
  const matches = rows
    .map(p => ({ ...p, ...scoreMatch(profile, p) }))
    .sort((a, b) => b.score - a.score);
  res.json({ success: true, data: { matches, has_profile: !!profile.id } });
}));

// ── Admin: Liste der Nachfolge-Interessierten mit Profil und Filtern ─────────
const { ADMIN_ROLES } = require('../middleware/gates');
function isStaff(req, res, next) {
  if (req.user && ADMIN_ROLES.includes(req.user.role)) return next();
  return res.status(403).json({ success: false, error: 'Nur für das Team.' });
}

const SUCCESSION_STAGES = ['neu', 'profil', 'vorgestellt', 'gespraech', 'vermittelt', 'kein_match'];

router.get('/interested', authenticate, isStaff, wrap(async (req, res) => {
  const { umsatz, szenario, q, stage } = req.query;
  const rows = await db.all(`
    SELECT u.id, u.salutation, u.title, u.first_name, u.last_name, u.email, u.company, u.succession_type,
           u.succession_stage, u.succession_note, u.created_at, u.is_approved, u.is_active,
           sp.plz_ort, sp.branchenfokus, sp.branchenerfahrung, sp.ziel_laender, sp.ziel_regionen,
           sp.umsatz_band, sp.mbi_szenario, sp.eigenkapital, sp.verfuegbarkeit, sp.fuehrungserfahrung,
           sp.updated_at AS profile_updated_at,
           (SELECT COUNT(*) FROM succession_links sl WHERE sl.user_id = u.id)::int AS link_count
    FROM users u
    LEFT JOIN succession_profiles sp ON sp.user_id = u.id
    WHERE u.role = 'buyer' AND u.buyer_type = 'successor'
    ORDER BY u.created_at DESC`);
  let list = rows.map(r => ({
    ...r,
    succession_stage: r.succession_stage || 'neu',
    branchenfokus: JSON.parse(r.branchenfokus || '[]'),
    ziel_laender: JSON.parse(r.ziel_laender || '[]'),
    ziel_regionen: JSON.parse(r.ziel_regionen || '[]'),
    has_profile: !!r.profile_updated_at,
  }));
  if (umsatz) list = list.filter(r => r.umsatz_band === umsatz);
  if (szenario) list = list.filter(r => r.mbi_szenario === szenario);
  if (stage) list = list.filter(r => r.succession_stage === stage);
  if (q) {
    const s = String(q).toLowerCase();
    list = list.filter(r =>
      [r.first_name, r.last_name, r.email, r.company, r.plz_ort, r.branchenerfahrung, ...(r.branchenfokus || []), ...(r.ziel_regionen || [])]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(s)));
  }
  // Trichter-Überblick: Anzahl je Stufe (immer über die Gesamtmenge, ohne Stufenfilter)
  const overview = {};
  for (const st of SUCCESSION_STAGES) overview[st] = 0;
  for (const r of rows) overview[(r.succession_stage || 'neu')] = (overview[(r.succession_stage || 'neu')] || 0) + 1;
  res.json({ success: true, data: { list, overview, stages: SUCCESSION_STAGES } });
}));

// Funnel-Status eines Nachfolge-Interessenten setzen (Team)
router.put('/interested/:userId/stage', authenticate, isStaff, wrap(async (req, res) => {
  if (!SUCCESSION_STAGES.includes(req.body.stage)) return res.status(400).json({ success: false, error: 'Ungültige Stufe' });
  const u = await db.get(`SELECT id FROM users WHERE id = ? AND role = 'buyer' AND buyer_type = 'successor'`, [req.params.userId]);
  if (!u) return res.status(404).json({ success: false, error: 'Nachfolge-Interessent nicht gefunden' });
  await db.run('UPDATE users SET succession_stage = ? WHERE id = ?', [req.body.stage, req.params.userId]);
  db.auditLog(req.user.id, 'SUCCESSION_STAGE_SET', 'user', req.params.userId, req.body.stage, req.ip);
  res.json({ success: true, data: { stage: req.body.stage } });
}));

// Interne Notiz je Nachfolge-Interessent (Team)
router.put('/interested/:userId/note', authenticate, isStaff, wrap(async (req, res) => {
  const u = await db.get(`SELECT id FROM users WHERE id = ? AND role = 'buyer' AND buyer_type = 'successor'`, [req.params.userId]);
  if (!u) return res.status(404).json({ success: false, error: 'Nachfolge-Interessent nicht gefunden' });
  const note = req.body.note == null ? null : String(req.body.note).slice(0, 4000);
  await db.run('UPDATE users SET succession_note = ? WHERE id = ?', [note, req.params.userId]);
  db.auditLog(req.user.id, 'SUCCESSION_NOTE_SET', 'user', req.params.userId, null, req.ip);
  res.json({ success: true, data: { note } });
}));

// Eigenes Nachfolge-Profil lesen
router.get('/profile', authenticate, wrap(async (req, res) => {
  const row = await db.get('SELECT * FROM succession_profiles WHERE user_id = ?', [req.user.id]);
  res.json({ success: true, data: parseRow(row) });
}));

// Eigenes Nachfolge-Profil anlegen oder aktualisieren
router.put('/profile', authenticate, wrap(async (req, res) => {
  const b = req.body || {};
  if (b.umsatz_band && !UMSATZ.includes(b.umsatz_band)) return res.status(400).json({ success: false, error: 'Ungültiges Umsatzband' });
  if (b.mbi_szenario && !MBI.includes(b.mbi_szenario)) return res.status(400).json({ success: false, error: 'Ungültiges MBI-Szenario' });

  const vals = {};
  for (const t of TEXTS) if (b[t] !== undefined) vals[t] = b[t] == null ? null : String(b[t]).slice(0, 4000);
  for (const a of ARRAYS) if (b[a] !== undefined) vals[a] = JSON.stringify(Array.isArray(b[a]) ? b[a].map(String) : []);

  const existing = await db.get('SELECT id FROM succession_profiles WHERE user_id = ?', [req.user.id]);
  if (existing) {
    const keys = Object.keys(vals);
    if (keys.length) {
      const setSql = keys.map(k => `${k} = ?`).join(', ') + ', updated_at = now()';
      await db.run(`UPDATE succession_profiles SET ${setSql} WHERE user_id = ?`, [...keys.map(k => vals[k]), req.user.id]);
    }
  } else {
    const keys = Object.keys(vals);
    const cols = ['user_id', ...keys];
    const ph = cols.map(() => '?').join(', ');
    await db.run(`INSERT INTO succession_profiles (${cols.join(', ')}) VALUES (${ph})`, [req.user.id, ...keys.map(k => vals[k])]);
  }
  db.auditLog(req.user.id, 'SUCCESSION_PROFILE_SAVED', 'user', req.user.id, null, req.ip);
  const row = await db.get('SELECT * FROM succession_profiles WHERE user_id = ?', [req.user.id]);
  res.json({ success: true, data: parseRow(row) });
}));

// ── Kandidat-zu-Mandat-Verknüpfung (Mini-Funnel je Zuordnung) ───────────────
const LINK_STATUS = ['vorgeschlagen', 'vorgestellt', 'interesse', 'gespraech', 'abgesagt', 'vermittelt'];

// Auswahlliste: aktive Nachfolge-Mandate (für den Zuordnungs-Picker)
router.get('/mandates', authenticate, isStaff, wrap(async (req, res) => {
  const ph = SUCCESSION_DEAL_TYPES.map(() => '?').join(', ');
  const rows = await db.all(
    `SELECT id, codename, industry, region, revenue_band, deal_type
       FROM projects WHERE status = 'active' AND deal_type IN (${ph}) ORDER BY codename`, SUCCESSION_DEAL_TYPES);
  res.json({ success: true, data: rows });
}));

// Verknüpfungen eines Kandidaten
router.get('/interested/:userId/links', authenticate, isStaff, wrap(async (req, res) => {
  const rows = await db.all(`
    SELECT sl.id, sl.project_id, sl.status, sl.note, sl.created_at, sl.updated_at,
           p.codename, p.industry, p.region
    FROM succession_links sl JOIN projects p ON p.id = sl.project_id
    WHERE sl.user_id = ? ORDER BY sl.created_at DESC`, [req.params.userId]);
  res.json({ success: true, data: { links: rows, statuses: LINK_STATUS } });
}));

// Kandidat einem Mandat zuordnen
router.post('/interested/:userId/links', authenticate, isStaff, wrap(async (req, res) => {
  const projectId = Number(req.body.project_id);
  if (!projectId) return res.status(400).json({ success: false, error: 'project_id fehlt' });
  const u = await db.get(`SELECT id FROM users WHERE id = ? AND role = 'buyer' AND buyer_type = 'successor'`, [req.params.userId]);
  if (!u) return res.status(404).json({ success: false, error: 'Nachfolge-Interessent nicht gefunden' });
  const proj = await db.get('SELECT id FROM projects WHERE id = ?', [projectId]);
  if (!proj) return res.status(404).json({ success: false, error: 'Mandat nicht gefunden' });
  const dup = await db.get('SELECT id FROM succession_links WHERE user_id = ? AND project_id = ?', [req.params.userId, projectId]);
  if (dup) return res.status(409).json({ success: false, error: 'Dieser Kandidat ist dem Mandat bereits zugeordnet.' });
  const id = await db.insert(
    `INSERT INTO succession_links (tenant_id, user_id, project_id, status, created_by) VALUES (?, ?, ?, 'vorgeschlagen', ?)`,
    [req.tenantId || 1, req.params.userId, projectId, req.user.id]);
  db.auditLog(req.user.id, 'SUCCESSION_LINK_ADD', 'project', projectId, `Kandidat ${req.params.userId}`, req.ip);
  res.status(201).json({ success: true, data: { id } });
}));

// Verknüpfung ändern (Status/Notiz)
router.put('/links/:linkId', authenticate, isStaff, wrap(async (req, res) => {
  const link = await db.get('SELECT id FROM succession_links WHERE id = ?', [req.params.linkId]);
  if (!link) return res.status(404).json({ success: false, error: 'Verknüpfung nicht gefunden' });
  const sets = [], params = [];
  if (req.body.status !== undefined) {
    if (!LINK_STATUS.includes(req.body.status)) return res.status(400).json({ success: false, error: 'Ungültiger Status' });
    sets.push('status = ?'); params.push(req.body.status);
  }
  if (req.body.note !== undefined) { sets.push('note = ?'); params.push(req.body.note == null ? null : String(req.body.note).slice(0, 4000)); }
  if (!sets.length) return res.json({ success: true, data: { message: 'Nichts zu ändern' } });
  sets.push('updated_at = now()');
  params.push(req.params.linkId);
  await db.run(`UPDATE succession_links SET ${sets.join(', ')} WHERE id = ?`, params);
  db.auditLog(req.user.id, 'SUCCESSION_LINK_UPDATE', 'succession_link', req.params.linkId, req.body.status || null, req.ip);
  res.json({ success: true, data: { message: 'Gespeichert' } });
}));

// Verknüpfung entfernen
router.delete('/links/:linkId', authenticate, isStaff, wrap(async (req, res) => {
  await db.run('DELETE FROM succession_links WHERE id = ?', [req.params.linkId]);
  db.auditLog(req.user.id, 'SUCCESSION_LINK_DELETE', 'succession_link', req.params.linkId, null, req.ip);
  res.json({ success: true, data: { message: 'Entfernt' } });
}));

// ── Übergeber-Seite: passende Nachfolge-Kandidaten je Mandat ────────────────
// Sichtbar für Pfleger des Mandats (Übergeber) und das Team. Kontaktdaten der
// Kandidaten erst nach Freischaltung (spätere Bezahlstufe). Ohne Freischaltung
// nur Anzahl und anonyme Vorschau (Score, Branche, Region), keine Namen.
const access = require('../utils/projectAccess');

router.get('/mandate/:projectId/candidates', authenticate, wrap(async (req, res) => {
  const projectId = req.params.projectId;
  const p = await db.get('SELECT id, codename, industry, region, revenue_band, revenue_class, deal_type, succession_unlocked FROM projects WHERE id = ?', [projectId]);
  if (!p) return res.status(404).json({ success: false, error: 'Mandat nicht gefunden' });
  const mayManage = await access.canManage((sql, pr) => db.get(sql, pr), req.user, projectId);
  if (!mayManage) return res.status(403).json({ success: false, error: 'Nur für Pfleger dieses Mandats.' });
  if (!SUCCESSION_DEAL_TYPES.includes(p.deal_type)) {
    return res.json({ success: true, data: { is_succession: false, candidates: [], count: 0, unlocked: false } });
  }
  const { isStrongMatch } = require('../utils/successionMatch');
  const rows = await db.all(`
    SELECT u.id, u.salutation, u.title, u.first_name, u.last_name, u.email, u.company, u.succession_type,
           sp.branchenfokus, sp.ziel_laender, sp.ziel_regionen, sp.umsatz_band, sp.plz_ort,
           sp.fuehrungserfahrung, sp.branchenerfahrung, sp.eigenkapital, sp.verfuegbarkeit
    FROM users u JOIN succession_profiles sp ON sp.user_id = u.id
    WHERE u.role = 'buyer' AND u.buyer_type = 'successor' AND u.is_active = 1`);
  const unlocked = p.succession_unlocked === 1;
  const scored = rows.map(r => {
    const profile = {
      branchenfokus: JSON.parse(r.branchenfokus || '[]'),
      ziel_laender: JSON.parse(r.ziel_laender || '[]'),
      ziel_regionen: JSON.parse(r.ziel_regionen || '[]'),
      umsatz_band: r.umsatz_band,
    };
    const m = scoreMatch(profile, p);
    return { r, profile, ...m };
  }).filter(x => isStrongMatch(x)).sort((a, b) => b.score - a.score);

  const candidates = scored.map((x, i) => {
    const base = {
      score: x.score, reasons: x.reasons,
      succession_type: x.r.succession_type === 'mit_beteiligung' ? 'Mit Beteiligung' : x.r.succession_type === 'ohne_beteiligung' ? 'Ohne Beteiligung' : null,
      branchenfokus: (x.profile.branchenfokus || []).slice(0, 3),
      region: [...(x.profile.ziel_laender || []), ...(x.profile.ziel_regionen || [])].slice(0, 3),
      umsatz_band: x.r.umsatz_band || null,
      fuehrungserfahrung: x.r.fuehrungserfahrung || null,
    };
    if (unlocked) {
      return {
        ...base, unlocked: true,
        name: [x.r.salutation, x.r.title, x.r.first_name, x.r.last_name].filter(Boolean).join(' '),
        email: x.r.email, company: x.r.company || null, plz_ort: x.r.plz_ort || null,
        branchenerfahrung: x.r.branchenerfahrung || null, eigenkapital: x.r.eigenkapital || null,
        verfuegbarkeit: x.r.verfuegbarkeit || null,
      };
    }
    return { ...base, unlocked: false, label: `Kandidat ${i + 1}` };
  });
  res.json({ success: true, data: { is_succession: true, unlocked, count: candidates.length, codename: p.codename, candidates } });
}));

// Zugeordnete Kandidaten je Mandat (aus succession_links), für die Übergeber-Sicht.
// Gleiches Freischalt-Gate: ohne Freischaltung anonyme Vorschau, mit Namen erst danach.
router.get('/mandate/:projectId/links', authenticate, wrap(async (req, res) => {
  const projectId = req.params.projectId;
  const p = await db.get('SELECT id, succession_unlocked FROM projects WHERE id = ?', [projectId]);
  if (!p) return res.status(404).json({ success: false, error: 'Mandat nicht gefunden' });
  const mayManage = await access.canManage((sql, pr) => db.get(sql, pr), req.user, projectId);
  if (!mayManage) return res.status(403).json({ success: false, error: 'Nur für Pfleger dieses Mandats.' });
  const unlocked = p.succession_unlocked === 1;
  const rows = await db.all(`
    SELECT sl.id AS link_id, sl.status, sl.note, sl.created_at,
           u.salutation, u.title, u.first_name, u.last_name, u.email, u.company, u.succession_type,
           sp.branchenfokus, sp.ziel_laender, sp.ziel_regionen, sp.umsatz_band, sp.plz_ort,
           sp.fuehrungserfahrung, sp.eigenkapital, sp.verfuegbarkeit
    FROM succession_links sl
    JOIN users u ON u.id = sl.user_id
    LEFT JOIN succession_profiles sp ON sp.user_id = u.id
    WHERE sl.project_id = ? ORDER BY sl.created_at DESC`, [projectId]);
  const links = rows.map((r, i) => {
    const base = {
      link_id: r.link_id, status: r.status,
      succession_type: r.succession_type === 'mit_beteiligung' ? 'Mit Beteiligung' : r.succession_type === 'ohne_beteiligung' ? 'Ohne Beteiligung' : null,
      branchenfokus: JSON.parse(r.branchenfokus || '[]').slice(0, 3),
      region: [...JSON.parse(r.ziel_laender || '[]'), ...JSON.parse(r.ziel_regionen || '[]')].slice(0, 3),
      umsatz_band: r.umsatz_band || null, fuehrungserfahrung: r.fuehrungserfahrung || null,
    };
    if (unlocked) {
      return { ...base, unlocked: true,
        name: [r.salutation, r.title, r.first_name, r.last_name].filter(Boolean).join(' '),
        email: r.email, company: r.company || null, plz_ort: r.plz_ort || null,
        eigenkapital: r.eigenkapital || null, verfuegbarkeit: r.verfuegbarkeit || null };
    }
    return { ...base, unlocked: false, label: `Kandidat ${i + 1}` };
  });
  res.json({ success: true, data: { unlocked, count: links.length, links } });
}));

// Freischaltung setzen/aufheben (Team). Steht später für die Bezahlstufe.
router.post('/mandate/:projectId/unlock', authenticate, isStaff, wrap(async (req, res) => {
  const on = req.body.unlocked ? 1 : 0;
  const p = await db.get('SELECT id FROM projects WHERE id = ?', [req.params.projectId]);
  if (!p) return res.status(404).json({ success: false, error: 'Mandat nicht gefunden' });
  await db.run('UPDATE projects SET succession_unlocked = ? WHERE id = ?', [on, req.params.projectId]);
  db.auditLog(req.user.id, on ? 'SUCCESSION_UNLOCK' : 'SUCCESSION_LOCK', 'project', req.params.projectId, null, req.ip);
  res.json({ success: true, data: { unlocked: on === 1 } });
}));

module.exports = router;
