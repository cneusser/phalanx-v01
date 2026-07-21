/**
 * v0.269: Interessenten aus der Plattform in den Deal-Funnel spiegeln.
 *
 * Bisher lebte der Funnel allein in crm_deal_parties (CRM-Kontakte). Wer sich als
 * Nutzer registriert und eine NDA anfordert, ein Mandat beobachtet oder Interesse
 * bekundet, tauchte dort nicht auf, obwohl er der heißeste Lead ist. Das war der
 * Fehler bei Betongold: Herr Malessa hatte die NDA-Freigabe, stand aber in keiner
 * Spalte.
 *
 * Diese Migration:
 *   1. gibt crm_deal_parties eine Herkunft (source) plus das auslösende Signal,
 *   2. gibt crm_contacts eine Herkunft (für die Nachverfolgung),
 *   3. spiegelt bestehende Interaktionen (Interesse-Stufen, Beobachtungen) nach,
 *      damit alle bisherigen Interessenten sofort im Funnel erscheinen.
 *
 * Die laufende Spiegelung übernimmt server/utils/dealSync.js an den Ereignisstellen.
 */

// Interesse-Stufe (dealStateMachine) → Funnel-Stufe (crm_deal_parties.funnel_stage)
const FUNNEL_FROM_INTEREST = {
  requested: 3, nda_pending: 3, nda_signed: 4,
  im_granted: 4, dataroom_granted: 4, loi: 6,
};

exports.up = async function (knex) {
  const hasSource = await knex.schema.hasColumn('crm_deal_parties', 'source');
  if (!hasSource) {
    await knex.schema.alterTable('crm_deal_parties', (t) => {
      t.text('source').notNullable().defaultTo('manual');   // manual | outreach | inbound
      t.text('inbound_signal');                             // nda | interest | watchlist | mailing
      t.timestamp('inbound_at', { useTz: true });
    });
  }
  const hasContactSource = await knex.schema.hasColumn('crm_contacts', 'source');
  if (!hasContactSource) {
    await knex.schema.alterTable('crm_contacts', (t) => { t.text('source'); });
  }

  // Bestehende Parteien, die aus einer Ansprache stammen, als „outreach" markieren
  await knex.raw(`UPDATE crm_deal_parties SET source = 'outreach' WHERE source = 'manual' AND mails_sent > 0`).catch(() => {});

  // ── Backfill: Kontakt + Partei je Nutzer-Interaktion anlegen ────────────────
  // Nur wo die Tabellen existieren (defensiv, falls in Zukunft umbenannt).
  const hasInterests = await knex.schema.hasTable('interests').catch(() => false);
  const hasWatchlist = await knex.schema.hasTable('watchlist').catch(() => false);

  // Findet oder legt einen CRM-Kontakt zur Nutzer-E-Mail an; gibt die contact_id.
  async function contactForUser(u, tenantId) {
    const email = (u.email || '').trim();
    if (!email) return null;
    const found = await knex('crm_contacts')
      .whereRaw('lower(email) = lower(?)', [email]).first('id').catch(() => null);
    if (found) return found.id;
    const [row] = await knex('crm_contacts').insert({
      tenant_id: tenantId,
      first_name: u.first_name || '',
      last_name: u.last_name || email,
      email,
      source: 'inbound',
      consent_status: 'opt_in',   // registrierter Nutzer hat bei der Anmeldung zugestimmt
      created_by: u.id,
    }).returning('id').catch(() => [null]);
    return row && (row.id || row);
  }

  async function upsertParty(projectId, contactId, tenantId, stage, signal, userId) {
    const existing = await knex('crm_deal_parties')
      .where({ project_id: projectId, contact_id: contactId }).first('id', 'funnel_stage', 'source').catch(() => null);
    if (existing) {
      await knex('crm_deal_parties').where({ id: existing.id }).update({
        funnel_stage: Math.max(existing.funnel_stage || 0, stage),
        source: existing.source === 'outreach' ? 'outreach' : 'inbound',
        inbound_signal: signal, inbound_at: knex.fn.now(),
      }).catch(() => {});
    } else {
      await knex('crm_deal_parties').insert({
        tenant_id: tenantId, project_id: projectId, contact_id: contactId,
        party_role: 'buyer', funnel_stage: stage, party_status: 'active',
        source: 'inbound', inbound_signal: signal, inbound_at: knex.fn.now(), created_by: userId,
      }).catch(() => {});
    }
  }

  const tenantOf = async (projectId) =>
    (await knex('projects').where({ id: projectId }).first('tenant_id').catch(() => null))?.tenant_id || 1;

  if (hasInterests) {
    const rows = await knex('interests as i')
      .join('users as u', 'u.id', 'i.buyer_id')
      .whereNot('i.stage', 'rejected')
      .select('i.project_id', 'i.stage', 'u.id', 'u.email', 'u.first_name', 'u.last_name').catch(() => []);
    for (const r of rows) {
      const tenantId = await tenantOf(r.project_id);
      const cid = await contactForUser(r, tenantId);
      if (!cid) continue;
      let stage = FUNNEL_FROM_INTEREST[r.stage] ?? 2;
      // Ohne unterschriebene NDA nicht über „NDA" (3) hinaus, auch wenn der Datenraum
      // administrativ schon freigegeben wurde.
      if (stage > 3) {
        const nda = await knex('nda_requests')
          .where({ user_id: r.id, project_id: r.project_id })
          .orderBy('id', 'desc').first('signed_at', 'status').catch(() => null);
        const signed = !!(nda && (nda.signed_at || nda.status === 'signed'));
        if (!signed) stage = 3;
      }
      await upsertParty(r.project_id, cid, tenantId, stage, 'nda', r.id);
    }
  }

  if (hasWatchlist) {
    const rows = await knex('watchlist as w')
      .join('users as u', 'u.id', 'w.user_id')
      .select('w.project_id', 'u.id', 'u.email', 'u.first_name', 'u.last_name').catch(() => []);
    for (const r of rows) {
      const tenantId = await tenantOf(r.project_id);
      const cid = await contactForUser(r, tenantId);
      if (!cid) continue;
      // Beobachten hebt niemanden über Stufe 0; bestehende höhere Stufe bleibt via Math.max
      await upsertParty(r.project_id, cid, tenantId, 0, 'watchlist', r.id);
    }
  }

  const ENTRY = {
    version: 'v0.269', released_on: '2026-07-21',
    title: 'Interessenten aus der Plattform im Deal-Funnel',
    items: [
      'Wer eine NDA anfordert, ein Mandat beobachtet oder Interesse zeigt, erscheint jetzt automatisch im Deal-Funnel, auf der zur Interaktion passenden Stufe',
      'Neue Spalte „Eingang" ganz vorne: dort sammeln sich Beobachter und Favoriten, bevor sie aktiv bearbeitet werden',
      'Karten aus der Plattform tragen die Markierung „Eingang" mit dem auslösenden Signal (NDA, Interesse, beobachtet)',
      'Bestehende Interessenten (z. B. NDA-Freigaben) wurden nachgetragen, damit niemand mehr fehlt',
    ],
  };
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) {
    await knex('changelog').insert({
      tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on,
      title: ENTRY.title, items_json: JSON.stringify(ENTRY.items),
    }).catch(() => {});
  }
};

exports.down = async function (knex) {
  await knex('changelog').where({ version: 'v0.269' }).del().catch(() => {});
  // Nachgetragene Inbound-Parteien wieder entfernen (die Kontakte bleiben bestehen)
  await knex('crm_deal_parties').where({ source: 'inbound' }).del().catch(() => {});
  const hasSource = await knex.schema.hasColumn('crm_deal_parties', 'source');
  if (hasSource) {
    await knex.schema.alterTable('crm_deal_parties', (t) => {
      t.dropColumn('source'); t.dropColumn('inbound_signal'); t.dropColumn('inbound_at');
    }).catch(() => {});
  }
};

exports.FUNNEL_FROM_INTEREST = FUNNEL_FROM_INTEREST;
