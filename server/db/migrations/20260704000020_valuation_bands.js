/**
 * Sprint 6.1: Multiples auf Branche × Größenklasse umstellen (DUB-Struktur).
 *
 * valuation_multiples wird von „NACE-Abschnitt, ein Band" auf 20 Branchen mit
 * drei Größenklassen (Micro < 5 Mio. €, Small 5–50 Mio. €, Mid > 50 Mio. € Umsatz)
 * je EBIT-Multiple von–bis umgebaut. Umsatz-Multiple bleibt als Plausibilitätsband.
 *
 * Quelle der EBIT-Multiples: DUB KMU-Multiples (Stand Q2/2026), im Admin pflegbar.
 * Die Ergebnisse bleiben ausdrücklich INDIKATIV (kein IDW-S1-Gutachten, kein Marktpreis).
 */

// key, label,                                         micro von/bis, small von/bis, mid von/bis, rev von/bis, sort
const SEED = [
  ['maschinenbau',   'Maschinen- und Anlagenbau',                    3.5, 4.5, 4.6, 6.0, 5.6, 7.1, 0.4, 0.9, 10],
  ['automotive',     'Fahrzeugbau & Automotive',                     2.8, 4.5, 3.8, 5.1, 4.7, 6.1, 0.3, 0.7, 20],
  ['elektrotechnik', 'Elektrotechnik & Elektronik',                  4.2, 6.2, 5.5, 8.0, 6.9, 8.7, 0.5, 1.1, 30],
  ['metall',         'Metallverarbeitung & Fertigungstechnik',       3.4, 4.2, 3.9, 5.4, 4.8, 7.0, 0.3, 0.7, 40],
  ['chemie',         'Chemie, Kunststoffe & Verpackung',             3.6, 4.6, 5.2, 6.4, 6.4, 8.1, 0.5, 1.1, 50],
  ['medizintechnik', 'Medizintechnik & Life Sciences',               6.1, 8.0, 6.8, 9.0, 8.0, 9.8, 1.0, 2.5, 60],
  ['software',       'Software & Digitale Plattformen',              6.3, 8.0, 7.8, 9.5, 8.5, 10.9, 1.5, 4.0, 70],
  ['it_services',    'IT-Services & Systemhäuser',                   5.7, 6.8, 6.8, 8.5, 8.1, 10.5, 0.8, 2.0, 80],
  ['medien',         'Medien, Marketing & Agenturen',                3.1, 5.0, 4.9, 6.6, 6.1, 7.7, 0.5, 1.2, 90],
  ['telekom',        'Telekommunikation & Infrastruktur',            4.8, 6.7, 5.9, 7.9, 6.8, 8.4, 0.8, 2.0, 100],
  ['gesundheit',     'Gesundheitswesen: Pflege & Dienstleister',     4.0, 6.0, 5.5, 7.2, 7.7, 9.6, 0.6, 1.5, 110],
  ['b2b_dienste',    'Unternehmensnahe Dienstleistungen (B2B)',      3.5, 5.5, 5.0, 7.0, 6.1, 7.4, 0.5, 1.2, 120],
  ['bau',            'Bauhaupt- & Baunebengewerbe (Handwerk)',       3.8, 5.0, 4.4, 5.8, 5.8, 7.2, 0.3, 0.7, 130],
  ['immobilien',     'Immobilien-Dienstl. & Facility Mgmt.',         4.1, 5.0, 5.2, 6.7, 6.3, 7.6, 0.8, 2.0, 140],
  ['finanz',         'Finanzdienstleistungen & Vers.-Makler',        5.0, 6.5, 6.0, 7.7, 7.9, 9.4, 0.8, 2.0, 150],
  ['nahrung',        'Nahrungs- & Genussmittel',                     4.4, 5.8, 5.5, 7.0, 6.7, 8.0, 0.4, 1.0, 160],
  ['konsum',         'Konsumgüter (Non-Food)',                       2.4, 4.0, 3.5, 5.5, 4.6, 6.1, 0.3, 0.8, 170],
  ['ecommerce',      'Handel: E-Commerce & Versand',                 4.3, 6.9, 5.4, 7.3, 7.5, 9.4, 0.4, 1.2, 180],
  ['handel',         'Handel: Groß- & Einzelhandel (Stationär)',     3.4, 5.0, 4.4, 5.6, 5.1, 6.8, 0.2, 0.6, 190],
  ['logistik',       'Transport, Logistik & Spedition',              3.7, 5.2, 4.5, 5.6, 5.6, 7.0, 0.3, 0.8, 200],
  // Fallback (branchenübergreifend), falls keine Zuordnung getroffen wird
  ['sonstige',       'Sonstige / branchenübergreifend',              3.5, 5.0, 4.5, 6.5, 5.5, 7.5, 0.4, 1.0, 999],
];

const SOURCE = 'DUB KMU-Multiples (Q2/2026)';

exports.up = async function (knex) {
  // Alte Tabelle (NACE-Abschnitt, ein Band) verwerfen und neu aufbauen.
  await knex.raw(`DROP POLICY IF EXISTS tenant_isolation_valuation_multiples ON valuation_multiples`);
  await knex.schema.dropTableIfExists('valuation_multiples');

  await knex.schema.createTable('valuation_multiples', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.text('industry_key').notNullable();   // Slug, z. B. 'software'
    t.text('label').notNullable();
    // EBIT-Multiple je Größenklasse (von–bis)
    t.float('micro_ebit_min').notNullable();
    t.float('micro_ebit_max').notNullable();
    t.float('small_ebit_min').notNullable();
    t.float('small_ebit_max').notNullable();
    t.float('mid_ebit_min').notNullable();
    t.float('mid_ebit_max').notNullable();
    // Umsatz-Multiple (Plausibilitätsband, größenklassenübergreifend)
    t.float('revenue_multiple_min').notNullable();
    t.float('revenue_multiple_max').notNullable();
    t.text('source').notNullable().defaultTo(SOURCE);
    t.integer('sort_order').notNullable().defaultTo(500);
    t.timestamp('valid_from', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['tenant_id', 'industry_key']);
    t.index('tenant_id');
  });

  await knex.raw(`ALTER TABLE valuation_multiples ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`ALTER TABLE valuation_multiples FORCE ROW LEVEL SECURITY`);
  await knex.raw(`
    CREATE POLICY tenant_isolation_valuation_multiples ON valuation_multiples
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::int)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)
  `);

  for (const [key, label, miMin, miMax, smMin, smMax, mdMin, mdMax, rMin, rMax, sort] of SEED) {
    await knex('valuation_multiples').insert({
      tenant_id: 1, industry_key: key, label,
      micro_ebit_min: miMin, micro_ebit_max: miMax,
      small_ebit_min: smMin, small_ebit_max: smMax,
      mid_ebit_min: mdMin, mid_ebit_max: mdMax,
      revenue_multiple_min: rMin, revenue_multiple_max: rMax,
      source: SOURCE, sort_order: sort,
    });
  }
};

exports.down = async function (knex) {
  await knex.raw(`DROP POLICY IF EXISTS tenant_isolation_valuation_multiples ON valuation_multiples`);
  await knex.schema.dropTableIfExists('valuation_multiples');
};
