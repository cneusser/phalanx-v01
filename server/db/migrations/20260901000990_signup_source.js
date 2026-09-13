/**
 * Herkunft der Registrierung festhalten (z. B. linkedin, direct).
 * Neue Spalte users.signup_source. Wird über die Mitmachen-Landingpage und den
 * Parameter ?src= bei der Selbstregistrierung gesetzt, damit sichtbar ist, wie
 * viele Anmeldungen z. B. von LinkedIn kommen.
 */
exports.up = async function (knex) {
  const has = await knex.schema.hasColumn('users', 'signup_source').catch(() => false);
  if (!has) await knex.schema.alterTable('users', (t) => t.text('signup_source'));
};
exports.down = async function (knex) {
  const has = await knex.schema.hasColumn('users', 'signup_source').catch(() => false);
  if (has) await knex.schema.alterTable('users', (t) => t.dropColumn('signup_source'));
};
