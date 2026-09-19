/**
 * Interessent je Mandat stummschalten (v0.397).
 *
 * Bittet ein Interessent darum, zu einem bestimmten Mandat keine Hinweise mehr
 * zu erhalten, war das bisher nur pauschal möglich: entweder global im Profil
 * oder durch Ablehnen des Interessenten, was ihn aus dem Prozess nimmt. Mit
 * diesem Kennzeichen bleibt der Zugang bestehen, es gehen nur keine
 * Benachrichtigungen mehr zu diesem Mandat hinaus.
 */
exports.up = async function (knex) {
  const has = await knex.schema.hasColumn('interests', 'notifications_muted').catch(() => false);
  if (!has) {
    await knex.schema.alterTable('interests', (t) => {
      t.integer('notifications_muted').notNullable().defaultTo(0);
    });
  }
};

exports.down = async function (knex) {
  const has = await knex.schema.hasColumn('interests', 'notifications_muted').catch(() => false);
  if (has) await knex.schema.alterTable('interests', (t) => { t.dropColumn('notifications_muted'); });
};
