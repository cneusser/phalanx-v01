/**
 * Sprint 2: Deal-Zustandsautomat mit Gates.
 *
 * - projects.deal_status: Sell-Side-Funnel-Status des Mandats
 *     draft → teaser_live → in_diligence → loi → closed (+ withdrawn)
 *   (projects.status 'active'/'draft' bleibt die Sichtbarkeits-Flagge der UI)
 * - interests: Interessenten-Funnel je Deal (Gate-Grundlage)
 *     requested → nda_pending → nda_signed → im_granted → dataroom_granted → loi
 *     (+ rejected). Backfill aus nda_requests.
 * - permissions: granulare Ressourcen-Rechte (read/download/qa), Sprint 4
 * - activity_log: append-only (Trigger verhindert UPDATE/DELETE, auch für Admins)
 * - documents: category (teaser/im/dataroom), folder, version, storage_ref, watermark
 */

exports.up = async function (knex) {
  // ── projects.deal_status ───────────────────────────────────────────────────
  await knex.schema.alterTable('projects', (t) => {
    t.text('deal_status').notNullable().defaultTo('teaser_live');
  });
  await knex.raw(`UPDATE projects SET deal_status = 'draft' WHERE status = 'draft'`);
  await knex.raw(`
    ALTER TABLE projects ADD CONSTRAINT projects_deal_status_check
    CHECK (deal_status IN ('draft','teaser_live','in_diligence','loi','closed','withdrawn'))
  `);

  // ── interests ──────────────────────────────────────────────────────────────
  await knex.schema.createTable('interests', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    t.integer('buyer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('stage').notNullable().defaultTo('requested');
    t.timestamp('requested_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['project_id', 'buyer_id']);
    t.index('tenant_id');
    t.index('stage');
  });
  await knex.raw(`
    ALTER TABLE interests ADD CONSTRAINT interests_stage_check
    CHECK (stage IN ('requested','nda_pending','nda_signed','im_granted','dataroom_granted','loi','rejected'))
  `);

  // Backfill aus dem bestehenden NDA-Workflow
  await knex.raw(`
    INSERT INTO interests (tenant_id, project_id, buyer_id, stage, requested_at)
    SELECT nr.tenant_id, nr.project_id, nr.user_id,
      CASE nr.status
        WHEN 'requested' THEN 'requested'
        WHEN 'sent'      THEN 'nda_pending'
        WHEN 'signed'    THEN 'nda_signed'
        WHEN 'approved'  THEN 'dataroom_granted'
        WHEN 'rejected'  THEN 'rejected'
        ELSE 'requested'
      END,
      nr.requested_at
    FROM nda_requests nr
    ON CONFLICT (project_id, buyer_id) DO NOTHING
  `);

  // ── permissions (granulare Rechte, genutzt ab Sprint 4) ───────────────────
  await knex.schema.createTable('permissions', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('resource').notNullable();
    t.text('level').notNullable().defaultTo('read');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['project_id', 'user_id', 'resource']);
    t.index('tenant_id');
  });
  await knex.raw(`
    ALTER TABLE permissions ADD CONSTRAINT permissions_level_check
    CHECK (level IN ('read','download','qa'))
  `);

  // ── activity_log (append-only) ─────────────────────────────────────────────
  await knex.schema.createTable('activity_log', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('actor_id');
    t.text('action').notNullable();
    t.text('resource');
    t.integer('resource_id');
    t.text('ip');
    t.timestamp('ts', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['tenant_id', 'ts']);
    t.index('action');
  });
  // Append-only auf DB-Ebene erzwingen: gilt auch für Admins/Anwendungscode
  await knex.raw(`
    CREATE OR REPLACE FUNCTION activity_log_append_only() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'activity_log ist append-only (% nicht erlaubt)', TG_OP;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await knex.raw(`
    CREATE TRIGGER trg_activity_log_append_only
    BEFORE UPDATE OR DELETE ON activity_log
    FOR EACH ROW EXECUTE FUNCTION activity_log_append_only();
  `);

  // ── documents: Kategorien & Versionierung ──────────────────────────────────
  await knex.schema.alterTable('documents', (t) => {
    t.text('category');
    t.text('folder');
    t.integer('version').notNullable().defaultTo(1);
    t.text('storage_ref');
    t.integer('watermark').notNullable().defaultTo(0);
  });
  await knex.raw(`
    UPDATE documents SET
      category = CASE access_level
        WHEN 'public'   THEN 'teaser'
        WHEN 'nda'      THEN 'im'
        WHEN 'approved' THEN 'dataroom'
        ELSE 'im'
      END,
      storage_ref = file_path
  `);
  await knex.raw(`
    ALTER TABLE documents ADD CONSTRAINT documents_category_check
    CHECK (category IN ('teaser','im','dataroom'))
  `);
};

exports.down = async function (knex) {
  await knex.raw(`DROP TRIGGER IF EXISTS trg_activity_log_append_only ON activity_log`);
  await knex.raw(`DROP FUNCTION IF EXISTS activity_log_append_only`);
  await knex.schema.dropTableIfExists('activity_log');
  await knex.schema.dropTableIfExists('permissions');
  await knex.schema.dropTableIfExists('interests');
  await knex.schema.alterTable('documents', (t) => {
    t.dropColumns('category', 'folder', 'version', 'storage_ref', 'watermark');
  });
  await knex.raw(`ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_deal_status_check`);
  await knex.schema.alterTable('projects', (t) => { t.dropColumn('deal_status'); });
};
