/**
 * v0.292, Stufe B des DUB-Verkäufer-Benchmarks (ROADMAP Sprint 25).
 *
 * Der Inserate-Lebenszyklus bekommt einen expliziten Prüf-Schritt und einen
 * Moderations-Trail. Der Status (Freitextspalte projects.status) kennt ab jetzt:
 *
 *   draft      Entwurf, nur der Verkäufer/Pfleger sieht ihn (privat)
 *   in_review  zur Prüfung eingereicht, wartet auf Freigabe (neu)
 *   active     freigegeben und öffentlich
 *   paused     vorübergehend ausgeblendet (vom Verkäufer)
 *   closed     abgeschlossen/beendet
 *
 * Zusätzlich ein kleiner Trail, wer wann eingereicht und geprüft hat.
 */
exports.up = async function (knex) {
  const add = async (name, build) => {
    const has = await knex.schema.hasColumn('projects', name).catch(() => false);
    if (!has) await knex.schema.alterTable('projects', build);
  };
  await add('submitted_at', (t) => t.timestamp('submitted_at', { useTz: true }));
  await add('reviewed_at', (t) => t.timestamp('reviewed_at', { useTz: true }));
  await add('reviewed_by', (t) => t.integer('reviewed_by').references('id').inTable('users').onDelete('SET NULL'));
  await add('review_note', (t) => t.text('review_note'));
};

exports.down = async function (knex) {
  for (const name of ['review_note', 'reviewed_by', 'reviewed_at', 'submitted_at']) {
    const has = await knex.schema.hasColumn('projects', name).catch(() => false);
    if (has) await knex.schema.alterTable('projects', (t) => t.dropColumn(name));
  }
};
