/** Changelog v0.287 (Unternehmen-Liste Seiten/A-Z, Standard 10, k.A. entfernt). */
const ENTRY = {
  version: 'v0.287', released_on: '2026-07-21',
  title: 'Unternehmen mit Seiten und A-Z, kleinere Aufräumer',
  items: [
    'Unternehmen-Liste mit A-Z-Leiste und Seiten wie die Kontakte; Standard-Seitengröße jetzt 10',
    'Der leere Verantwortungsbereich wird nicht mehr als „k. A." unter dem Namen angezeigt',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
