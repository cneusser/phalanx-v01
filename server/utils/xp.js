// ─────────────────────────────────────────────────────────────────────────────
// Sprint 17: Gamification / XP.
// Vergibt Punkte für ECHTE Prozessschritte (nicht bloßes Klicken) und für die
// Abwicklung von Deals über die Plattform. Idempotent je (user, action, ref).
// Läuft auf der Default-Tenant-Verbindung; alle Funktionen sind defensiv.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db/database');

// Punktwerte (final kalibrierbar). Große Boni für Deal-Fortschritt/Abschluss.
const POINTS = {
  PROFILE_VERIFIED:    10,  // E-Mail bestätigt / Profil vollständig
  WATCHLIST_ADD:        5,  // Mandat gemerkt
  CONNECTION_MADE:     10,  // Kontakt/Intro zustande gekommen
  INTEREST_EXPRESSED:  15,  // Interesse bekundet / NDA angefragt
  NDA_SIGNED:          40,  // NDA unterzeichnet
  DATAROOM_GRANTED:    25,  // Datenraum freigeschaltet
  QA_ASKED:            10,  // aktive Teilnahme (Frage im Q&A)
  DEAL_LOI:            75,  // Absichtserklärung erreicht
  DEAL_CLOSED:        300,  // Deal über die Plattform abgewickelt (Kernziel)
};

// Level-Schwellen (kumulierte XP).
const LEVELS = [
  { min: 0,   name: 'Entdecker' },
  { min: 75,  name: 'Insider' },
  { min: 250, name: 'Dealmaker' },
  { min: 600, name: 'Power-Dealmaker' },
  { min: 1200, name: 'Elite-Dealmaker' },
];

function levelFor(points) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (points >= LEVELS[i].min) idx = i;
  const current = LEVELS[idx];
  const next = LEVELS[idx + 1] || null;
  return {
    level: idx + 1,
    name: current.name,
    next: next ? next.name : null,
    next_at: next ? next.min : null,
    to_next: next ? Math.max(0, next.min - points) : 0,
    progress_pct: next ? Math.min(100, Math.round(((points - current.min) / (next.min - current.min)) * 100)) : 100,
  };
}

// Punkte vergeben (idempotent). ref sollte immer gesetzt sein (z. B. Projekt-Id).
async function award(userId, action, opts = {}) {
  const pts = POINTS[action];
  if (!userId || !pts) return;
  const { refType = 'user', refId = userId, tenantId = 1 } = opts;
  try {
    await db.run(
      `INSERT INTO xp_events (tenant_id, user_id, action, points, ref_type, ref_id)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, action, ref_type, ref_id) DO NOTHING`,
      [tenantId, userId, action, pts, refType, refId]);
  } catch (e) { console.warn('[xp.award]', e.message); }
}

// Punkte an mehrere Nutzer (z. B. alle beteiligten Käufer bei LOI/Closing).
async function awardMany(userIds, action, opts = {}) {
  for (const uid of (userIds || [])) await award(uid, action, opts);
}

// Alle Käufer mit signierter/freigegebener NDA an einem Projekt (für Deal-Boni).
async function activeBuyerIds(projectId) {
  try {
    const rows = await db.all(
      `SELECT DISTINCT user_id AS uid FROM nda_requests
       WHERE project_id = ? AND status IN ('signed','approved')`, [projectId]);
    return rows.map(r => r.uid);
  } catch { return []; }
}

// Punktestand + Level + jüngste Ereignisse eines Nutzers.
async function summary(userId) {
  try {
    const agg = await db.get(`SELECT COALESCE(SUM(points),0)::int AS total, COUNT(*)::int AS n FROM xp_events WHERE user_id = ?`, [userId]);
    const total = agg ? agg.total : 0;
    const recent = await db.all(
      `SELECT action, points, ref_type, ref_id, created_at FROM xp_events
       WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`, [userId]);
    return { total, count: agg ? agg.n : 0, ...levelFor(total), recent };
  } catch (e) {
    console.warn('[xp.summary]', e.message);
    return { total: 0, count: 0, ...levelFor(0), recent: [] };
  }
}

const ACTION_LABELS = {
  PROFILE_VERIFIED: 'Profil bestätigt',
  WATCHLIST_ADD: 'Mandat gemerkt',
  CONNECTION_MADE: 'Kontakt hergestellt',
  INTEREST_EXPRESSED: 'Interesse bekundet',
  NDA_SIGNED: 'NDA unterzeichnet',
  DATAROOM_GRANTED: 'Datenraum freigeschaltet',
  QA_ASKED: 'Frage gestellt',
  DEAL_LOI: 'Absichtserklärung (LOI)',
  DEAL_CLOSED: 'Deal abgeschlossen',
};

module.exports = { POINTS, LEVELS, levelFor, award, awardMany, activeBuyerIds, summary, ACTION_LABELS };
