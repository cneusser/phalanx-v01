/**
 * Sprint 3: NDA-Automatik + E-Signatur.
 *
 * - nda_templates: konfigurierbare NDA-Vorlage mit Platzhaltern
 *   ({{project_codename}}, {{buyer_name}}, {{court_venue}}, …)
 * - ndas: revisionssichere Ablage jedes Signaturvorgangs
 *   (befülltes PDF, Provider, Status, signiertes PDF, SHA-256-Audit-Referenz)
 */

exports.up = async function (knex) {
  await knex.schema.createTable('nda_templates', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.text('name').notNullable();
    t.integer('version').notNullable().defaultTo(1);
    t.text('court_venue').notNullable().defaultTo('München');
    t.text('advisor_json').notNullable().defaultTo('{}');
    t.text('preamble').notNullable();
    t.text('sections_json').notNullable().defaultTo('[]');
    t.integer('is_active').notNullable().defaultTo(1);
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index('tenant_id');
  });

  await knex.schema.createTable('ndas', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('interest_id').references('id').inTable('interests').onDelete('SET NULL');
    t.integer('nda_request_id').references('id').inTable('nda_requests').onDelete('SET NULL');
    t.integer('template_id').references('id').inTable('nda_templates').onDelete('SET NULL');
    t.text('filled_pdf_ref');
    t.text('signature_provider').notNullable().defaultTo('stub');
    t.text('signature_status').notNullable().defaultTo('draft');
    t.text('provider_ref');
    t.text('signed_pdf_ref');
    t.timestamp('signed_at', { useTz: true });
    t.text('audit_ref'); // SHA-256 des signierten PDFs, Manipulationsnachweis
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index('tenant_id');
  });
  await knex.raw(`
    ALTER TABLE ndas ADD CONSTRAINT ndas_signature_status_check
    CHECK (signature_status IN ('draft','sent','signed','declined'))
  `);
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('ndas');
  await knex.schema.dropTableIfExists('nda_templates');
};
