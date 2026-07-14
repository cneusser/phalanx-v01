/**
 * Sprint 7: Ausführliche Bewertung (Engine + Report).
 *
 * detailed_valuations: geführte, mehrstufige Bewertung für registrierte Nutzer.
 *   - status: draft (Entwurf), submitted (berechnet), reviewed (vom Admin geprüft)
 *   - project_id NULLABLE: optionale Zuordnung zu einem Mandat (Preisband → Exposé)
 *   - inputs_json / results_json: Fragebogen bzw. Engine-Ergebnis
 *   - report_pdf_ref: Dateiname des letzten PDF (Volume), regenerierbar
 * tenant_id + RLS (Sprint-5-Muster, fail closed).
 */
exports.up = async function (knex) {
  await knex.schema.createTable('detailed_valuations', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.integer('project_id').references('id').inTable('projects').onDelete('SET NULL');
    t.text('title');                              // frei wählbarer Titel/Unternehmensname
    t.text('status').notNullable().defaultTo('draft'); // draft | submitted | reviewed
    t.text('inputs_json').notNullable().defaultTo('{}');
    t.text('results_json').notNullable().defaultTo('{}');
    t.text('report_pdf_ref');
    t.text('reviewer_comment');
    t.integer('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('submitted_at', { useTz: true });
    t.timestamp('reviewed_at', { useTz: true });
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index('tenant_id');
    t.index('user_id');
    t.index('status');
  });

  await knex.raw(`ALTER TABLE detailed_valuations ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`ALTER TABLE detailed_valuations FORCE ROW LEVEL SECURITY`);
  await knex.raw(`
    CREATE POLICY tenant_isolation_detailed_valuations ON detailed_valuations
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::int)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)
  `);
};

exports.down = async function (knex) {
  await knex.raw(`DROP POLICY IF EXISTS tenant_isolation_detailed_valuations ON detailed_valuations`);
  await knex.schema.dropTableIfExists('detailed_valuations');
};
