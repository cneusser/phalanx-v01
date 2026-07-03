/**
 * Initiales PostgreSQL-Schema für CapitalMatch.
 *
 * Überführt alle bisherigen SQLite-Tabellen nach Postgres und führt
 * Multi-Tenancy-Grundlagen ein (Sprint 4/5-Vorbereitung):
 *   - Tabelle `tenants` mit Default-Tenant "phalanx" (id = 1)
 *   - Jede Fachtabelle bekommt `tenant_id` (NOT NULL, Default 1)
 *
 * Hinweis Datentypen: is_active / is_approved bleiben INTEGER (0/1) statt
 * BOOLEAN, damit Client und bestehende Queries (`is_approved = 1`)
 * unverändert weiterfunktionieren.
 */

exports.up = async function (knex) {
  // ── tenants ────────────────────────────────────────────────────────────────
  await knex.schema.createTable('tenants', (t) => {
    t.increments('id').primary();
    t.text('slug').notNullable().unique();
    t.text('name').notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // Default-Tenant anlegen, BEVOR Tabellen mit tenant_id-Default 1 befüllt werden
  await knex('tenants').insert({ id: 1, slug: 'phalanx', name: 'Phalanx GmbH' });
  // Sequenz hinter die manuell vergebene id setzen
  await knex.raw(`SELECT setval('tenants_id_seq', (SELECT MAX(id) FROM tenants))`);

  const tenantCol = (t) => {
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.index('tenant_id');
  };

  // ── users ──────────────────────────────────────────────────────────────────
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    tenantCol(t);
    t.text('email').notNullable().unique();
    t.text('password_hash').notNullable();
    t.text('role').notNullable().defaultTo('buyer');
    t.text('first_name').notNullable();
    t.text('last_name').notNullable();
    t.text('company');
    t.text('position');
    t.text('buyer_type');
    t.text('phone');
    t.integer('is_active').notNullable().defaultTo(1);
    t.integer('is_approved').notNullable().defaultTo(0);
    t.text('reset_token');
    t.timestamp('reset_token_expires', { useTz: true });
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // ── buyer_profiles ─────────────────────────────────────────────────────────
  await knex.schema.createTable('buyer_profiles', (t) => {
    t.increments('id').primary();
    tenantCol(t);
    t.integer('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    t.text('industries').notNullable().defaultTo('[]');
    t.text('regions').notNullable().defaultTo('[]');
    t.float('revenue_min').defaultTo(0);
    t.float('revenue_max').defaultTo(100);
    t.float('ebitda_min').defaultTo(0);
    t.float('ebitda_max').defaultTo(20);
    t.text('deal_types').notNullable().defaultTo('[]');
    t.text('investment_style').defaultTo('both');
    t.text('notes');
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // ── projects ───────────────────────────────────────────────────────────────
  await knex.schema.createTable('projects', (t) => {
    t.increments('id').primary();
    tenantCol(t);
    t.text('codename').notNullable().unique();
    t.text('industry').notNullable();
    t.text('region').notNullable();
    t.text('revenue_band').notNullable().defaultTo('—');
    t.text('ebitda_band').notNullable().defaultTo('—');
    t.text('deal_type').notNullable().defaultTo('');
    t.text('short_description').notNullable();
    t.text('highlights').notNullable().defaultTo('[]');
    t.text('status').notNullable().defaultTo('active');
    t.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
    // Startup-/Fundraising-Felder
    t.text('stage');
    t.text('investment_needed');
    t.text('equity_stake');
    t.text('post_money_valuation');
    t.text('tam_band');
    t.text('sector_emoji');
    t.text('location_city');
    t.text('mandate_type').notNullable().defaultTo('ma');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index('status');
    t.index('mandate_type');
  });

  // ── project_details ────────────────────────────────────────────────────────
  await knex.schema.createTable('project_details', (t) => {
    t.increments('id').primary();
    tenantCol(t);
    t.integer('project_id').notNullable().unique().references('id').inTable('projects').onDelete('CASCADE');
    t.text('full_description');
    t.float('revenue_actual');
    t.float('ebitda_actual');
    t.text('revenue_trend');
    t.integer('employees');
    t.integer('founding_year');
    t.text('growth_strategy');
    t.text('key_risks');
    t.text('asking_price_band');
    t.text('team_description');
    t.text('problem_solution');
    t.text('use_of_funds');
    t.text('traction_highlights').notNullable().defaultTo('[]');
    t.text('milestones');
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // ── nda_requests ───────────────────────────────────────────────────────────
  await knex.schema.createTable('nda_requests', (t) => {
    t.increments('id').primary();
    tenantCol(t);
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    t.text('status').notNullable().defaultTo('requested');
    t.timestamp('requested_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('sent_at', { useTz: true });
    t.timestamp('signed_at', { useTz: true });
    t.timestamp('approved_at', { useTz: true });
    t.integer('approved_by').references('id').inTable('users').onDelete('SET NULL');
    t.text('consent_name');
    t.text('consent_ip');
    t.timestamp('online_consent_at', { useTz: true });
    t.text('signed_pdf_path');
    t.timestamp('rejected_at', { useTz: true });
    t.unique(['user_id', 'project_id']);
  });

  // ── documents ──────────────────────────────────────────────────────────────
  await knex.schema.createTable('documents', (t) => {
    t.increments('id').primary();
    tenantCol(t);
    t.integer('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    t.text('filename').notNullable();
    t.text('file_type');
    t.bigInteger('file_size');
    t.text('access_level').notNullable().defaultTo('nda');
    t.text('description');
    t.integer('uploaded_by').references('id').inTable('users').onDelete('SET NULL');
    t.text('file_path');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // ── audit_logs (append-only) ───────────────────────────────────────────────
  await knex.schema.createTable('audit_logs', (t) => {
    t.increments('id').primary();
    tenantCol(t);
    t.integer('user_id');
    t.text('action').notNullable();
    t.text('resource_type');
    t.integer('resource_id');
    t.text('details');
    t.text('ip_address');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index('created_at');
    t.index('action');
  });
};

exports.down = async function (knex) {
  await knex.schema
    .dropTableIfExists('audit_logs')
    .dropTableIfExists('documents')
    .dropTableIfExists('nda_requests')
    .dropTableIfExists('project_details')
    .dropTableIfExists('projects')
    .dropTableIfExists('buyer_profiles')
    .dropTableIfExists('users')
    .dropTableIfExists('tenants');
};
