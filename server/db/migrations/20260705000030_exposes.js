/**
 * Sprint 9: Exposé-Builder (Struktur nach DUB, Inhalt nach KERN/HWK).
 *
 * exposes: ein strukturiertes Verkaufs-Exposé je Mandat.
 *   - status: draft | published
 *   - keyfacts_json: DUB-Keyfacts-Raster (Land, Region, Umsatzband, …)
 *   - sections_json: Array { key, title, enabled, body } (Sektionen ein-/ausblendbar)
 *   - hero_image_id / gallery_json: Verweise auf safe_items (Bilder aus dem Container-Safe)
 *   - anonymized_ack: Bestätigung der Anonymisierungs-Checkliste vor Publikation
 * Web-Exposé hinter dem IM-Gate (erst NDA, dann Exposé). tenant_id + RLS.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('exposes', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('project_id').notNullable().unique().references('id').inTable('projects').onDelete('CASCADE');
    t.text('status').notNullable().defaultTo('draft');   // draft | published
    t.text('keyfacts_json').notNullable().defaultTo('{}');
    t.text('sections_json').notNullable().defaultTo('[]');
    t.integer('hero_image_id').references('id').inTable('safe_items').onDelete('SET NULL');
    t.text('gallery_json').notNullable().defaultTo('[]'); // [safe_item_id, …]
    t.integer('anonymized_ack').notNullable().defaultTo(0);
    t.integer('updated_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('published_at', { useTz: true });
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index('tenant_id');
    t.index('project_id');
  });

  await knex.raw(`ALTER TABLE exposes ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`ALTER TABLE exposes FORCE ROW LEVEL SECURITY`);
  await knex.raw(`
    CREATE POLICY tenant_isolation_exposes ON exposes
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::int)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)
  `);
};

exports.down = async function (knex) {
  await knex.raw(`DROP POLICY IF EXISTS tenant_isolation_exposes ON exposes`);
  await knex.schema.dropTableIfExists('exposes');
};
