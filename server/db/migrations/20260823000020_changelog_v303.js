/** Changelog v0.303 (Vertrauliche Mandate: Sichtbarkeit je Mandat). */
const ENTRY = {
  version: 'v0.303', released_on: '2026-08-23',
  title: 'Vertrauliche Mandate: nur auf Einladung',
  items: [
    'Neue Sichtbarkeit je Mandat: öffentlich oder vertraulich (nur auf Einladung)',
    'Vertrauliche Mandate erscheinen nicht im Marktplatz, nicht in den Zählern, nicht in den Filtern und nicht im Matching oder Newsletter',
    'Sichtbar sind sie für das Team, den Ersteller, zugeordnete Nutzer und ausdrücklich eingeladene Beteiligte',
    'Beim Umschalten auf öffentlich erscheint eine ausdrückliche Warnung, damit die Vertraulichkeit nicht versehentlich fällt',
    'Badge „Vertraulich" in der Admin-Projektliste und im Verkäufer-Cockpit',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
