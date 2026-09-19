/**
 * NDA-Erinnerungen (v0.391): Zaehler und Zeitpunkt der letzten Erinnerung je
 * NDA-Anfrage. Grundlage fuer den Rhythmus (nach 3 und nach 7 Tagen) und dafuer,
 * dass niemand zweimal dieselbe Erinnerung bekommt.
 */
exports.up = async function (knex) {
  const addColumn = async (name, build) => {
    const has = await knex.schema.hasColumn('nda_requests', name).catch(() => false);
    if (!has) await knex.schema.alterTable('nda_requests', build);
  };
  await addColumn('reminder_count', (t) => t.integer('reminder_count').notNullable().defaultTo(0));
  await addColumn('last_reminder_at', (t) => t.timestamp('last_reminder_at', { useTz: true }));
};

exports.down = async function (knex) {
  const dropColumn = async (name) => {
    const has = await knex.schema.hasColumn('nda_requests', name).catch(() => false);
    if (has) await knex.schema.alterTable('nda_requests', (t) => t.dropColumn(name));
  };
  await dropColumn('last_reminder_at');
  await dropColumn('reminder_count');
};
