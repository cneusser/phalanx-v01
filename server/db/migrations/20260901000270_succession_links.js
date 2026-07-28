/**
 * Verknüpfung Nachfolge-Kandidat zu Mandat: hält fest, welchem Übergeber
 * (Mandat) ein Kandidat vorgestellt wurde, mit eigenem Mini-Status je Zuordnung.
 * Stufen: vorgeschlagen, vorgestellt, interesse, gespraech, abgesagt, vermittelt.
 */
exports.up = async function (knex) {
  const exists = await knex.schema.hasTable('succession_links');
  if (!exists) {
    await knex.schema.createTable('succession_links', (t) => {
      t.increments('id').primary();
      t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
      t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.integer('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
      t.text('status').notNullable().defaultTo('vorgeschlagen');
      t.text('note');
      t.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
      t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      t.unique(['user_id', 'project_id']);
      t.index('tenant_id'); t.index('user_id'); t.index('project_id');
    });
    await knex.raw('ALTER TABLE succession_links ENABLE ROW LEVEL SECURITY');
    await knex.raw('ALTER TABLE succession_links FORCE ROW LEVEL SECURITY');
    await knex.raw(`
      CREATE POLICY tenant_isolation_succession_links ON succession_links
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true)::int)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`);
  }
};

exports.down = async function (knex) {
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_succession_links ON succession_links').catch(() => {});
  await knex.schema.dropTableIfExists('succession_links');
};
