/**
 * Exposé-PDF-Upload: Verweis auf ein fertiges, hochgeladenes Exposé-PDF im Safe.
 * Ist pdf_item_id gesetzt, liefert GET /api/exposes/:projectId/pdf diese Datei aus
 * (statt das PDF aus Eckdaten/Sektionen zu generieren).
 */
exports.up = async function (knex) {
  const has = await knex.schema.hasColumn('exposes', 'pdf_item_id');
  if (!has) {
    await knex.schema.alterTable('exposes', (t) => {
      t.integer('pdf_item_id').references('id').inTable('safe_items').onDelete('SET NULL');
    });
  }
};

exports.down = async function (knex) {
  const has = await knex.schema.hasColumn('exposes', 'pdf_item_id');
  if (has) {
    await knex.schema.alterTable('exposes', (t) => { t.dropColumn('pdf_item_id'); });
  }
};
