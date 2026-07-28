/** Changelog v0.325 (Navigationsleiste: mehr Abstand). */
const ENTRY = {
  version: 'v0.325', released_on: '2026-07-21',
  title: 'Navigationsleiste mit mehr Luft',
  items: [
    'Logo und Menü rückten bei vielen Menüpunkten aneinander. Die Navigation hat jetzt einen festen Abstand nach beiden Seiten, sodass sich Logo und erster Menüpunkt nicht mehr berühren',
    'Etwas mehr Abstand und Höhe in der Leiste über alle Ansichten hinweg',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
