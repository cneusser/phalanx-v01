/**
 * Sprint 11 — In-App-Chat & Kontakte (Netzwerk).
 *   connections: Kontaktbeziehungen (Anfrage/Annahme) zwischen Nutzern.
 *   messages: 1:1-Direktnachrichten. Beides tenant_id + RLS (fail closed).
 * Nachrichten sind nur zwischen bestätigten Kontakten möglich (bzw. mit Admin/
 * Berater); serverseitig erzwungen.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('connections', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('requester_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('addressee_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('status').notNullable().defaultTo('pending'); // pending | accepted | declined
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('decided_at', { useTz: true });
    t.unique(['requester_id', 'addressee_id']);
    t.index('tenant_id'); t.index('addressee_id'); t.index('requester_id');
  });

  await knex.schema.createTable('messages', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('sender_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('recipient_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('body').notNullable();
    t.timestamp('read_at', { useTz: true });
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index('tenant_id'); t.index('sender_id'); t.index('recipient_id');
  });

  for (const table of ['connections', 'messages']) {
    await knex.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    await knex.raw(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    await knex.raw(`
      CREATE POLICY tenant_isolation_${table} ON ${table}
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true)::int)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`);
  }
};

exports.down = async function (knex) {
  for (const table of ['messages', 'connections']) {
    await knex.raw(`DROP POLICY IF EXISTS tenant_isolation_${table} ON ${table}`);
    await knex.schema.dropTableIfExists(table);
  }
};
