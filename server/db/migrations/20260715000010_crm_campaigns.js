/**
 * Sprint 21: CRM III: Mandats-Kampagnen (Massenmailing) + automatische Reminder.
 *
 *   crm_campaigns             Eine Ansprache-Welle je Mandat: „Einladung zum Mandat",
 *                             „Projekt-Update" oder freie Nachricht. Reminder-Automatik
 *                             (Tag 7 / Tag 21) je Kampagne an-/abschaltbar.
 *
 *   crm_campaign_recipients   Empfängerliste mit Zustellstatus, Reminder-Zähler und
 *                             Verweis auf Einwilligungs-Token (crm_invitations) sowie
 *                             Pflege-Link (crm_profile_links). Reaktion (Einwilligung,
 *                             Registrierung, Widerspruch) beendet die Reminder sofort.
 *
 * DSGVO: Es wird ausschließlich an Kontakte versendet, die weder widersprochen haben
 * noch auf „nicht kontaktieren" stehen. Nach der zweiten Erinnerung ohne Reaktion
 * endet die Ansprache endgültig (status = 'no_response'), kein Dauerfeuer.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('crm_campaigns', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('project_id').references('id').inTable('projects').onDelete('CASCADE');
    t.text('name');
    // invite | update | custom
    t.text('purpose').notNullable().defaultTo('invite');
    t.text('subject');
    t.text('intro');          // persönlicher Einleitungstext des Beraters
    t.integer('reminders_enabled').notNullable().defaultTo(1);
    // draft | sent
    t.text('status').notNullable().defaultTo('sent');
    t.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('sent_at', { useTz: true });
    t.index('tenant_id'); t.index('project_id');
  });

  await knex.schema.createTable('crm_campaign_recipients', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('campaign_id').notNullable().references('id').inTable('crm_campaigns').onDelete('CASCADE');
    t.integer('contact_id').references('id').inTable('crm_contacts').onDelete('CASCADE');
    t.text('email');
    t.integer('invitation_id').references('id').inTable('crm_invitations').onDelete('SET NULL');
    t.integer('profile_link_id').references('id').inTable('crm_profile_links').onDelete('SET NULL');
    // sent | reminded | responded | no_response | skipped | failed
    t.text('status').notNullable().defaultTo('sent');
    t.text('skip_reason');
    t.integer('reminder_count').notNullable().defaultTo(0);
    t.timestamp('sent_at', { useTz: true });
    t.timestamp('last_reminder_at', { useTz: true });
    t.timestamp('responded_at', { useTz: true });
    t.unique(['campaign_id', 'contact_id']);
    t.index('tenant_id'); t.index('campaign_id'); t.index('status');
  });

  for (const table of ['crm_campaigns', 'crm_campaign_recipients']) {
    await knex.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    await knex.raw(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    await knex.raw(`
      CREATE POLICY tenant_isolation_${table} ON ${table}
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true)::int)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`);
  }

  // Einladungen dürfen sich künftig auf ein konkretes Mandat beziehen
  const hasProject = await knex.schema.hasColumn('crm_invitations', 'project_id');
  if (!hasProject) {
    await knex.schema.alterTable('crm_invitations', (t) => {
      t.integer('project_id').references('id').inTable('projects').onDelete('SET NULL');
      t.timestamp('last_reminder_at', { useTz: true });
      t.integer('reminder_count').notNullable().defaultTo(0);
    });
  }
};

exports.down = async function (knex) {
  for (const table of ['crm_campaign_recipients', 'crm_campaigns']) {
    await knex.raw(`DROP POLICY IF EXISTS tenant_isolation_${table} ON ${table}`);
    await knex.schema.dropTableIfExists(table);
  }
  await knex.schema.alterTable('crm_invitations', (t) => {
    t.dropColumn('project_id'); t.dropColumn('last_reminder_at'); t.dropColumn('reminder_count');
  }).catch(() => {});
};
