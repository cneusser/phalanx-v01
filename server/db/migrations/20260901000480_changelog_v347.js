/** Changelog v0.347 (Safe: Navigation zurück zum Mandat und zum Safe). */
const ENTRY = {
  version: 'v0.347', released_on: '2026-07-21',
  title: 'Safe: klare Rückwege',
  items: [
    'Der obere Zurück-Link führt jetzt zurück zum jeweiligen Mandat statt ins Admin-Dashboard',
    'Aus dem Zugriffsbericht und aus dem Papierkorb führt ein Button „Zurück zum Safe" direkt zur Ordneransicht zurück',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
