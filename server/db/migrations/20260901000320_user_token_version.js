/**
 * Token-Version je Nutzer: Grundlage, um bestehende Sitzungen gezielt ungültig
 * zu machen (z. B. nach einem Passwort-Reset). Das Token trägt die Version als
 * Claim, die Prüfung vergleicht sie mit dem aktuellen Wert des Nutzers.
 */
exports.up = async function (knex) {
  const has = await knex.schema.hasColumn('users', 'token_version').catch(() => false);
  if (!has) await knex.schema.alterTable('users', (t) => { t.integer('token_version').notNullable().defaultTo(0); });
};
exports.down = async function (knex) {
  const has = await knex.schema.hasColumn('users', 'token_version').catch(() => false);
  if (has) await knex.schema.alterTable('users', (t) => { t.dropColumn('token_version'); }).catch(() => {});
};
