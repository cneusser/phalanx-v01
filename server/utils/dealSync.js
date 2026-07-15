// ─────────────────────────────────────────────────────────────────────────────
// v0.269: Nutzer-Interaktionen in den Deal-Funnel spiegeln.
//
// Der Funnel (crm_deal_parties) kennt CRM-Kontakte. Registrierte Nutzer, die eine
// NDA anfordern, ein Mandat beobachten oder Interesse zeigen, sind aber ebenso
// Teil des Deals, oft die heißesten Leads. Diese Datei baut die Brücke: Sie findet
// (oder legt) zur Nutzer-E-Mail einen CRM-Kontakt an und hält dazu eine Partei im
// Funnel auf der passenden Stufe.
//
// Leitplanken:
//   · Nur hochstufen, nie herunter (Math.max auf die Funnel-Stufe).
//   · Eine ausgestiegene Partei ('dropped') wird nicht reaktiviert.
//   · Eine aus der Ansprache stammende Partei ('outreach') behält ihre Herkunft.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db/database');

// Interesse-Stufe (dealStateMachine) → Funnel-Stufe (crm_deal_parties.funnel_stage)
const FUNNEL_FROM_INTEREST = {
  requested: 3, nda_pending: 3, nda_signed: 4,
  im_granted: 4, dataroom_granted: 4, loi: 6,
};

// Welche Funnel-Stufe und welches Signal löst ein Ereignis aus?
function planFor(kind, interestStage) {
  if (kind === 'interest') return { stage: FUNNEL_FROM_INTEREST[interestStage] ?? 2, signal: 'interest' };
  if (kind === 'watchlist') return { stage: 0, signal: 'watchlist' };
  if (kind === 'mailing') return { stage: 1, signal: 'mailing' };
  return { stage: 0, signal: kind || 'inbound' };
}

async function contactIdForUser(u, tenantId) {
  const email = String(u.email || '').trim();
  if (!email) return null;
  const found = await db.get('SELECT id FROM crm_contacts WHERE lower(email) = lower(?) LIMIT 1', [email]).catch(() => null);
  if (found) return found.id;
  // Registrierter Nutzer hat bei der Anmeldung eingewilligt → opt_in.
  return db.insert(
    `INSERT INTO crm_contacts (tenant_id, first_name, last_name, email, source, consent_status, created_by)
     VALUES (?, ?, ?, ?, 'inbound', 'opt_in', ?)`,
    [tenantId, u.first_name || '', u.last_name || email, email, u.id || null],
  ).catch(() => null);
}

/**
 * Spiegelt eine Nutzer-Interaktion in den Funnel.
 * @param {number} userId
 * @param {number} projectId
 * @param {object} opts { kind: 'interest'|'watchlist'|'mailing', interestStage?, actorId? }
 */
async function syncFromUser(userId, projectId, opts = {}) {
  try {
    if (!userId || !projectId) return;
    const u = await db.get('SELECT id, email, first_name, last_name FROM users WHERE id = ?', [userId]).catch(() => null);
    if (!u || !u.email) return;
    const proj = await db.get('SELECT tenant_id FROM projects WHERE id = ?', [projectId]).catch(() => null);
    const tenantId = proj?.tenant_id || 1;

    const contactId = await contactIdForUser(u, tenantId);
    if (!contactId) return;

    let { stage, signal } = planFor(opts.kind, opts.interestStage);
    // NDA-Feinabstimmung: „IM / Unterlagen" (Stufe 4) setzt eine unterschriebene NDA
    // voraus. Ist die NDA nur freigegeben, aber noch nicht gegengezeichnet, bleibt es
    // bei „NDA" (Stufe 3). So steht z. B. ein freigegebener, aber ungezeichneter
    // Interessent korrekt in der NDA-Spalte.
    if (opts.kind === 'interest' && stage >= 3) {
      const nda = await db.get(
        `SELECT signed_at, status FROM nda_requests WHERE user_id = ? AND project_id = ? ORDER BY id DESC LIMIT 1`,
        [userId, projectId]).catch(() => null);
      const signed = !!(nda && (nda.signed_at || nda.status === 'signed'));
      if (!signed && stage > 3) stage = 3;
      signal = 'nda';
    }
    const existing = await db.get(
      'SELECT id, funnel_stage, party_status, source FROM crm_deal_parties WHERE project_id = ? AND contact_id = ?',
      [projectId, contactId]).catch(() => null);

    if (existing) {
      await db.run(
        `UPDATE crm_deal_parties
            SET funnel_stage = GREATEST(funnel_stage, ?),
                party_status = CASE WHEN party_status = 'dropped' THEN party_status ELSE 'active' END,
                source = CASE WHEN source = 'outreach' THEN source ELSE 'inbound' END,
                inbound_signal = ?, inbound_at = now(),
                stage_changed_at = CASE WHEN funnel_stage < ? THEN now() ELSE stage_changed_at END
          WHERE id = ?`,
        [stage, signal, stage, existing.id]).catch(() => {});
    } else {
      await db.insert(
        `INSERT INTO crm_deal_parties
           (tenant_id, project_id, contact_id, party_role, funnel_stage, party_status, source, inbound_signal, inbound_at, created_by)
         VALUES (?, ?, ?, 'buyer', ?, 'active', 'inbound', ?, now(), ?)`,
        [tenantId, projectId, contactId, stage, signal, opts.actorId || userId]).catch(() => {});
    }
  } catch (e) {
    // Spiegelung darf den auslösenden Vorgang (NDA, Interesse) nie stören
    console.warn('[dealSync.syncFromUser]', e.message);
  }
}

module.exports = { syncFromUser, planFor, FUNNEL_FROM_INTEREST };
