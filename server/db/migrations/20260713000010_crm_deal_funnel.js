/**
 * Sprint 20: CRM II: Beteiligtenrollen & Sell-Side-Funnel je Mandat.
 *
 *   crm_deal_parties   Wer ist an welchem Mandat beteiligt (Unternehmen/Kontakt),
 *                      in welcher Rolle und auf welcher Funnel-Stufe.
 *                      stage_changed_at ⇒ Verweildauer je Stufe + Stagnations-Warnung.
 *
 *   crm_invitations    DSGVO-konforme Einladung von CRM-Kontakten auf die Plattform
 *                      im DOUBLE-OPT-IN: Der Empfänger muss die Einwilligung aktiv
 *                      bestätigen (Nachweis: Zeitpunkt, IP, Text-Version), bevor ein
 *                      Konto angelegt werden kann. Widerruf jederzeit möglich.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('crm_deal_parties', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    t.integer('company_id').references('id').inTable('crm_companies').onDelete('SET NULL');
    t.integer('contact_id').references('id').inTable('crm_contacts').onDelete('SET NULL');
    // buyer | advisor | seller | bank | lawyer | target | other
    t.text('party_role').notNullable().defaultTo('buyer');
    // 0 Longlist · 1 Angesprochen · 2 Rückmeldung · 3 NDA · 4 IM/Unterlagen
    // 5 Gespräch · 6 Angebot/LOI · 7 Due Diligence · 8 Abgeschlossen
    t.integer('funnel_stage').notNullable().defaultTo(0);
    // active | dropped | open | unclear
    t.text('party_status').notNullable().defaultTo('open');
    t.integer('replied').notNullable().defaultTo(0);
    t.date('first_contact');
    t.date('last_contact');
    t.integer('mails_sent').notNullable().defaultTo(0);
    t.text('next_step');
    t.text('notes');
    t.timestamp('stage_changed_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['project_id', 'contact_id']);
    t.index('tenant_id'); t.index('project_id'); t.index('funnel_stage');
  });

  await knex.schema.createTable('crm_invitations', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('contact_id').references('id').inTable('crm_contacts').onDelete('CASCADE');
    t.text('email').notNullable();
    t.text('token').notNullable().unique();
    t.text('message');
    // invited → opened → consented → registered  (bzw. declined | revoked | expired)
    t.text('status').notNullable().defaultTo('invited');
    // DSGVO-Nachweis der Einwilligung (Double-Opt-in)
    t.timestamp('consent_at', { useTz: true });
    t.text('consent_ip');
    t.text('consent_text_version');
    t.integer('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.integer('invited_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('invited_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('opened_at', { useTz: true });
    t.timestamp('registered_at', { useTz: true });
    t.timestamp('expires_at', { useTz: true });
    t.index('tenant_id'); t.index('contact_id'); t.index('email');
  });

  for (const table of ['crm_deal_parties', 'crm_invitations']) {
    await knex.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    await knex.raw(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    await knex.raw(`
      CREATE POLICY tenant_isolation_${table} ON ${table}
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true)::int)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`);
  }
};

exports.down = async function (knex) {
  for (const table of ['crm_invitations', 'crm_deal_parties']) {
    await knex.raw(`DROP POLICY IF EXISTS tenant_isolation_${table} ON ${table}`);
    await knex.schema.dropTableIfExists(table);
  }
};
