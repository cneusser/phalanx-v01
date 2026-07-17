/** Changelog v0.288 (Käufer-/Verkäuferrolle getrennt). */
const ENTRY = {
  version: 'v0.288', released_on: '2026-08-11',
  title: 'Käufer- und Verkäuferrolle sauber getrennt',
  items: [
    'Eigene Mandate erscheinen nicht mehr im Käufer-Marktplatz; keine NDA/kein Interesse am eigenen Mandat',
    'Verkäufer bekommen kein Käufer-Suchprofil, Käufer keinen Verkäufer-Bereich (Basis für die spätere Verkäufer-Stufe)',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
