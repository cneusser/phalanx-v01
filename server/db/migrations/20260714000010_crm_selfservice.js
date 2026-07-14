/**
 * CRM IV: Kontakt-Selbstpflege-Portal.
 *
 * Externe Kontakte pflegen ihre Daten selbst über einen persönlichen,
 * gesicherten Link. Das hält die Datenbank aktuell und ist zugleich der
 * sauberste DSGVO-Weg: Der Betroffene sieht, was gespeichert ist, korrigiert es
 * selbst und kann die Kontaktaufnahme jederzeit einschränken oder abbestellen.
 *
 *   crm_contacts (+Spalten)  Investitionsschwerpunkte, Branchen-/Regionenfokus,
 *                            Ticketgrößen, Kommunikationspräferenz
 *   crm_profile_links        persönlicher Token je Kontakt (widerrufbar, befristet)
 *   crm_profile_changes      revisionssicheres Protokoll JEDER Selbstpflege-Änderung;
 *                            je nach Link entweder direkt übernommen oder erst nach
 *                            interner Freigabe
 */
exports.up = async function (knex) {
  // ── Profilfelder für die Selbstpflege ────────────────────────────────────
  const cols = [
    ['focus_industries', (t) => t.text('focus_industries').notNullable().defaultTo('[]')],
    ['focus_regions', (t) => t.text('focus_regions').notNullable().defaultTo('[]')],
    ['ticket_min', (t) => t.integer('ticket_min')],                       // Mio. €
    ['ticket_max', (t) => t.integer('ticket_max')],                       // Mio. €
    ['investment_focus', (t) => t.text('investment_focus')],              // Freitext
    ['comm_preference', (t) => t.text('comm_preference').notNullable().defaultTo('email')], // email | phone | none
    ['profile_updated_at', (t) => t.timestamp('profile_updated_at', { useTz: true })],
  ];
  for (const [name, add] of cols) {
    const has = await knex.schema.hasColumn('crm_contacts', name);
    if (!has) await knex.schema.alterTable('crm_contacts', add);
  }

  // ── Persönlicher Selbstpflege-Link ───────────────────────────────────────
  await knex.schema.createTable('crm_profile_links', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('contact_id').notNullable().references('id').inTable('crm_contacts').onDelete('CASCADE');
    t.text('token').notNullable().unique();
    t.text('status').notNullable().defaultTo('active');      // active | revoked | expired
    t.integer('requires_approval').notNullable().defaultTo(0); // 1 = Änderungen erst nach interner Freigabe
    t.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('expires_at', { useTz: true });
    t.timestamp('last_opened_at', { useTz: true });
    t.timestamp('last_saved_at', { useTz: true });
    t.index('tenant_id'); t.index('contact_id');
  });

  // ── Änderungsprotokoll (+ Freigabe-Workflow) ─────────────────────────────
  await knex.schema.createTable('crm_profile_changes', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('contact_id').notNullable().references('id').inTable('crm_contacts').onDelete('CASCADE');
    t.integer('link_id').references('id').inTable('crm_profile_links').onDelete('SET NULL');
    t.text('before_json').notNullable().defaultTo('{}');
    t.text('after_json').notNullable().defaultTo('{}');
    t.text('status').notNullable().defaultTo('applied');     // applied | pending | rejected
    t.integer('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('reviewed_at', { useTz: true });
    t.text('ip');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index('tenant_id'); t.index('contact_id'); t.index('status');
  });

  for (const table of ['crm_profile_links', 'crm_profile_changes']) {
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
  for (const table of ['crm_profile_changes', 'crm_profile_links']) {
    await knex.raw(`DROP POLICY IF EXISTS tenant_isolation_${table} ON ${table}`);
    await knex.schema.dropTableIfExists(table);
  }
  for (const name of ['focus_industries', 'focus_regions', 'ticket_min', 'ticket_max',
    'investment_focus', 'comm_preference', 'profile_updated_at']) {
    const has = await knex.schema.hasColumn('crm_contacts', name);
    if (has) await knex.schema.alterTable('crm_contacts', (t) => t.dropColumn(name));
  }
};
