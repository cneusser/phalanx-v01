/**
 * Sprint 17: Gamification / XP.
 * Append-only Eventlog der vergebenen Punkte je Nutzer. Idempotent über
 * unique (user_id, action, ref_type, ref_id): ein Prozessschritt (z. B. NDA
 * signiert für Projekt X) zählt genau einmal. ref_type/ref_id sind NOT NULL
 * (Default '' / 0), damit die Unique-Bedingung auch ohne Referenz greift.
 * tenant_id + RLS (FORCE, fail closed) wie im Plattform-Standard.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('xp_events', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('action').notNullable();
    t.integer('points').notNullable().defaultTo(0);
    t.text('ref_type').notNullable().defaultTo('');
    t.integer('ref_id').notNullable().defaultTo(0);
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['user_id', 'action', 'ref_type', 'ref_id']);
    t.index('tenant_id'); t.index('user_id');
  });

  await knex.raw(`ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`ALTER TABLE xp_events FORCE ROW LEVEL SECURITY`);
  await knex.raw(`
    CREATE POLICY tenant_isolation_xp_events ON xp_events
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::int)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`);
};

exports.down = async function (knex) {
  await knex.raw(`DROP POLICY IF EXISTS tenant_isolation_xp_events ON xp_events`);
  await knex.schema.dropTableIfExists('xp_events');
};
