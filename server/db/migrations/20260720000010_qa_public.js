/**
 * Q&A: Antworten können für alle Interessenten eines Mandats sichtbar geschaltet
 * werden (FAQ im Mandat) — statt dieselbe Frage zehnmal einzeln zu beantworten.
 * Der Fragesteller bleibt dabei anonym; veröffentlicht wird nur Frage und Antwort.
 */
exports.up = async function (knex) {
  const has = await knex.schema.hasColumn('qa_threads', 'is_public');
  if (!has) {
    await knex.schema.alterTable('qa_threads', (t) => {
      t.integer('is_public').notNullable().defaultTo(0);
      t.timestamp('published_at', { useTz: true });
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.alterTable('qa_threads', (t) => {
    t.dropColumn('is_public'); t.dropColumn('published_at');
  }).catch(() => {});
};
