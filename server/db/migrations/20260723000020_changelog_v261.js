/** Changelog-Eintrag v0.261 (Sprint 12: Ausführliche Bewertung 2.0). */
const ENTRY = {
  version: 'v0.261', released_on: '2026-07-21',
  title: 'Bewertung 2.0: Cashflow, Sensitivität, Branchenvergleich',
  items: [
    'Discounted Cash Flow: Fünfjahresplanung, Kapitalkosten nach CAPM mit KMU-Zuschlägen, Fortführungswert, jede Annahme offengelegt',
    'Sensitivitätsmatrix: Wie verändert sich der Wert bei anderen Kapitalkosten und anderem Wachstum?',
    'Branchenvergleich: EBIT-Marge, Wachstum und Personalkostenquote gegen Quartilsbänder von 20 Branchen',
    'Methodenvergleich: Multiplikator, Ertragswert und DCF nebeneinander, mit ehrlicher Spannweite',
    'Leere Planungsfelder werden konservativ aus der Historie abgeleitet (Wachstum gedeckelt auf ±5 % p. a.)',
    'PDF-Report um DCF-Seite, Sensitivitätsmatrix und Benchmarking erweitert',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
