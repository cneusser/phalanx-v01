/** Changelog v0.289 (Beteiligte per Drag-and-drop). */
const ENTRY = {
  version: 'v0.289', released_on: '2026-08-11',
  title: 'Beteiligte per Drag-and-drop führen',
  items: [
    'Käufer-Karte in die Zone „Mandant & Beteiligte" ziehen macht sie zum Prozessbeteiligten (aus dem Käufer-Funnel heraus)',
    'Beteiligten-Karte in eine Funnel-Stufe ziehen macht sie wieder zum Käufer auf dieser Stufe',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
