/** Changelog v0.299 (Marktplatz für das Team wieder vollständig). */
const ENTRY = {
  version: 'v0.299', released_on: '2026-07-21',
  title: 'Marktplatz für das Team wieder vollständig',
  items: [
    'Admin und Berater sehen im Marktplatz wieder alle Mandate. Das Ausblenden eigener Mandate gilt nur noch für Käufer und Verkäufer',
    'Die Zähler über der Liste zählen jetzt genau das, was der Aufrufer auch sieht, ebenso die Filteroptionen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
