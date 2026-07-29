/**
 * Feingranulare Zugriffsstruktur auf Dateiebene im Datenraum.
 *   documents.restricted = 0: Standard, für alle datenraumberechtigten
 *     Interessenten sichtbar (bisheriges Verhalten, rückwärtskompatibel).
 *   documents.restricted = 1: nur ausdrücklich freigegebene Empfänger sehen es.
 *
 * document_grants hält je Dokument und Empfänger die Stufe: nur lesen (Ansicht)
 * oder herunterladen.
 */
exports.up = async function (knex) {
  const hasCol = await knex.schema.hasColumn('documents', 'restricted').catch(() => false);
  if (!hasCol) await knex.schema.alterTable('documents', (t) => { t.integer('restricted').notNullable().defaultTo(0); });

  const exists = await knex.schema.hasTable('document_grants');
  if (!exists) {
    await knex.schema.createTable('document_grants', (t) => {
      t.increments('id').primary();
      t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
      t.integer('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE');
      t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.text('level').notNullable().defaultTo('read'); // read | download
      t.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
      t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      t.unique(['document_id', 'user_id']);
      t.index('tenant_id'); t.index('document_id'); t.index('user_id');
    });
    await knex.raw('ALTER TABLE document_grants ENABLE ROW LEVEL SECURITY');
    await knex.raw('ALTER TABLE document_grants FORCE ROW LEVEL SECURITY');
    await knex.raw(`
      CREATE POLICY tenant_isolation_document_grants ON document_grants
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true)::int)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`);
  }
};

exports.down = async function (knex) {
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_document_grants ON document_grants').catch(() => {});
  await knex.schema.dropTableIfExists('document_grants');
  const hasCol = await knex.schema.hasColumn('documents', 'restricted').catch(() => false);
  if (hasCol) await knex.schema.alterTable('documents', (t) => { t.dropColumn('restricted'); }).catch(() => {});
};
