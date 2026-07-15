// ─────────────────────────────────────────────────────────────────────────────
// Sprint 10: Digest: täglicher/wöchentlicher Sammel-Versand neuer, zu einem
// Käufer-Suchprofil passender Mandate. Fällig anhand last_notified_at (self-
// healing über Server-Neustarts hinweg). „Sofort"-Profile werden bei Publish
// separat benachrichtigt (routes/admin.js), hier nur daily/weekly.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db/database');

const WINDOW = { daily: 24 * 3600 * 1000, weekly: 7 * 24 * 3600 * 1000 };
// Etwas Toleranz, damit ein knapp verfehlter Lauf nicht einen ganzen Zyklus wartet.
const DUE = { daily: 20 * 3600 * 1000, weekly: 6.5 * 24 * 3600 * 1000 };

function matches(c, p) {
  if (c.industry && c.industry !== p.industry) return false;
  if (c.region && c.region !== p.region) return false;
  if (c.deal_type && c.deal_type !== p.deal_type) return false;
  if (c.mandate_type && c.mandate_type !== p.mandate_type) return false;
  if (c.revenue_band && c.revenue_band !== p.revenue_band) return false;
  if (c.ebitda_band && c.ebitda_band !== p.ebitda_band) return false;
  if (c.search) { const s = String(c.search).toLowerCase(); if (!(`${p.codename} ${p.short_description || ''}`.toLowerCase().includes(s))) return false; }
  return true;
}

async function runDigests() {
  const now = Date.now();
  const profiles = await db.all(`
    SELECT sp.id, sp.name, sp.criteria_json, sp.notify_frequency, sp.last_notified_at,
           u.email, u.first_name, u.last_name
    FROM search_profiles sp JOIN users u ON u.id = sp.user_id
    WHERE sp.notify_frequency IN ('daily','weekly') AND u.is_active = 1`);
  if (!profiles.length) return 0;

  const { sendProcessUpdateEmail } = require('./email');
  let sent = 0;
  for (const prof of profiles) {
    const freq = prof.notify_frequency;
    const lastMs = prof.last_notified_at ? new Date(prof.last_notified_at).getTime() : 0;
    if (lastMs && (now - lastMs) < DUE[freq]) continue; // noch nicht fällig

    // Fenster: seit letzter Benachrichtigung, sonst ein Frequenz-Fenster zurück
    const sinceMs = lastMs || (now - WINDOW[freq]);
    let c = {}; try { c = JSON.parse(prof.criteria_json || '{}'); } catch {}
    const candidates = await db.all(
      `SELECT id, codename, industry, region, revenue_band, ebitda_band, deal_type, mandate_type, short_description, created_at
       FROM projects WHERE status = 'active' AND created_at > ? ORDER BY created_at DESC LIMIT 100`,
      [new Date(sinceMs).toISOString()]);
    const hits = candidates.filter(p => matches(c, p));

    if (hits.length) {
      const list = hits.slice(0, 15).map(p =>
        `<li style="margin-bottom:6px;"><strong>${p.codename}</strong>: ${[p.industry, p.region].filter(Boolean).join(', ')}${p.revenue_band && p.revenue_band !== 'k. A.' ? ' · Umsatz ' + p.revenue_band : ''}</li>`).join('');
      const freqLabel = freq === 'daily' ? 'täglichen' : 'wöchentlichen';
      sendProcessUpdateEmail({
        to: prof.email, firstName: prof.first_name, person: prof,
        title: `${hits.length} neue passende Mandate: Suchprofil „${prof.name}"`,
        message: `in Ihrem ${freqLabel} Überblick zum Suchprofil <strong>„${prof.name}"</strong> gibt es ${hits.length} neue${hits.length === 1 ? 's' : ''} passende${hits.length === 1 ? 's' : ''} Mandat${hits.length === 1 ? '' : 'e'}:<br/><ul style="margin:12px 0;padding-left:18px;">${list}</ul>`,
        ctaLabel: 'Im Marktplatz ansehen', ctaPath: '/projekte',
      }).catch(() => {});
      sent++;
    }
    // Fenster in jedem Fall vorschieben (auch ohne Treffer), damit nichts doppelt kommt
    await db.run(`UPDATE search_profiles SET last_notified_at = now() WHERE id = ?`, [prof.id]).catch(() => {});
  }
  return sent;
}

// Zeitgesteuerter Lauf: alle 60 Min prüfen, ob daily/weekly-Profile fällig sind.
function startScheduler() {
  if (process.env.DIGEST_ENABLED === '0') return;
  const tick = () => runDigests().then(n => { if (n) console.log(`📧 Digest-Lauf: ${n} Sammel-Mail(s) versendet`); }).catch(() => {});
  setTimeout(tick, 60 * 1000);          // kurz nach dem Start einmal
  setInterval(tick, 60 * 60 * 1000);    // danach stündlich
}

module.exports = { runDigests, startScheduler };
