/**
 * Birdview: Ansicht als anderer Nutzer (Impersonation), streng schreibgeschützt.
 *
 * impersonation_log: revisionssicherer Nachweis, WER WANN WESSEN Ansicht geöffnet
 * hat. Zusätzlich landen IMPERSONATE_START/END im audit_logs (Admin → Audit-Trail).
 *
 * Sicherheitsprinzip: In fremder Identität sind ausschließlich Lesezugriffe möglich.
 * Es darf niemals passieren, dass ein Admin versehentlich in fremdem Namen handelt
 * (z. B. ein NDA unterzeichnet oder eine Nachricht sendet).
 */
exports.up = async function (knex) {
  await knex.schema.createTable('impersonation_log', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('admin_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('target_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('reason');
    t.text('ip');
    t.timestamp('started_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('ended_at', { useTz: true });
    t.index('tenant_id'); t.index('admin_id'); t.index('target_user_id');
  });

  await knex.raw(`ALTER TABLE impersonation_log ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`ALTER TABLE impersonation_log FORCE ROW LEVEL SECURITY`);
  await knex.raw(`
    CREATE POLICY tenant_isolation_impersonation_log ON impersonation_log
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::int)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`);
};

exports.down = async function (knex) {
  await knex.raw(`DROP POLICY IF EXISTS tenant_isolation_impersonation_log ON impersonation_log`);
  await knex.schema.dropTableIfExists('impersonation_log');
};
