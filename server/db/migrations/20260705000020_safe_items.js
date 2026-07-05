/**
 * Sprint 8 — Container-Safe (Ordner, Bilder, beliebige Dateien je Mandat).
 *
 * safe_items: eigener, härter geschützter Bereich (nur Admin + Projekt-Pfleger,
 * KEIN Investor-Zugriff) — getrennt von Teaser/IM/Datenraum (documents).
 *   - parent_id NULLABLE → Ordnerbaum (is_folder = 1 für Ordner)
 *   - storage_key: Schlüssel beim StorageProvider (nur für Dateien)
 *   - checksum_sha256, size, mime, version (Versionierung bei Namenskollision)
 *   - deleted_at: Soft-Delete / Papierkorb (30 Tage)
 * tenant_id + RLS (Sprint-5-Muster, fail closed).
 */
exports.up = async function (knex) {
  await knex.schema.createTable('safe_items', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    t.integer('parent_id').references('id').inTable('safe_items').onDelete('CASCADE'); // Ordnerbaum
    t.text('name').notNullable();
    t.integer('is_folder').notNullable().defaultTo(0);
    t.text('storage_key');           // nur Dateien
    t.bigInteger('size').defaultTo(0);
    t.text('mime');
    t.text('checksum_sha256');
    t.integer('version').notNullable().defaultTo(1);
    t.integer('uploaded_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('deleted_at', { useTz: true });   // Papierkorb
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index('tenant_id');
    t.index('project_id');
    t.index('parent_id');
    t.index('deleted_at');
  });

  await knex.raw(`ALTER TABLE safe_items ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`ALTER TABLE safe_items FORCE ROW LEVEL SECURITY`);
  await knex.raw(`
    CREATE POLICY tenant_isolation_safe_items ON safe_items
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::int)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)
  `);
};

exports.down = async function (knex) {
  await knex.raw(`DROP POLICY IF EXISTS tenant_isolation_safe_items ON safe_items`);
  await knex.schema.dropTableIfExists('safe_items');
};
