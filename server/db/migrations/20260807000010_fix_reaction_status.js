/**
 * v0.279: „Reagiert" korrekt fassen.
 *
 * Bisher zählte die Reminder-Automatik einen Empfänger als „reagiert", sobald der
 * Kontakt im Funnel aktiv geführt wurde (party_status = 'active'), auch ohne echte
 * Antwort. Dadurch standen ganze Mailings auf „21 reagiert", obwohl niemand auf die
 * Mail geantwortet hatte.
 *
 * Diese Migration setzt die falsch als „responded" markierten Empfänger auf den
 * neuen Status „suppressed" (Reminder pausiert, weil im Funnel geführt). Echte
 * Reaktionen bleiben erhalten:
 *   · Einwilligung/Registrierung (skip_reason = 'Einwilligung erteilt')
 *   · echte Mailantwort (crm_deal_parties.replied = 1)
 *   · Widerspruch (status = 'skipped')
 */
exports.up = async function (knex) {
  const has = await knex.schema.hasTable('crm_campaign_recipients').catch(() => false);
  if (!has) return;
  await knex.raw(`
    UPDATE crm_campaign_recipients r
       SET status = 'suppressed', skip_reason = 'wird im Funnel geführt', responded_at = NULL
      FROM crm_campaigns c, crm_deal_parties dp
     WHERE r.campaign_id = c.id
       AND dp.project_id = c.project_id AND dp.contact_id = r.contact_id
       AND r.status = 'responded'
       AND r.skip_reason = 'Rückmeldung erfasst'
       AND dp.party_status IN ('active', 'dropped')
       AND COALESCE(dp.replied, 0) = 0
  `).catch((e) => { console.warn('[fix_reaction_status]', e.message); });

  const ENTRY = {
    version: 'v0.279', released_on: '2026-08-07',
    title: '„Reagiert" bedeutet jetzt wirklich reagiert',
    items: [
      '„Reagiert" zählt nur noch echte Reaktionen: Einwilligung/Registrierung, Absage, Mailantwort oder Widerspruch',
      'Aktiv im Funnel geführte Kontakte gelten nicht mehr automatisch als „reagiert"; sie erscheinen als „wird im Funnel geführt" (kein Reminder)',
      'Bereits falsch gezählte Empfänger wurden korrigiert',
    ],
  };
  const hasCl = await knex.schema.hasTable('changelog').catch(() => false);
  if (hasCl) {
    const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
    if (!exists) await knex('changelog').insert({
      tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on,
      title: ENTRY.title, items_json: JSON.stringify(ENTRY.items),
    }).catch(() => {});
  }
};

exports.down = async function () { /* keine Rückabwicklung der Statuskorrektur */ };
