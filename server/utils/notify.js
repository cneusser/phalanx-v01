// ─────────────────────────────────────────────────────────────────────────────
// Sprint 18 — Engagement-Mailings.
//   • Auto-Folgen bei Interesse (Watchlist, source='auto') + manueller Stern
//   • Änderungs-Mails an Follower (Publish, Deal-Status, Exposé, Mandatspflege)
//   • Newsletter zu neuen Mandaten
//   • Tag-/Kriterien-basierte Ähnlichkeitsvorschläge aus dem Interesse-Funnel
//
// WICHTIG — keine Doppel-Mails: beim Veröffentlichen läuft eine Kaskade
//   1) Suchprofil-Treffer (Sprint 10, bereits vorhanden)
//   2) Ähnlichkeitsvorschlag (nur wer noch nicht in 1 war)
//   3) Newsletter (nur wer noch nicht in 1 oder 2 war)
// Jeder Nutzer erhält pro Veröffentlichung höchstens EINE Mail.
//
// Alle Funktionen sind defensiv: eine fehlgeschlagene Benachrichtigung darf den
// auslösenden Prozess (Publish, Statuswechsel) niemals brechen.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db/database');

// Standard: alles an. Fehlt die Zeile, gelten die Defaults.
const DEFAULT_PREFS = { newsletter: 1, newsletter_freq: 'instant', follow_updates: 1, similar_suggestions: 1 };

async function prefsFor(userId) {
  try {
    const r = await db.get(`SELECT * FROM notification_prefs WHERE user_id = ?`, [userId]);
    return r ? { ...DEFAULT_PREFS, ...r } : { ...DEFAULT_PREFS };
  } catch { return { ...DEFAULT_PREFS }; }
}

// Empfängerfähige Nutzer (kein Staff, aktiv, verifiziert)
const MAILABLE = `role NOT IN ('super_admin','advisor') AND is_active = 1 AND email_verified = 1`;

// ── Folgen ──────────────────────────────────────────────────────────────────
// Bei Interesse/NDA automatisch folgen (idempotent; überschreibt kein manuelles Folgen).
async function autoFollow(userId, projectId, tenantId = 1) {
  if (!userId || !projectId) return;
  try {
    await db.run(
      `INSERT INTO watchlist (tenant_id, user_id, project_id, source)
       VALUES (?, ?, ?, 'auto')
       ON CONFLICT (user_id, project_id) DO NOTHING`,
      [tenantId || 1, userId, projectId]);
  } catch (e) { console.warn('[notify.autoFollow]', e.message); }
}

// Alle Follower eines Mandats: Watchlist + alle mit Interesse (ohne Absagen).
async function followerIds(projectId) {
  try {
    const rows = await db.all(`
      SELECT DISTINCT uid FROM (
        SELECT user_id AS uid FROM watchlist WHERE project_id = ?
        UNION
        SELECT buyer_id AS uid FROM interests WHERE project_id = ? AND stage <> 'rejected'
      ) q`, [projectId, projectId]);
    return rows.map(r => r.uid).filter(Boolean);
  } catch { return []; }
}

// ── Änderungs-Mail an Follower ──────────────────────────────────────────────
async function notifyFollowers(projectId, { title, message, ctaLabel = 'Mandat ansehen', exclude = new Set() } = {}) {
  try {
    const project = await db.get(`SELECT id, codename FROM projects WHERE id = ?`, [projectId]);
    if (!project || !title) return new Set();
    const ids = (await followerIds(projectId)).filter(id => !exclude.has(id));
    if (!ids.length) return new Set();

    // ids stammen ausschließlich aus der DB (Zahlen) → sichere IN-Liste
    const ph = ids.map(() => '?').join(',');
    const users = await db.all(
      `SELECT id, email, first_name FROM users WHERE id IN (${ph}) AND ${MAILABLE}`, ids);
    const { sendProcessUpdateEmail } = require('../utils/email');
    const notified = new Set();
    for (const u of users) {
      const p = await prefsFor(u.id);
      if (!p.follow_updates) continue;
      sendProcessUpdateEmail({
        to: u.email, firstName: u.first_name,
        title: `${title} — ${project.codename}`,
        message,
        ctaLabel, ctaPath: `/projekte/${project.id}`,
      }).catch(() => {});
      notified.add(u.id);
    }
    return notified;
  } catch (e) { console.warn('[notify.notifyFollowers]', e.message); return new Set(); }
}

// ── Ähnlichkeit ─────────────────────────────────────────────────────────────
// Score: Branche 3, Region 2, Mandatstyp 1, Umsatzband 1, Deal-Art 1.
function similarityScore(a, b) {
  let s = 0;
  if (a.industry && a.industry === b.industry) s += 3;
  if (a.region && a.region === b.region) s += 2;
  if (a.mandate_type && a.mandate_type === b.mandate_type) s += 1;
  if (a.revenue_band && a.revenue_band !== '—' && a.revenue_band === b.revenue_band) s += 1;
  if (a.deal_type && a.deal_type === b.deal_type) s += 1;
  return s;
}

// Ähnliche Mandate zu einem Mandat (für Marktplatz/Mandatsseite).
async function similarProjects(projectId, limit = 4) {
  try {
    const p = await db.get(
      `SELECT id, industry, region, mandate_type, revenue_band, deal_type FROM projects WHERE id = ?`, [projectId]);
    if (!p) return [];
    const others = await db.all(
      `SELECT id, codename, industry, region, revenue_band, ebitda_band, deal_type, mandate_type, sector_emoji, short_description
       FROM projects WHERE status = 'active' AND id <> ?`, [projectId]);
    return others
      .map(o => ({ ...o, score: similarityScore(p, o) }))
      .filter(o => o.score >= 2)                  // mind. Branche ODER Region
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (e) { console.warn('[notify.similarProjects]', e.message); return []; }
}

// Interesse-Profil eines Nutzers: woran hat er bisher Interesse gezeigt?
// (Watchlist + Interessen → Branchen/Regionen/Mandatstypen)
async function userInterestSignals(userId) {
  try {
    const rows = await db.all(`
      SELECT p.industry, p.region, p.mandate_type, p.revenue_band, p.deal_type
      FROM projects p
      WHERE p.id IN (
        SELECT project_id FROM watchlist WHERE user_id = ?
        UNION SELECT project_id FROM interests WHERE buyer_id = ? AND stage <> 'rejected'
      )`, [userId, userId]);
    return rows;
  } catch { return []; }
}

// Nutzer auf ein NEUES, ähnliches Mandat hinweisen — auf Basis ihres Interesse-Funnels.
async function notifySimilarInterested(projectId, exclude = new Set()) {
  const notified = new Set();
  try {
    const p = await db.get(
      `SELECT id, codename, industry, region, mandate_type, revenue_band, deal_type, short_description
       FROM projects WHERE id = ?`, [projectId]);
    if (!p) return notified;

    // Kandidaten: alle, die irgendwo Interesse/Watchlist haben (aber nicht bei DIESEM Mandat)
    const cand = await db.all(`
      SELECT DISTINCT u.id, u.email, u.first_name
      FROM users u
      WHERE ${MAILABLE}
        AND u.id IN (
          SELECT user_id FROM watchlist
          UNION SELECT buyer_id FROM interests WHERE stage <> 'rejected'
        )
        AND u.id NOT IN (
          SELECT user_id FROM watchlist WHERE project_id = ?
          UNION SELECT buyer_id FROM interests WHERE project_id = ?
        )`, [projectId, projectId]);

    const { sendProcessUpdateEmail } = require('../utils/email');
    for (const u of cand) {
      if (exclude.has(u.id)) continue;
      const prefs = await prefsFor(u.id);
      if (!prefs.similar_suggestions) continue;

      const signals = await userInterestSignals(u.id);
      if (!signals.length) continue;
      const best = Math.max(0, ...signals.map(s => similarityScore(s, p)));
      if (best < 3) continue; // mind. Branchentreffer

      sendProcessUpdateEmail({
        to: u.email, firstName: u.first_name,
        title: `Ähnliches Mandat verfügbar — ${p.codename}`,
        message: `auf Basis der Mandate, für die Sie sich bisher interessiert haben, könnte dieses neue Mandat zu Ihnen passen:<br/><br/>` +
          `<strong>${p.codename}</strong> — ${[p.industry, p.region].filter(Boolean).join(', ')}` +
          `${p.revenue_band && p.revenue_band !== '—' ? ' · Umsatz ' + p.revenue_band : ''}<br/>` +
          `<span style="color:#555;">${(p.short_description || '').slice(0, 220)}…</span>`,
        ctaLabel: 'Mandat ansehen', ctaPath: `/projekte/${p.id}`,
      }).catch(() => {});
      notified.add(u.id);
    }
  } catch (e) { console.warn('[notify.notifySimilarInterested]', e.message); }
  return notified;
}

// ── Newsletter: neues Mandat an alle Abonnenten (die noch keine Mail bekamen) ─
async function notifyNewsletter(projectId, exclude = new Set()) {
  const notified = new Set();
  try {
    const p = await db.get(
      `SELECT id, codename, industry, region, revenue_band, mandate_type, short_description
       FROM projects WHERE id = ?`, [projectId]);
    if (!p) return notified;

    const users = await db.all(`SELECT id, email, first_name FROM users WHERE ${MAILABLE}`);
    const { sendProcessUpdateEmail } = require('../utils/email');
    for (const u of users) {
      if (exclude.has(u.id)) continue;
      const prefs = await prefsFor(u.id);
      if (!prefs.newsletter || prefs.newsletter_freq === 'off') continue;

      sendProcessUpdateEmail({
        to: u.email, firstName: u.first_name,
        title: `Neues Mandat im Marktplatz — ${p.codename}`,
        message: `ein neues ${p.mandate_type === 'fundraising' ? 'Finanzierungs-' : 'Transaktions-'}Mandat ist verfügbar:<br/><br/>` +
          `<strong>${p.codename}</strong> — ${[p.industry, p.region].filter(Boolean).join(', ')}` +
          `${p.revenue_band && p.revenue_band !== '—' ? ' · Umsatz ' + p.revenue_band : ''}<br/>` +
          `<span style="color:#555;">${(p.short_description || '').slice(0, 220)}…</span><br/><br/>` +
          `<span style="font-size:12px;color:#888;">Sie erhalten diese Nachricht, weil Sie den Newsletter zu neuen Mandaten abonniert haben. ` +
          `Sie können ihn jederzeit in Ihrem Profil unter „Benachrichtigungen" abbestellen.</span>`,
        ctaLabel: 'Mandat ansehen', ctaPath: `/projekte/${p.id}`,
      }).catch(() => {});
      notified.add(u.id);
    }
  } catch (e) { console.warn('[notify.notifyNewsletter]', e.message); }
  return notified;
}

// ── Orchestrierung beim Veröffentlichen (Anti-Doppel-Mail-Kaskade) ──────────
// alreadyNotified = Nutzer, die bereits über ihr Suchprofil informiert wurden.
async function notifyProjectPublished(projectId, alreadyNotified = new Set()) {
  try {
    const seen = new Set(alreadyNotified);
    const sim = await notifySimilarInterested(projectId, seen);
    sim.forEach(id => seen.add(id));
    const news = await notifyNewsletter(projectId, seen);
    news.forEach(id => seen.add(id));
    console.log(`📣 Publish-Benachrichtigung Mandat ${projectId}: ${alreadyNotified.size} Suchprofil, ${sim.size} Ähnlichkeit, ${news.size} Newsletter`);
  } catch (e) { console.warn('[notify.notifyProjectPublished]', e.message); }
}

module.exports = {
  DEFAULT_PREFS, prefsFor, autoFollow, followerIds, notifyFollowers,
  similarityScore, similarProjects, notifySimilarInterested, notifyNewsletter, notifyProjectPublished,
};
