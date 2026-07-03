/**
 * Sprint 5 — Multi-Tenant scharf schalten + Kommerzialisierung.
 *
 * 1. Row-Level-Security (ENABLE + FORCE) auf allen Tenant-Tabellen:
 *    Jede Query ist ZWINGEND auf current_setting('app.tenant_id') gefiltert —
 *    auch für den Tabellen-Owner (FORCE). Die Session-Variable wird beim
 *    Verbindungsaufbau auf den Default-Tenant gesetzt (knexfile afterCreate);
 *    Cross-Tenant-Operationen laufen über db.withTenant() (SET LOCAL).
 *    Ohne gesetzte Variable: KEINE Zeilen sichtbar (fail closed).
 *
 * 2. tenants: Branding (Name, Farben, Subdomain) + Billing-Flag/Plan.
 * 3. billing_events: Abrechnungsereignisse (Abo, Deal-Setup, Datenraum-Staffel).
 */

// Alle Tabellen mit tenant_id-Spalte
const TENANT_TABLES = [
  'users', 'buyer_profiles', 'projects', 'project_details', 'nda_requests',
  'documents', 'audit_logs', 'interests', 'permissions', 'activity_log',
  'nda_templates', 'ndas', 'qa_threads', 'tasks', 'project_members',
];

exports.up = async function (knex) {
  // ── tenants: Branding + Billing ────────────────────────────────────────────
  await knex.schema.alterTable('tenants', (t) => {
    t.text('display_name');
    t.text('subdomain').unique();
    t.text('primary_color').notNullable().defaultTo('#0D1B36');
    t.text('accent_color').notNullable().defaultTo('#29ABE2');
    t.text('logo_url');
    t.integer('billing_enabled').notNullable().defaultTo(0);
    t.text('plan').notNullable().defaultTo('standard');
  });
  await knex.raw(`UPDATE tenants SET display_name = name, subdomain = slug WHERE display_name IS NULL`);

  // ── billing_events ─────────────────────────────────────────────────────────
  await knex.schema.createTable('billing_events', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.text('event_type').notNullable(); // subscription | deal_setup | dataroom_tier
    t.integer('project_id').references('id').inTable('projects').onDelete('SET NULL');
    t.integer('amount_cents').notNullable();
    t.text('currency').notNullable().defaultTo('EUR');
    t.text('provider').notNullable().defaultTo('stub');
    t.text('provider_ref');
    t.text('status').notNullable().defaultTo('recorded'); // recorded | invoiced | paid | failed
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index('tenant_id');
  });
  await knex.raw(`ALTER TABLE billing_events ADD CONSTRAINT billing_events_type_check
    CHECK (event_type IN ('subscription','deal_setup','dataroom_tier'))`);

  // ── Row-Level-Security auf allen Tenant-Tabellen ──────────────────────────
  // Session-Var muss für DIESE Migration bereits gesetzt sein (afterCreate).
  for (const table of [...TENANT_TABLES, 'billing_events']) {
    await knex.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    await knex.raw(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    await knex.raw(`
      CREATE POLICY tenant_isolation_${table} ON ${table}
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true)::int)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)
    `);
  }
};

exports.down = async function (knex) {
  for (const table of [...TENANT_TABLES, 'billing_events']) {
    await knex.raw(`DROP POLICY IF EXISTS tenant_isolation_${table} ON ${table}`);
    await knex.raw(`ALTER TABLE ${table} NO FORCE ROW LEVEL SECURITY`);
    await knex.raw(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
  }
  await knex.schema.dropTableIfExists('billing_events');
  await knex.schema.alterTable('tenants', (t) => {
    t.dropColumns('display_name', 'subdomain', 'primary_color', 'accent_color', 'logo_url', 'billing_enabled', 'plan');
  });
};
