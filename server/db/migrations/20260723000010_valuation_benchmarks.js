/**
 * Sprint 12 — Bewertung 2.0: Branchen-Benchmarks.
 *
 * Orientierungswerte für KMU im DACH-Raum (EBIT-Marge, Umsatzwachstum,
 * Personalkostenquote) als Quartilsbänder. Bewusst als Startwerte hinterlegt und
 * im Admin pflegbar — sie sind Gesprächsanker, keine amtliche Statistik.
 * Quelle offen ausgewiesen (Phalanx-Schätzung auf Basis DUB/FINANCE/Destatis-Bänder).
 */
const SOURCE = 'Phalanx-Schätzung (DUB-KMU-Multiples, FINANCE-M&A-Panel, Destatis-Kostenstrukturen), Q2/2026';

// [Branche, EBIT p25, median, p75, Wachstum p25, median, p75, Personalquote p25, median, p75]
const ROWS = [
  ['Maschinen- und Anlagenbau', 4, 7, 11, 0, 3, 6, 22, 28, 34],
  ['Elektrotechnik / Elektronik', 5, 8, 12, 1, 4, 8, 24, 30, 36],
  ['Bauwirtschaft / Bauhandwerk', 3, 5, 9, 0, 3, 7, 25, 32, 38],
  ['Metallverarbeitung', 3, 6, 10, -1, 2, 5, 24, 30, 36],
  ['Kunststoffverarbeitung', 4, 7, 11, 0, 3, 6, 20, 26, 32],
  ['Chemie / Pharma', 8, 13, 18, 1, 4, 8, 16, 22, 28],
  ['Nahrungsmittel / Getränke', 3, 6, 10, 0, 2, 5, 18, 24, 30],
  ['Handel / Großhandel', 2, 4, 7, 0, 2, 5, 10, 15, 21],
  ['Einzelhandel', 1, 3, 6, -2, 1, 4, 12, 18, 24],
  ['Transport / Logistik', 2, 5, 8, 0, 3, 6, 25, 32, 39],
  ['IT / Software', 8, 14, 22, 3, 9, 18, 40, 50, 60],
  ['IT-Dienstleistung / Systemhaus', 5, 9, 14, 2, 6, 12, 45, 55, 63],
  ['Beratung / Professional Services', 8, 14, 22, 2, 6, 12, 45, 55, 65],
  ['Gesundheit / Pflege', 3, 6, 10, 1, 4, 8, 45, 55, 65],
  ['Bildung / Weiterbildung', 4, 8, 13, 0, 3, 7, 40, 50, 60],
  ['Energie / Umwelttechnik', 5, 9, 14, 2, 6, 12, 20, 27, 34],
  ['Immobilien / Facility', 6, 11, 17, 0, 3, 7, 25, 33, 42],
  ['Medien / Marketing', 4, 8, 13, -1, 3, 8, 40, 50, 60],
  ['Textil / Konsumgüter', 2, 5, 9, -2, 1, 4, 18, 25, 32],
  ['Sonstige Dienstleistungen', 3, 6, 10, 0, 3, 6, 30, 40, 50],
];

exports.up = async function (knex) {
  await knex.schema.createTable('valuation_benchmarks', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.text('industry').notNullable();
    t.float('ebit_margin_p25'); t.float('ebit_margin_median'); t.float('ebit_margin_p75');
    t.float('growth_p25'); t.float('growth_median'); t.float('growth_p75');
    t.float('personnel_ratio_p25'); t.float('personnel_ratio_median'); t.float('personnel_ratio_p75');
    t.text('source');
    t.integer('updated_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['tenant_id', 'industry']);
    t.index('tenant_id');
  });

  await knex.raw('ALTER TABLE valuation_benchmarks ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE valuation_benchmarks FORCE ROW LEVEL SECURITY');
  await knex.raw(`
    CREATE POLICY tenant_isolation_valuation_benchmarks ON valuation_benchmarks
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::int)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`);

  for (const r of ROWS) {
    const [industry, e25, e50, e75, g25, g50, g75, p25, p50, p75] = r;
    const exists = await knex('valuation_benchmarks').where({ tenant_id: 1, industry }).first().catch(() => null);
    if (!exists) {
      await knex('valuation_benchmarks').insert({
        tenant_id: 1, industry,
        ebit_margin_p25: e25, ebit_margin_median: e50, ebit_margin_p75: e75,
        growth_p25: g25, growth_median: g50, growth_p75: g75,
        personnel_ratio_p25: p25, personnel_ratio_median: p50, personnel_ratio_p75: p75,
        source: SOURCE,
      });
    }
  }
};

exports.down = async function (knex) {
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_valuation_benchmarks ON valuation_benchmarks');
  await knex.schema.dropTableIfExists('valuation_benchmarks');
};

exports.ROWS = ROWS;
