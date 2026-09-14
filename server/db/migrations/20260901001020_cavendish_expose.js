/**
 * Cavendish: WebExposé befüllen und veröffentlichen (Eckdaten + Sektionen).
 * Inhalte aus IM/Teaser abgeleitet. Gründername bleibt anonymisiert, da das
 * Exposé zwar hinter dem NDA-Gate liegt, in der Vertriebsphase aber breit
 * geteilt wird. Idempotent: legt die Exposé-Zeile an oder aktualisiert sie.
 */
const KEYFACTS = {
  country: 'Deutschland',
  region: 'Deutschland',
  industries: 'Wasserstoff / Cleantech (PEM-Elektrolyseur-Stacks)',
  founding_year: '',
  legal_form: '',
  employees: 'Gründergeführt, schlankes Kernteam',
  locations: 'Deutschland',
  revenue_band: 'Vorumsatzphase, erste Umsätze ab 2027 (Planumsatz 7,5 Mio. EUR in 2028)',
  ebit_band: '',
  gf_availability: 'Gründer bleibt operativ an Bord und führt die Technologie',
  stake_offered: 'ca. 10 % (Seed I)',
  participation_type: 'Eigenkapital, Minderheitsbeteiligung (Kapitalerhöhung)',
  price_band: 'Seed I: 0,75 Mio. EUR bei 7,5 Mio. EUR Post-Money',
  purchase_modalities: 'Primärkapital über Kapitalerhöhung; Anschlussrunde Seed II (10 Mio. EUR bei 30 Mio. EUR Post-Money) für 07/2027 geplant',
};

const SECTIONS = [
  { key: 'company', title: 'Unternehmen & Historie', enabled: true, body:
    'Deutscher Deep-Tech-Entwickler von PEM-Elektrolyseur-Stacks der nächsten Generation für dezentral erzeugten grünen Wasserstoff. '
    + 'Der Gründer ist seit 1991 in der Wasserstofftechnik aktiv, hält über 60 Patente und hat zuvor zwei Elektrolyseur-Unternehmen aufgebaut. '
    + 'Das Unternehmen entwickelt und hält seine Technologie im eigenen Haus; sechs Patente sind angemeldet, ein öffentlicher Zuschuss von über 0,5 Mio. EUR ist bewilligt.' },
  { key: 'offering', title: 'Leistungsspektrum & Geschäftsmodell', enabled: true, body:
    'Kern des Angebots ist ein PEM-Stack, der bei gleicher Grundfläche und gleichem Gewicht bis zu 260 % mehr Leistung liefert als der heutige Marktführer. '
    + 'Das Zielkostenniveau liegt unter 300 EUR/kW gegenüber rund 500 EUR/kW am Markt, bei 100 % Qualitätskontrolle. '
    + 'Das Geschäftsmodell ist kapitalschonend und OEM-orientiert: Der Stack wird an Anlagenbauer und Integratoren verkauft, nicht in Einzelprojekte. '
    + 'Die Produktfamilie umfasst einen S-Stack sowie L- und XL-Stacks für größere Leistungsklassen.' },
  { key: 'market', title: 'Markt & Wettbewerb', enabled: true, body:
    'Der Markt für PEM-Elektrolyseure wächst mit rund 50 % pro Jahr; die EU-Regulierung wirkt als Nachfragetreiber. '
    + 'Etablierte Anbieter wie Bosch und PlugPower sind im Markt aktiv. '
    + 'Die Differenzierung liegt in Leistungsdichte und Stückkosten: mehr Leistung pro Bauraum bei deutlich niedrigeren Kosten je Kilowatt.' },
  { key: 'organization', title: 'Organisation & Mitarbeiter', enabled: true, body:
    'Das Unternehmen ist gründergeführt. Seed I finanziert eine erfahrene Vertriebseinstellung mit über 12 Jahren Erfahrung im Stack-Vertrieb, '
    + 'die einen großen Teil der kommerziellen Arbeit übernimmt. Investor Relations und Fördermittel werden extern unterstützt.' },
  { key: 'financials', title: 'Finanzen (Kurzüberblick)', enabled: true, body:
    'Das Unternehmen befindet sich in der Vorumsatzphase. Bereits investiert: 0,75 Mio. EUR; bewilligter öffentlicher Zuschuss über 0,5 Mio. EUR. '
    + 'Seed I: 0,75 Mio. EUR bei 7,5 Mio. EUR Post-Money. Seed II (geplant 07/2027): 10 Mio. EUR bei 30 Mio. EUR Post-Money. '
    + 'Planumsatz 7,5 Mio. EUR in 2028 mit Start des L- und XL-Stack-Vertriebs.' },
  { key: 'swot', title: 'Stärken & Entwicklungspotenziale', enabled: true, body:
    'Stärken: Produktsprung von bis zu 260 % Leistung bei gleicher Baugröße, Kostenpfad unter 300 EUR/kW, Gründer mit über 30 Jahren Erfahrung und 60+ Patenten, '
    + '11 unterzeichnete Absichtserklärungen deutscher Integratoren, unternehmenseigenes geistiges Eigentum. '
    + 'Potenziale: Skalierung vom Prototyp in die Serie, Aufbau der Serienfertigung und die Anschlussfinanzierung (Seed II) in 2027.' },
  { key: 'realestate', title: 'Immobilien & Anlagen', enabled: false, body: '' },
  { key: 'buyer', title: 'Investorenprofil & Finanzierungsanlass', enabled: true, body:
    'Angesprochen werden Cleantech- und Deep-Tech-Investoren, Family Offices sowie strategische Partner aus dem Wasserstoff- und Anlagenbau-Umfeld. '
    + 'Die Mittel aus Seed I finanzieren drei extern validierte Prototypen, den Vertriebsstart und die Vorbereitung der Serienreife. '
    + 'Der Gründer bleibt operativ führend; gesucht wird Kapital, das die Technologie in die Vermarktung bringt.' },
  { key: 'process', title: 'Prozess & nächste Schritte', enabled: true, body:
    'Erster Schritt ist die digitale Zeichnung des NDA. Danach folgen Zugang zum Datenraum und zum Informationsmemorandum, ein Management-Call, '
    + 'ein Term Sheet, die Due Diligence und das Closing der Seed-I-Runde. Die Ansprache erfolgt vertraulich und in einem strukturierten Prozess.' },
];

exports.up = async function (knex) {
  const p = await knex('projects').where({ codename: 'Cavendish' }).first().catch(() => null);
  if (!p) return;
  const existing = await knex('exposes').where({ project_id: p.id }).first().catch(() => null);
  const row = {
    keyfacts_json: JSON.stringify(KEYFACTS),
    sections_json: JSON.stringify(SECTIONS),
    status: 'published',
    anonymized_ack: 1,
    published_at: knex.fn.now(),
    updated_at: knex.fn.now(),
  };
  if (existing) {
    await knex('exposes').where({ id: existing.id }).update(row).catch(() => {});
  } else {
    await knex('exposes').insert({ tenant_id: p.tenant_id || 1, project_id: p.id, ...row }).catch(() => {});
  }
};

exports.down = async function (knex) {
  const p = await knex('projects').where({ codename: 'Cavendish' }).first().catch(() => null);
  if (!p) return;
  await knex('exposes').where({ project_id: p.id }).update({ status: 'draft' }).catch(() => {});
};
