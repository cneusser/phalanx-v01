/**
 * Eine Nachricht für das Q&A vormerken (v0.443).
 *
 * Anlass: Die besten Fragen entstehen im Gespräch, nicht im Q&A-Formular. Wer
 * sie dort sieht, will sie festhalten, bevor sie im Verlauf nach oben wandern,
 * und sie erst in einem zweiten Schritt anonymisieren und veröffentlichen.
 *
 * Deshalb zwei Spalten an der Nachricht statt eines sofortigen Eintrags im
 * Q&A: Das Vormerken ist eine Notiz, keine Veröffentlichung. Zwischen beidem
 * liegt bewusst eine Entscheidung, denn eine Frage im Wortlaut eines
 * Interessenten kann Namen, Zahlen und Rückschlüsse enthalten.
 *
 * qa_thread_id hält fest, was aus der Vormerkung geworden ist. Ohne diesen
 * Verweis liesse sich später nicht mehr sagen, ob eine Nachricht schon
 * veröffentlicht wurde, und dieselbe Frage stünde zweimal im Q&A.
 */
exports.up = async function (knex) {
  const spalten = [
    ['qa_markiert_am', (t) => t.timestamp('qa_markiert_am', { useTz: true })],
    ['qa_markiert_von', (t) => t.integer('qa_markiert_von')],
    ['qa_thread_id', (t) => t.integer('qa_thread_id')],
  ];
  for (const [name, bauen] of spalten) {
    if (!(await knex.schema.hasColumn('messages', name))) {
      await knex.schema.alterTable('messages', bauen);
    }
  }
  await knex.raw('CREATE INDEX IF NOT EXISTS messages_qa_markiert_idx ON messages (qa_markiert_am)').catch(() => {});
};

exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS messages_qa_markiert_idx').catch(() => {});
  for (const name of ['qa_markiert_am', 'qa_markiert_von', 'qa_thread_id']) {
    if (await knex.schema.hasColumn('messages', name)) {
      await knex.schema.alterTable('messages', (t) => t.dropColumn(name));
    }
  }
};
