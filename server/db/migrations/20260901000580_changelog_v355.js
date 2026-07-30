/** Changelog v0.355 (Admin-Cockpit: Zeitraum um Heute und 3 Tage ergänzt). */
const ENTRY = {
  version: 'v0.355', released_on: '2026-07-21',
  title: 'Admin-Cockpit: Zeitraum „Heute" und „3 Tage"',
  items: [
    'Der Zeitraum-Filter im Admin-Cockpit bietet jetzt zusätzlich „Heute" und „3 Tage"',
    '„Heute" zählt ab Tagesbeginn (Kalendertag), nicht die letzten 24 Stunden',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
