/**
 * Kleiner Funnel für Nachfolge-Interessierte: ein Status je Person, den das Team
 * pflegt. Stufen: neu, profil, vorgestellt, gespraech, vermittelt, kein_match.
 */
exports.up = async function (knex) {
  const has = await knex.schema.hasColumn('users', 'succession_stage').catch(() => false);
  if (!has) await knex.schema.alterTable('users', (t) => { t.text('succession_stage').defaultTo('neu'); });
};
exports.down = async function (knex) {
  const has = await knex.schema.hasColumn('users', 'succession_stage').catch(() => false);
  if (has) await knex.schema.alterTable('users', (t) => { t.dropColumn('succession_stage'); }).catch(() => {});
};
