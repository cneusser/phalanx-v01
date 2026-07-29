/** Changelog v0.351 (CRM: Kennzahl-Kacheln als Filter anklickbar). */
const ENTRY = {
  version: 'v0.351', released_on: '2026-07-21',
  title: 'CRM: Kennzahl-Kacheln anklickbar',
  items: [
    'Die Kacheln im CRM sind jetzt anklickbar und filtern die Liste: Unternehmen, Kontakte, Entscheider, Einwilligung und „Nicht kontaktieren"',
    'Die aktive Kachel ist hervorgehoben, ein Filter-Chip über der Kontaktliste zeigt den gesetzten Filter und lässt sich mit einem Klick entfernen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
