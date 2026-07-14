/**
 * Sprint 23: Posteingang (BCC-Ingest) & Wiedervorlagen.
 *
 *   crm_messages   Ein- und ausgehende E-Mails am Kontakt. Eingehende Mails kommen
 *                  entweder über den BCC-/Inbound-Webhook (Provider: Brevo, Mailgun,
 *                  Postmark …) oder werden manuell erfasst. Damit steht in der
 *                  Kontakt-Historie endlich auch, was ZURÜCK kam.
 *
 *   crm_tasks      Wiedervorlagen: „bis wann muss ich mich um wen kümmern".
 *                  Wird bei eingehenden Antworten automatisch angelegt und lässt sich
 *                  beim Versand einer Prozess-Mail direkt mit Frist setzen.
 *
 *   users.language Sprachpräferenz (de|en) für Oberfläche und Systemmails.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('crm_messages', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('contact_id').references('id').inTable('crm_contacts').onDelete('CASCADE');
    t.integer('project_id').references('id').inTable('projects').onDelete('SET NULL');
    // in | out
    t.text('direction').notNullable().defaultTo('in');
    t.text('from_email');
    t.text('to_email');
    t.text('subject');
    t.text('body');
    t.text('message_id');
    // webhook | manual | campaign
    t.text('source').notNullable().defaultTo('webhook');
    t.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('sent_at', { useTz: true });
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index('tenant_id'); t.index('contact_id'); t.index('project_id');
  });

  await knex.schema.createTable('crm_tasks', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.text('title').notNullable();
    t.text('notes');
    t.date('due_on');
    // open | done
    t.text('status').notNullable().defaultTo('open');
    t.integer('contact_id').references('id').inTable('crm_contacts').onDelete('CASCADE');
    t.integer('project_id').references('id').inTable('projects').onDelete('SET NULL');
    t.integer('assignee_id').references('id').inTable('users').onDelete('SET NULL');
    // manual | reply | campaign | stagnation
    t.text('source').notNullable().defaultTo('manual');
    t.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('done_at', { useTz: true });
    t.index('tenant_id'); t.index('status'); t.index('due_on'); t.index('contact_id');
  });

  for (const table of ['crm_messages', 'crm_tasks']) {
    await knex.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    await knex.raw(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    await knex.raw(`
      CREATE POLICY tenant_isolation_${table} ON ${table}
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true)::int)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`);
  }

  const hasLang = await knex.schema.hasColumn('users', 'language');
  if (!hasLang) {
    await knex.schema.alterTable('users', (t) => { t.text('language').notNullable().defaultTo('de'); });
  }
};

exports.down = async function (knex) {
  for (const table of ['crm_messages', 'crm_tasks']) {
    await knex.raw(`DROP POLICY IF EXISTS tenant_isolation_${table} ON ${table}`);
    await knex.schema.dropTableIfExists(table);
  }
  await knex.schema.alterTable('users', (t) => { t.dropColumn('language'); }).catch(() => {});
};
