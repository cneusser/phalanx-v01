/** Notiz je Nachfolge-Interessent (interne Vermerke im Funnel). */
exports.up = async function (knex) {
  const has = await knex.schema.hasColumn('users', 'succession_note').catch(() => false);
  if (!has) await knex.schema.alterTable('users', (t) => { t.text('succession_note'); });
};
exports.down = async function (knex) {
  const has = await knex.schema.hasColumn('users', 'succession_note').catch(() => false);
  if (has) await knex.schema.alterTable('users', (t) => { t.dropColumn('succession_note'); }).catch(() => {});
};
