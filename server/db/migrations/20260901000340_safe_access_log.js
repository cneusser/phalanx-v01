/**
 * Datensafe Zugriffs-Dokumentation: jede Ansicht und jeder Download einer Datei
 * wird revisionssicher festgehalten (wer, welches Dokument, wann, welche Aktion).
 * Grundlage für den Zugriffsbericht an den Verkäufer (Interessen-Heatmap je Bieter).
 */
exports.up = async function (knex) {
  const exists = await knex.schema.hasTable('safe_access_log');
  if (!exists) {
    await knex.schema.createTable('safe_access_log', (t) => {
      t.increments('id').primary();
      t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
      t.integer('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
      t.integer('item_id').references('id').inTable('safe_items').onDelete('SET NULL');
      t.integer('user_id').references('id').inTable('users').onDelete('SET NULL');
      t.text('action').notNullable(); // view | download
      t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      t.index('tenant_id'); t.index('project_id'); t.index('item_id'); t.index('user_id');
    });
    await knex.raw('ALTER TABLE safe_access_log ENABLE ROW LEVEL SECURITY');
    await knex.raw('ALTER TABLE safe_access_log FORCE ROW LEVEL SECURITY');
    await knex.raw(`
      CREATE POLICY tenant_isolation_safe_access_log ON safe_access_log
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true)::int)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`);
  }
};

exports.down = async function (knex) {
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_safe_access_log ON safe_access_log').catch(() => {});
  await knex.schema.dropTableIfExists('safe_access_log');
};
