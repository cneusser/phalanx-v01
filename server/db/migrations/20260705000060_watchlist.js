/**
 * Sprint 10: Merkliste (Watchlist) je Käufer: gemerkte Mandate mit optionalen
 * Tags und Notiz (leichtes Käufer-CRM). tenant_id + RLS (fail closed).
 */
exports.up = async function (knex) {
  await knex.schema.createTable('watchlist', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    t.text('tags_json').notNullable().defaultTo('[]');
    t.text('note');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['user_id', 'project_id']);
    t.index('tenant_id');
    t.index('user_id');
  });

  await knex.raw(`ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`ALTER TABLE watchlist FORCE ROW LEVEL SECURITY`);
  await knex.raw(`
    CREATE POLICY tenant_isolation_watchlist ON watchlist
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::int)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`);
};

exports.down = async function (knex) {
  await knex.raw(`DROP POLICY IF EXISTS tenant_isolation_watchlist ON watchlist`);
  await knex.schema.dropTableIfExists('watchlist');
};
