/**
 * Sprint 19: Mandats-Einladungen mit Status-Funnel.
 * Pflegende eines Mandats können per E-Mail einladen als
 *   'viewer' (Betrachter, nur lesen) oder 'editor' (Pflegender, darf bearbeiten).
 *
 * Funnel: invited → opened → accepted   (bzw. declined | revoked | expired)
 *
 * Der Token beweist den Besitz der E-Mail-Adresse, wer über eine Einladung ein
 * Konto anlegt, wird daher vorab freigeschaltet und verifiziert (sonst liefe die
 * Einladung in die Admin-Freigabeschlange und wäre wertlos).
 */
exports.up = async function (knex) {
  await knex.schema.createTable('project_invitations', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    t.text('email').notNullable();
    t.text('role').notNullable().defaultTo('viewer');      // viewer | editor
    t.text('token').notNullable().unique();
    t.text('message');                                     // persönliche Notiz des Einladenden
    t.text('status').notNullable().defaultTo('invited');   // invited|opened|accepted|declined|revoked|expired
    t.integer('invited_by').references('id').inTable('users').onDelete('SET NULL');
    t.integer('user_id').references('id').inTable('users').onDelete('SET NULL'); // gesetzt bei Annahme
    t.timestamp('invited_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('opened_at', { useTz: true });
    t.timestamp('accepted_at', { useTz: true });
    t.timestamp('expires_at', { useTz: true });
    t.index('tenant_id'); t.index('project_id'); t.index('email');
  });

  await knex.raw(`ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`ALTER TABLE project_invitations FORCE ROW LEVEL SECURITY`);
  await knex.raw(`
    CREATE POLICY tenant_isolation_project_invitations ON project_invitations
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::int)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`);
};

exports.down = async function (knex) {
  await knex.raw(`DROP POLICY IF EXISTS tenant_isolation_project_invitations ON project_invitations`);
  await knex.schema.dropTableIfExists('project_invitations');
};
