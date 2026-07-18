/**
 * v0.293, Stufe C des DUB-Verkäufer-Benchmarks (ROADMAP Sprint 25).
 *
 *   1. Zielsteuerung am Mandat:
 *        projects.buyer_groups  Käufertypen, die das Mandat sehen/matchen sollen
 *                               (JSON-Array, leer = alle). Werte wie bei crm_contacts.buyer_type.
 *        projects.keywords      Schlagwörter für Auffindbarkeit/Matching (Freitext).
 *
 *   2. Namensnennung (Demasking) je Beteiligtem:
 *        crm_deal_parties.identity_revealed     0/1, Klarname für diesen Käufer freigegeben
 *        crm_deal_parties.identity_revealed_at  wann
 *        crm_deal_parties.identity_revealed_by  wer (User)
 *
 *   3. Plattform-NDA als Käufer-Gütesiegel:
 *        users.platform_nda_signed_at  Zeitpunkt der einmaligen Plattform-NDA
 */
exports.up = async function (knex) {
  const addCol = async (table, name, build) => {
    const has = await knex.schema.hasColumn(table, name).catch(() => false);
    if (!has) await knex.schema.alterTable(table, build);
  };
  await addCol('projects', 'buyer_groups', (t) => t.text('buyer_groups').notNullable().defaultTo('[]'));
  await addCol('projects', 'keywords', (t) => t.text('keywords'));
  await addCol('crm_deal_parties', 'identity_revealed', (t) => t.integer('identity_revealed').notNullable().defaultTo(0));
  await addCol('crm_deal_parties', 'identity_revealed_at', (t) => t.timestamp('identity_revealed_at', { useTz: true }));
  await addCol('crm_deal_parties', 'identity_revealed_by', (t) => t.integer('identity_revealed_by').references('id').inTable('users').onDelete('SET NULL'));
  await addCol('users', 'platform_nda_signed_at', (t) => t.timestamp('platform_nda_signed_at', { useTz: true }));
};

exports.down = async function (knex) {
  const dropCol = async (table, name) => {
    const has = await knex.schema.hasColumn(table, name).catch(() => false);
    if (has) await knex.schema.alterTable(table, (t) => t.dropColumn(name));
  };
  await dropCol('users', 'platform_nda_signed_at');
  await dropCol('crm_deal_parties', 'identity_revealed_by');
  await dropCol('crm_deal_parties', 'identity_revealed_at');
  await dropCol('crm_deal_parties', 'identity_revealed');
  await dropCol('projects', 'keywords');
  await dropCol('projects', 'buyer_groups');
};
