/** Changelog v0.327 (Gemeinsame Branchenliste fürs Nachfolge-Matching). */
const ENTRY = {
  version: 'v0.327', released_on: '2026-07-21',
  title: 'Gemeinsame Branchenliste, schärferes Matching',
  items: [
    'Das Nachfolge-Profil nutzt jetzt dieselbe Branchenliste (NACE) wie die Mandate. Mehrere Branchen sind auswählbar, gruppiert und übersichtlich',
    'Auch die Zielregionen laufen über die gemeinsame Bundesländer-Liste, ebenfalls mehrfach wählbar',
    'Dadurch treffen die Vorschläge genauer: Branche und Region werden gegen dieselbe Systematik abgeglichen',
    'Regions-Logik verbessert: Wer als Zielland Deutschland wählt, bekommt auch deutsche Mandate ohne konkretes Bundesland als Treffer',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
