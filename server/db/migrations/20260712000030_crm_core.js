/**
 * Sprint 19: CRM I: Unternehmen & Kontakte (Fundament des Sell-Side-CRM).
 *
 *   crm_companies         Zentrale Unternehmensdatenbank (Käufer, Zielunternehmen,
 *                         Investoren, Berater …) inkl. Konzernverknüpfung.
 *   crm_contacts          Ansprechpartner mit DSGVO-Einwilligung/Kontaktstatus.
 *   crm_company_contacts  n:m: ein Kontakt kann mehreren Unternehmen zugeordnet
 *                         sein; über started_on/ended_on entsteht die HISTORIE
 *                         früherer Positionen und Unternehmenswechsel.
 *
 * Alles mandantenfähig (tenant_id + RLS, fail closed), Voraussetzung dafür,
 * dass später Dritte das CRM nutzen können.
 */
exports.up = async function (knex) {
  // ── Unternehmen ───────────────────────────────────────────────────────────
  await knex.schema.createTable('crm_companies', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.text('name').notNullable();
    t.text('name_normalized');            // für Dubletten-Erkennung
    t.text('street');
    t.text('postal_code');
    t.text('city');
    t.text('country');
    t.text('website');
    t.text('industry');
    t.text('region');
    t.text('revenue_band');               // Umsatz (Band oder Freitext)
    t.integer('employees');
    t.text('company_type');               // Stratege | PE | Family Office | MBI | Bank | Berater | Zielunternehmen …
    t.text('buyer_category');             // Käuferkategorie
    t.text('investment_criteria');        // Investitionskriterien (Freitext)
    t.text('description');
    t.text('notes');
    t.text('tags_json').notNullable().defaultTo('[]');
    t.integer('parent_company_id').references('id').inTable('crm_companies').onDelete('SET NULL'); // Mutter-/Tochter-/Beteiligung
    t.text('relation_to_parent');         // Tochter | Beteiligung | Schwester …
    t.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index('tenant_id'); t.index('name_normalized'); t.index('industry'); t.index('region');
  });

  // ── Kontakte ──────────────────────────────────────────────────────────────
  await knex.schema.createTable('crm_contacts', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.text('salutation');
    t.text('title');
    t.text('first_name');
    t.text('last_name').notNullable();
    t.text('email');
    t.text('phone');
    t.text('mobile');
    t.text('linkedin_url');
    t.text('location');                   // Standort
    t.text('responsibility');             // Verantwortungsbereich
    t.text('relationship');               // Beziehung zum Kontakt (persönlich bekannt, kalt …)
    t.text('notes');
    t.text('tags_json').notNullable().defaultTo('[]');
    t.integer('is_decision_maker').notNullable().defaultTo(0);
    // DSGVO: Einwilligung + Kontaktstatus
    t.text('consent_status').notNullable().defaultTo('unknown');  // unknown | opt_in | opt_out
    t.timestamp('consent_at', { useTz: true });
    t.text('contact_status').notNullable().defaultTo('active');   // active | do_not_contact | bounced
    t.integer('user_id').references('id').inTable('users').onDelete('SET NULL'); // ggf. Plattform-Konto
    t.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index('tenant_id'); t.index('email'); t.index('last_name');
  });

  // ── Zuordnung Kontakt ↔ Unternehmen (inkl. Positions-Historie) ────────────
  await knex.schema.createTable('crm_company_contacts', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('company_id').notNullable().references('id').inTable('crm_companies').onDelete('CASCADE');
    t.integer('contact_id').notNullable().references('id').inTable('crm_contacts').onDelete('CASCADE');
    t.text('position');                   // Position IN diesem Unternehmen
    t.integer('is_primary').notNullable().defaultTo(0);
    t.date('started_on');
    t.date('ended_on');                   // NULL = aktuelle Position; gesetzt = Historie
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index('tenant_id'); t.index('company_id'); t.index('contact_id');
  });

  for (const table of ['crm_companies', 'crm_contacts', 'crm_company_contacts']) {
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
  for (const table of ['crm_company_contacts', 'crm_contacts', 'crm_companies']) {
    await knex.raw(`DROP POLICY IF EXISTS tenant_isolation_${table} ON ${table}`);
    await knex.schema.dropTableIfExists(table);
  }
};
