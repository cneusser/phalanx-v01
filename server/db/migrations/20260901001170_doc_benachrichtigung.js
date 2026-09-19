/**
 * Benachrichtigungen über neue Unterlagen bündeln (v0.396).
 *
 * Bisher ging je hochgeladener Datei sofort eine E-Mail an alle berechtigten
 * Interessenten. Bei einem Massenimport wurde daraus eine Flut, und der Betreff
 * nannte den Dateinamen, was bei vertraulichen Unterlagen zu viel verrät.
 *
 * Neu:
 *   users.doc_notify_frequency   sofort | taeglich | woechentlich | aus
 *                                (Standard: taeglich)
 *   doc_notify_queue             offene Hinweise, die gebündelt versendet werden
 *
 * Zusätzlich als Sofortmaßnahme: Dokumente, die in einem Clean-Team-Ordner
 * liegen, werden auf restricted gesetzt. Sie sind damit nur noch für
 * ausdrücklich freigegebene Empfänger sichtbar.
 */
exports.up = async function (knex) {
  const hasFreq = await knex.schema.hasColumn('users', 'doc_notify_frequency').catch(() => false);
  if (!hasFreq) {
    await knex.schema.alterTable('users', (t) => {
      t.text('doc_notify_frequency').notNullable().defaultTo('taeglich');
    });
  }

  if (!(await knex.schema.hasTable('doc_notify_queue'))) {
    await knex.schema.createTable('doc_notify_queue', (t) => {
      t.increments('id').primary();
      t.integer('tenant_id').notNullable().defaultTo(1);
      t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.integer('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
      t.integer('anzahl').notNullable().defaultTo(1);
      t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      t.timestamp('sent_at', { useTz: true });
      t.index(['user_id', 'sent_at']);
    });
  }

  // Sofortmaßnahme: Clean-Team-Unterlagen aus der offenen Datenraum-Liste nehmen.
  const hasRestricted = await knex.schema.hasColumn('documents', 'restricted').catch(() => false);
  const hasFolder = await knex.schema.hasColumn('documents', 'folder').catch(() => false);
  if (hasRestricted && hasFolder) {
    await knex.raw(
      `UPDATE documents SET restricted = 1 WHERE folder ILIKE 'Clean Team%' OR folder ILIKE '%/Clean Team%' OR folder ILIKE '%Clean Team Documents%'`
    ).catch(() => {});
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('doc_notify_queue');
  const hasFreq = await knex.schema.hasColumn('users', 'doc_notify_frequency').catch(() => false);
  if (hasFreq) await knex.schema.alterTable('users', (t) => { t.dropColumn('doc_notify_frequency'); });
};
