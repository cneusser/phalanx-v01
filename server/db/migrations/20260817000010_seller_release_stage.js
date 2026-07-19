/**
 * v0.296: Neuer Funnelschritt „Freigabe Verkäufer".
 *
 * Recherchierte Kandidaten sollen dem Mandanten vorgelegt werden, bevor sie
 * angesprochen werden. Dafür kommt eine eigene Stufe zwischen Longlist und
 * Angesprochen, plus ein Vermerk, wer wann freigegeben hat.
 *
 *   alt: 0 Longlist · 1 Angesprochen · 2 Rückmeldung · 3 Match · 4 NDA · 5 IM ·
 *        6 Gespräch · 7 LOI eingereicht · 8 LOI unterschrieben · 9 Namensnennung ·
 *        10 Due Diligence · 11 Signing · 12 Closing
 *   neu: 0 Longlist · 1 Freigabe Verkäufer · 2 Angesprochen · 3 Rückmeldung ·
 *        4 Match · 5 NDA · 6 IM · 7 Gespräch · 8 LOI eingereicht ·
 *        9 LOI unterschrieben · 10 Namensnennung · 11 Due Diligence ·
 *        12 Signing · 13 Closing
 *
 * Alles ab Stufe 1 rückt um eins nach hinten (absteigend, damit nichts kollidiert).
 * Die Automatik-Ziele werden im Code parallel angehoben.
 */
exports.up = async function (knex) {
  const addCol = async (name, build) => {
    const has = await knex.schema.hasColumn('crm_deal_parties', name).catch(() => false);
    if (!has) await knex.schema.alterTable('crm_deal_parties', build);
  };
  await addCol('seller_approved', (t) => t.integer('seller_approved').notNullable().defaultTo(0));
  await addCol('seller_approved_at', (t) => t.timestamp('seller_approved_at', { useTz: true }));
  await addCol('seller_approved_by', (t) => t.integer('seller_approved_by').references('id').inTable('users').onDelete('SET NULL'));

  // Bestandsstufen um eins nach hinten schieben (absteigend)
  for (let from = 12; from >= 1; from--) {
    await knex.raw('UPDATE crm_deal_parties SET funnel_stage = ? WHERE funnel_stage = ?', [from + 1, from]).catch(() => {});
  }

  // Nexora: alle recherchierten Kandidaten dem Verkäufer zur Freigabe vorlegen
  await knex.raw(`
    UPDATE crm_deal_parties SET funnel_stage = 1, stage_changed_at = now()
     WHERE party_role = 'buyer' AND funnel_stage = 0
       AND project_id IN (SELECT id FROM projects WHERE lower(codename) = 'nexora')`).catch(() => {});
};

exports.down = async function (knex) {
  // Freigabe-Stufe wieder einsammeln: alles auf Stufe 1 zurück in die Longlist
  await knex.raw('UPDATE crm_deal_parties SET funnel_stage = 0 WHERE funnel_stage = 1').catch(() => {});
  for (let from = 2; from <= 13; from++) {
    await knex.raw('UPDATE crm_deal_parties SET funnel_stage = ? WHERE funnel_stage = ?', [from - 1, from]).catch(() => {});
  }
  for (const name of ['seller_approved_by', 'seller_approved_at', 'seller_approved']) {
    const has = await knex.schema.hasColumn('crm_deal_parties', name).catch(() => false);
    if (has) await knex.schema.alterTable('crm_deal_parties', (t) => t.dropColumn(name));
  }
};
