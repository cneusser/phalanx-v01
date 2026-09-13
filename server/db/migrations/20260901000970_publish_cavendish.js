/**
 * Cavendish: Feedback von Stefan Höller einarbeiten und Mandat veröffentlichen.
 *   - LOIs von 10 auf 11 (7 nennen den S-Stack, 5 den L/XL-Stack, einer beide)
 *   - CFO nicht mehr nennen; Fokus auf Gründer plus geplante Vertriebseinstellung
 *   - Ausdauertest 2.700 h statt 3.000 h
 *   - status = 'active' (Veröffentlichung)
 * Idempotent: aktualisiert nur, wenn das Mandat existiert.
 */
const HIGHLIGHTS = [
  'Product leap: up to +260 % power at the same footprint and weight',
  'Cost path to < 300 EUR/kW vs ~500 EUR/kW on the market today',
  'Founder-led deep tech: hydrogen pioneer, 60+ patents, two prior electrolyzer companies',
  'Capital-light OEM model: 11 letters of intent from German integrators signed',
  'Large, fast market: PEM electrolyzers ~50 % CAGR, EU regulation as tailwind',
  'De-risked: EUR 0.75m invested, > EUR 0.5m public grant approved, 6 patents filed',
];
const TRACTION = [
  '11 letters of intent from German integrators (7 name the S-stack, 5 the L/XL-stack, one covers both)',
  '6 patent applications filed; > EUR 0.5m public grant approved (05/2026)',
  'Stack designed to ISO 22734 and EN 13445; three externally validated prototypes planned for 2027',
];
const TEAM = 'Stefan Höller (CEO/CTO, 100 % shareholder), hydrogen pioneer with 60+ patents. Seed I funds an '
  + 'experienced sales hire (12+ years in stack sales) who takes over much of the commercial work; investor '
  + 'relations and grants are supported externally.';
const KEY_RISKS = 'Technology scale-up from prototype to series; follow-on funding (Seed II) required in 2027; adoption '
  + 'timing in regulation-driven mass markets; key-person dependency on the founder; competition from incumbents '
  + '(Bosch, PlugPower). Mitigants: 30+ year founder track record, externally validated prototypes, ISO 22734 / '
  + 'EN 13445 alignment, secured grant, 11 signed LOIs, company-owned IP.';
const MILESTONES = 'Q2 to Q3 2027: three validated S-stack prototypes; 07/2027 start of Seed II; 09/2027 sales start '
  + 'and first revenue; 10/2027 2,700-hour endurance test; 2028 L- and XL-stack sales start, revenue EUR 7.5m.';
const SHORT = 'German deep-tech developer of next-generation PEM electrolyzer stacks for decentralised green hydrogen. '
  + 'The stacks deliver up to 260 % more power at the same footprint and weight than the current market leader, '
  + 'with a cost target below 300 EUR/kW and 100 % quality control. OEM model: the core stack is sold to plant '
  + 'builders and integrators, not projects; 11 letters of intent are already signed. Founder is a hydrogen '
  + 'pioneer (active since 1991, 60+ patents). Raising Seed I (EUR 0.75m at EUR 7.5m post-money), followed by '
  + 'Seed II (EUR 10m at EUR 30m post-money, planned 07/2027).';

exports.up = async function (knex) {
  const p = await knex('projects').where({ codename: 'Cavendish' }).first().catch(() => null);
  if (!p) return;
  await knex('projects').where({ id: p.id }).update({
    short_description: SHORT, highlights: JSON.stringify(HIGHLIGHTS), status: 'active',
  }).catch(() => {});
  await knex('project_details').where({ project_id: p.id }).update({
    traction_highlights: JSON.stringify(TRACTION), team_description: TEAM,
    key_risks: KEY_RISKS, milestones: MILESTONES,
  }).catch(() => {});
};

exports.down = async function (knex) {
  await knex('projects').where({ codename: 'Cavendish' }).update({ status: 'draft' }).catch(() => {});
};
