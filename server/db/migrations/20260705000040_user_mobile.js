/**
 * Mobilnummer als Profilfeld (Pflicht): Grundlage für spätere 2-Faktor-
 * Authentifizierung (SMS/TOTP). Separat von der bestehenden Festnetz-`phone`.
 */
exports.up = async function (knex) {
  const has = await knex.schema.hasColumn('users', 'mobile');
  if (!has) {
    await knex.schema.alterTable('users', (t) => { t.text('mobile'); });
  }
};

exports.down = async function (knex) {
  const has = await knex.schema.hasColumn('users', 'mobile');
  if (has) await knex.schema.alterTable('users', (t) => { t.dropColumn('mobile'); });
};
