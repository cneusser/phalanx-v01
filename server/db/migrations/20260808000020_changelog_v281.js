/** Changelog v0.281 (NDA-Status auf der Karte, Chat prominent). */
const ENTRY = {
  version: 'v0.281', released_on: '2026-07-21',
  title: 'NDA-Status auf der Karte, Chat prominent',
  items: [
    'Funnel-Karten zeigen den NDA-Status: „NDA ✓" (unterzeichnet/freigegeben) oder „NDA offen" (angefragt)',
    'Der Chat („Nachrichten") ist jetzt für alle angemeldeten Nutzer prominent in der oberen Leiste, mit Zähler für ungelesene Nachrichten',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
