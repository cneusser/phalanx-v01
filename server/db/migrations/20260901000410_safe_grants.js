/**
 * Datenraum-Freigaben direkt im Safe (Drooms-Modell). Eine Freigabe gilt für eine
 * Datei ODER einen Ordner (mit Vererbung auf den Inhalt) und richtet sich an:
 *   subject_type = 'user'        (subject_ref = users.id)
 *   subject_type = 'buyer_group' (subject_ref = Käufertyp, z. B. 'strategic')
 *   subject_type = 'party_all'   (alle Beteiligten des Mandats, subject_ref NULL)
 *   subject_type = 'group'       (subject_ref = safe_groups.id, eigene Gruppe)
 * level = 'read' (nur Ansicht) | 'download'.
 */
exports.up = async function (knex) {
  if (!(await knex.schema.hasTable('safe_groups'))) {
    await knex.schema.createTable('safe_groups', (t) => {
      t.increments('id').primary();
      t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
      t.integer('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
      t.text('name').notNullable();
      t.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
      t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      t.index('tenant_id'); t.index('project_id');
    });
  }
  if (!(await knex.schema.hasTable('safe_group_members'))) {
    await knex.schema.createTable('safe_group_members', (t) => {
      t.increments('id').primary();
      t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
      t.integer('group_id').notNullable().references('id').inTable('safe_groups').onDelete('CASCADE');
      t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.unique(['group_id', 'user_id']);
      t.index('tenant_id'); t.index('group_id');
    });
  }
  if (!(await knex.schema.hasTable('safe_grants'))) {
    await knex.schema.createTable('safe_grants', (t) => {
      t.increments('id').primary();
      t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
      t.integer('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
      t.integer('item_id').notNullable().references('id').inTable('safe_items').onDelete('CASCADE');
      t.text('subject_type').notNullable();  // user | buyer_group | party_all | group
      t.text('subject_ref');                 // users.id | Käufertyp | NULL | safe_groups.id
      t.text('level').notNullable().defaultTo('read'); // read | download
      t.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
      t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      t.unique(['item_id', 'subject_type', 'subject_ref']);
      t.index('tenant_id'); t.index('project_id'); t.index('item_id');
    });
  }
  for (const tbl of ['safe_groups', 'safe_group_members', 'safe_grants']) {
    await knex.raw(`ALTER TABLE ${tbl} ENABLE ROW LEVEL SECURITY`).catch(() => {});
    await knex.raw(`ALTER TABLE ${tbl} FORCE ROW LEVEL SECURITY`).catch(() => {});
    await knex.raw(`
      CREATE POLICY tenant_isolation_${tbl} ON ${tbl}
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::int)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`).catch(() => {});
  }
};

exports.down = async function (knex) {
  for (const tbl of ['safe_grants', 'safe_group_members', 'safe_groups']) {
    await knex.raw(`DROP POLICY IF EXISTS tenant_isolation_${tbl} ON ${tbl}`).catch(() => {});
    await knex.schema.dropTableIfExists(tbl);
  }
};
