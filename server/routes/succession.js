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
    SELECT id, codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, sector_emoji, mandate_type
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

router.get('/interested', authenticate, isStaff, wrap(async (req, res) => {
  const { umsatz, szenario, q } = req.query;
  const rows = await db.all(`
    SELECT u.id, u.salutation, u.title, u.first_name, u.last_name, u.email, u.company, u.succession_type, u.created_at,
           u.is_approved, u.is_active,
           sp.plz_ort, sp.branchenfokus, sp.branchenerfahrung, sp.ziel_laender, sp.ziel_regionen,
           sp.umsatz_band, sp.mbi_szenario, sp.eigenkapital, sp.verfuegbarkeit, sp.fuehrungserfahrung,
           sp.updated_at AS profile_updated_at
    FROM users u
    LEFT JOIN succession_profiles sp ON sp.user_id = u.id
    WHERE u.role = 'buyer' AND u.buyer_type = 'successor'
    ORDER BY u.created_at DESC`);
  let list = rows.map(r => ({
    ...r,
    branchenfokus: JSON.parse(r.branchenfokus || '[]'),
    ziel_laender: JSON.parse(r.ziel_laender || '[]'),
    ziel_regionen: JSON.parse(r.ziel_regionen || '[]'),
    has_profile: !!r.profile_updated_at,
  }));
  if (umsatz) list = list.filter(r => r.umsatz_band === umsatz);
  if (szenario) list = list.filter(r => r.mbi_szenario === szenario);
  if (q) {
    const s = String(q).toLowerCase();
    list = list.filter(r =>
      [r.first_name, r.last_name, r.email, r.company, r.plz_ort, r.branchenerfahrung, ...(r.branchenfokus || []), ...(r.ziel_regionen || [])]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(s)));
  }
  res.json({ success: true, data: list });
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

// ── Übergeber-Seite: passende Nachfolge-Kandidaten je Mandat ────────────────
// Sichtbar für Pfleger des Mandats (Übergeber) und das Team. Kontaktdaten der
// Kandidaten erst nach Freischaltung (spätere Bezahlstufe). Ohne Freischaltung
// nur Anzahl und anonyme Vorschau (Score, Branche, Region), keine Namen.
const access = require('../utils/projectAccess');

router.get('/mandate/:projectId/candidates', authenticate, wrap(async (req, res) => {
  const projectId = req.params.projectId;
  const p = await db.get('SELECT id, codename, industry, region, revenue_band, deal_type, succession_unlocked FROM projects WHERE id = ?', [projectId]);
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
