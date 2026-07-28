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

module.exports = router;
