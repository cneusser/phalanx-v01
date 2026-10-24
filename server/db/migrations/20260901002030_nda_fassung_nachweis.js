/**
 * Welche Fassung wurde angenommen? (v0.466)
 *
 * Anlass: Ein Interessent hat nach der Online-Unterzeichnung gefragt, welche
 * Fassung bei seiner Bestätigung als akzeptiert hinterlegt wurde. Die Frage
 * war berechtigt, und die Antwort stand nirgends. Festgehalten wurden
 * Zeitpunkt, Name und IP, also wer wann bestätigt hat, aber nicht, was.
 *
 * Ein Nachweis ohne den Gegenstand der Erklärung ist kein Nachweis. Deshalb
 * drei Angaben an der Unterzeichnung:
 *
 *   fassung_hash    Fingerabdruck des Textes, den der Dialog angezeigt hat
 *   fassung_version Fassungsnummer der Vorlage
 *   fassung_text    der Wortlaut, wie er angezeigt wurde
 *
 * Der Wortlaut wird mitgespeichert und nicht nur der Fingerabdruck. Ein
 * Fingerabdruck beweist, dass sich etwas nicht geändert hat; er stellt den Text
 * aber nicht wieder her, wenn die Vorlage später überschrieben wird.
 * Und genau dann braucht man ihn.
 */
exports.up = async function (knex) {
  for (const [name, bauen] of [
    ['fassung_hash', (t) => t.string('fassung_hash', 64)],
    ['fassung_version', (t) => t.integer('fassung_version')],
    ['fassung_text', (t) => t.text('fassung_text')],
  ]) {
    if (!(await knex.schema.hasColumn('nda_requests', name))) {
      await knex.schema.alterTable('nda_requests', bauen);
    }
  }
  await knex.raw('CREATE INDEX IF NOT EXISTS nda_requests_fassung_idx ON nda_requests (fassung_hash)').catch(() => {});
};

exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS nda_requests_fassung_idx').catch(() => {});
  for (const name of ['fassung_text', 'fassung_version', 'fassung_hash']) {
    if (await knex.schema.hasColumn('nda_requests', name)) {
      await knex.schema.alterTable('nda_requests', (t) => t.dropColumn(name));
    }
  }
};
