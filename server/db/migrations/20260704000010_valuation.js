/**
 * Sprint 6 — Bewertungs-Quick-Check (Lead-Magnet).
 *
 * - valuation_multiples: indikative Branchen-Multiples je NACE-Abschnitt
 *   (EBIT-Multiple min/avg/max + Umsatz-Multiple min/max). Von Phalanx pflegbar.
 * - valuations: gespeicherte Bewertungsläufe/Leads (Eingaben + Ergebnisse,
 *   optionale Lead-E-Mail). tenant_id + RLS wie alle Fachtabellen.
 *
 * WICHTIG: Werte sind INDIKATIV (keine Fremd-Multiples kopiert). Quelle als
 * eigene, konservative Schätzung dokumentiert; jederzeit im Admin änderbar.
 */

// Startwerte je NACE-Abschnitt (key = führender Abschnittsbuchstabe/-bereich).
// Bänder bewusst breit & konservativ, klar als „indikativ" deklariert.
const SEED = [
  // key,  label,                              ebit_min, ebit_avg, ebit_max, rev_min, rev_max
  ['C',  'Verarbeitendes Gewerbe / Industrie', 4.0, 5.5, 7.5, 0.5, 1.2],
  ['J',  'Software / IT / Kommunikation',       6.0, 8.5, 12.0, 1.0, 3.0],
  ['G',  'Handel & E-Commerce',                 3.5, 4.8, 6.5, 0.3, 0.8],
  ['H',  'Transport & Logistik',                4.0, 5.2, 6.8, 0.4, 0.9],
  ['I',  'Gastgewerbe & Beherbergung',          3.0, 4.2, 5.5, 0.4, 1.0],
  ['F',  'Baugewerbe',                          3.5, 4.5, 6.0, 0.3, 0.7],
  ['M',  'Freiberufl./techn. Dienstleistungen', 4.5, 6.0, 8.0, 0.6, 1.5],
  ['N',  'Sonstige Unternehmensdienste',        4.0, 5.5, 7.0, 0.5, 1.2],
  ['Q',  'Gesundheit & Sozialwesen',            4.5, 6.0, 8.0, 0.7, 1.8],
  ['A',  'Land-/Forstwirtschaft & Rohstoffe',   3.5, 4.5, 6.0, 0.4, 1.0],
  ['D',  'Energie- & Wasserversorgung',         5.0, 6.5, 8.5, 0.8, 2.0],
  ['K',  'Finanz- & Versicherungsdienste',      5.0, 7.0, 9.5, 1.0, 2.5],
  ['L',  'Immobilienwesen',                     5.5, 7.5, 10.0, 1.5, 4.0],
  ['P',  'Bildung & Unterricht',                4.0, 5.0, 6.5, 0.6, 1.5],
  ['R',  'Kunst, Unterhaltung & Freizeit',      3.5, 4.5, 6.0, 0.5, 1.2],
  ['S',  'Sonstige Dienstleistungen',           3.5, 4.8, 6.5, 0.4, 1.0],
  // Fallback, falls keine Zuordnung möglich ist
  ['X',  'Allgemein (branchenübergreifend)',    4.0, 5.5, 7.0, 0.5, 1.2],
];

exports.up = async function (knex) {
  await knex.schema.createTable('valuation_multiples', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.text('nace_section').notNullable();       // A, C, J, … oder X (Fallback)
    t.text('label').notNullable();
    t.float('ebit_multiple_min').notNullable();
    t.float('ebit_multiple_avg').notNullable();
    t.float('ebit_multiple_max').notNullable();
    t.float('revenue_multiple_min').notNullable();
    t.float('revenue_multiple_max').notNullable();
    t.text('source').notNullable().defaultTo('Phalanx – indikative Schätzung');
    t.timestamp('valid_from', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['tenant_id', 'nace_section']);
    t.index('tenant_id');
  });

  await knex.schema.createTable('valuations', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.text('lead_email');                       // optional (anonymer Quick-Check)
    t.text('lead_name');
    t.integer('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.text('nace_section');
    t.text('inputs_json').notNullable().defaultTo('{}');
    t.text('results_json').notNullable().defaultTo('{}');
    t.integer('privacy_consent').notNullable().defaultTo(0);
    t.text('ip');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index('tenant_id');
    t.index('created_at');
  });

  // RLS aktivieren (Sprint-5-Muster, fail closed)
  for (const table of ['valuation_multiples', 'valuations']) {
    await knex.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    await knex.raw(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    await knex.raw(`
      CREATE POLICY tenant_isolation_${table} ON ${table}
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true)::int)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)
    `);
  }

  // Indikative Startwerte seeden (Default-Tenant 1)
  for (const [key, label, em, ea, ex, rm, rx] of SEED) {
    await knex('valuation_multiples').insert({
      tenant_id: 1, nace_section: key, label,
      ebit_multiple_min: em, ebit_multiple_avg: ea, ebit_multiple_max: ex,
      revenue_multiple_min: rm, revenue_multiple_max: rx,
    });
  }
};

exports.down = async function (knex) {
  for (const table of ['valuations', 'valuation_multiples']) {
    await knex.raw(`DROP POLICY IF EXISTS tenant_isolation_${table} ON ${table}`);
    await knex.schema.dropTableIfExists(table);
  }
};
