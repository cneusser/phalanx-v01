/**
 * Seed: Fundraising-Mandat „Cavendish" (hyworx GmbH, anonymisiert).
 *
 * Deep-Tech Seed-Runde: neuartige PEM-Elektrolyse-Stacks für dezentralen
 * Grün-Wasserstoff. Auf dem Marktplatz anonym (Codename Cavendish), Klarname
 * hyworx erst im CIM hinter der Freigabe. Angelegt als ENTWURF (status 'draft'),
 * damit Christian vor der Veröffentlichung prüft und die beiden Dokumente
 * (Teaser öffentlich, CIM hinter Zugang) in den Datenraum hochlädt.
 *
 * Idempotent: legt nur an, wenn der Codename noch nicht existiert.
 */
const PUBLIC = {
  codename: 'Cavendish',
  industry: 'CleanTech / Green Hydrogen (PEM electrolyzer stacks)',
  region: 'Germany (Baltic coast), DACH core market',
  location_city: 'Northern Germany',
  deal_type: 'Seed financing (equity)',
  mandate_type: 'fundraising',
  revenue_band: 'Pre-revenue; first sales 2027 (EUR 1.0m), 2028 EUR 7.5m (plan)',
  ebitda_band: 'Development stage (pre-profit)',
  stage: 'Seed',
  investment_needed: 750000,          // Seed I (current round)
  equity_stake: 10,                   // ~10 % at EUR 7.5m post-money
  post_money_valuation: 7500000,      // Seed I post-money
  tam_band: 'PEM electrolyzers ~USD 2.0bn (2030); DACH revenue potential ~EUR 36m p.a.',
  sector_emoji: '⚡',
  short_description:
    'German deep-tech developer of next-generation PEM electrolyzer stacks for decentralised green hydrogen. ' +
    'The stacks deliver up to 260 % more power at the same footprint and weight than the current market leader, ' +
    'with a cost target below 300 EUR/kW and 100 % quality control. OEM model: the core stack is sold to plant ' +
    'builders and integrators, not projects; 10 letters of intent are already signed. Founder is a hydrogen ' +
    'pioneer (active since 1991, 60+ patents). Raising Seed I (EUR 0.75m at EUR 7.5m post-money), followed by ' +
    'Seed II (EUR 10m at EUR 30m post-money, planned 07/2027).',
  highlights: [
    'Product leap: up to +260 % power at the same footprint and weight',
    'Cost path to < 300 EUR/kW vs ~500 EUR/kW on the market today',
    'Founder-led deep tech: hydrogen pioneer, 60+ patents, two prior electrolyzer companies',
    'Capital-light OEM model: 10 letters of intent from German integrators signed',
    'Large, fast market: PEM electrolyzers ~50 % CAGR, EU regulation as tailwind',
    'De-risked: EUR 0.75m invested, > EUR 0.5m public grant approved, 6 patents filed',
  ],
};

const DETAILS = {
  full_description:
    'hyworx GmbH (Wismar, 2024) develops and industrialises a novel PEM electrolyzer stack, the core module that ' +
    'splits water into hydrogen. Its S / L / XL stacks deliver far more power per footprint and per tonne than ' +
    'today’s market leaders (XL: +260 %, L: +100 % versus Bosch Hybrion), at a target cost below 300 EUR/kW and ' +
    'with 100 % traceability and quality control. hyworx sells the stack to plant builders and integrators (OEM ' +
    'model), which keeps it capital-light and lets it scale with the whole industry. The company is led by Stefan ' +
    'Höller, a hydrogen pioneer since 1991 with 60+ patents, who previously founded H-TEC (today Quest One, a VW ' +
    'subsidiary) and Hoeller Electrolyzer (Rolls-Royce Power Systems majority holder 2022-2024).',
  revenue_actual: 0,
  ebitda_actual: null,
  revenue_trend: 'Pre-revenue. Plan: 2027 EUR 1.0m (first deposits), 2028 EUR 7.5m (+650 %) after series readiness.',
  employees: 2,
  founding_year: 2024,
  growth_strategy:
    'Seed I (EUR 0.75m at EUR 7.5m post-money) funds three externally validated prototypes, certification ' +
    '(incl. Fraunhofer ISE), first sales and the sales build. Seed II (EUR 10m at EUR 30m post-money, planned ' +
    '07/2027) funds series readiness of the L- and XL-stacks, sales and internationalisation. Revenue scales ' +
    'from EUR 1.0m (2027) to EUR 7.5m (2028).',
  key_risks:
    'Technology scale-up from prototype to series; follow-on funding (Seed II) required in 2027; adoption timing ' +
    'in regulation-driven mass markets; key-person dependency on the founder; competition from incumbents ' +
    '(Bosch, PlugPower). Mitigants: 30+ year founder track record, externally validated prototypes, ISO 22734 / ' +
    'EN 13445 alignment, secured grant, 10 signed LOIs, company-owned IP.',
  asking_price_band: 'Seed I: EUR 0.75m at EUR 7.5m post-money (pre 6.75m). Seed II: EUR 10m at EUR 30m post-money.',
  team_description:
    'Stefan Höller (CEO/CTO, 100 % shareholder), hydrogen pioneer with 60+ patents; Frank Collatz (CFO). Seed I ' +
    'funds an R&D team and an experienced sales hire (12+ years of stack-sales experience).',
  problem_solution:
    'Today’s electrolyzer stacks are too expensive (~500 EUR/kW), too big and heavy (>11 t for four stacks in a ' +
    '40-ft container) and inconsistent in quality. hyworx solves all three with a compact, low-cost, fully ' +
    'quality-controlled stack that is offshore-ready and refurbishable.',
  use_of_funds:
    'Seed I (EUR 750k): personnel 195k, certification 100k, material & machines 100k, prototype 1 85k, ' +
    'prototype 2 60k, prototype 3 60k, first inventory 150k.',
  traction_highlights: [
    '10 letters of intent from German integrators (6 for S-stack, 4 for L/XL)',
    '6 patent applications filed; > EUR 0.5m public grant approved (05/2026)',
    'Stack designed to ISO 22734 and EN 13445; three externally validated prototypes planned for 2027',
  ],
  milestones:
    'Q2-Q3 2027: three validated S-stack prototypes; 07/2027 start of Seed II; 09/2027 sales start and first ' +
    'revenue; 2028 L- and XL-stack sales start, revenue EUR 7.5m.',
};

const DOCUMENTS = [
  { filename: 'Project_CAVENDISH_Teaser_Phalanx.pdf', file_type: 'application/pdf',
    file_size: 78000, access_level: 'public',
    description: 'Anonymised one-page teaser: market, product edge, company and funding ask.' },
  { filename: 'Project_CAVENDISH_IM_Phalanx.pdf', file_type: 'application/pdf',
    file_size: 240000, access_level: 'nda',
    description: 'Confidential Investment Memorandum (named): technology, market, team, financials and funding (behind access).' },
];

exports.up = async function (knex) {
  const admin = await knex('users').where({ email: 'neusser@phalanx.de' }).first().catch(() => null);
  const adminId = admin ? admin.id : null;

  const existing = await knex('projects').where({ codename: PUBLIC.codename }).first().catch(() => null);
  if (existing) return;

  const [row] = await knex('projects').insert({
    tenant_id: 1, codename: PUBLIC.codename, industry: PUBLIC.industry, region: PUBLIC.region,
    revenue_band: PUBLIC.revenue_band, ebitda_band: PUBLIC.ebitda_band, deal_type: PUBLIC.deal_type,
    short_description: PUBLIC.short_description, highlights: JSON.stringify(PUBLIC.highlights),
    status: 'draft', created_by: adminId, stage: PUBLIC.stage, investment_needed: PUBLIC.investment_needed,
    equity_stake: PUBLIC.equity_stake, post_money_valuation: PUBLIC.post_money_valuation, tam_band: PUBLIC.tam_band,
    sector_emoji: PUBLIC.sector_emoji, location_city: PUBLIC.location_city, mandate_type: PUBLIC.mandate_type,
  }).returning('id');
  const projectId = typeof row === 'object' ? row.id : row;

  await knex('project_details').insert({
    project_id: projectId, full_description: DETAILS.full_description, revenue_actual: DETAILS.revenue_actual,
    ebitda_actual: DETAILS.ebitda_actual, revenue_trend: DETAILS.revenue_trend, employees: DETAILS.employees,
    founding_year: DETAILS.founding_year, growth_strategy: DETAILS.growth_strategy, key_risks: DETAILS.key_risks,
    asking_price_band: DETAILS.asking_price_band, team_description: DETAILS.team_description,
    problem_solution: DETAILS.problem_solution, use_of_funds: DETAILS.use_of_funds,
    traction_highlights: JSON.stringify(DETAILS.traction_highlights), milestones: DETAILS.milestones,
  }).catch(() => {});

  for (const doc of DOCUMENTS) {
    await knex('documents').insert({
      project_id: projectId, filename: doc.filename, file_type: doc.file_type, file_size: doc.file_size,
      access_level: doc.access_level, description: doc.description, uploaded_by: adminId,
    }).catch(() => {});
  }
};

exports.down = async function (knex) {
  await knex('projects').where({ codename: PUBLIC.codename }).del().catch(() => {});
};
