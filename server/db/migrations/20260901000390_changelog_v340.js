/** Changelog v0.340 (Safe-Vorschau öffnet zuverlässig). */
const ENTRY = {
  version: 'v0.340', released_on: '2026-07-21',
  title: 'Safe-Vorschau öffnet wieder zuverlässig',
  items: [
    'Die Vorschau im Datensafe wurde vom Browser als Popup blockiert und öffnete sich nicht, obwohl der Zugriff gezählt wurde. Das Tab wird jetzt direkt beim Klick geöffnet und danach mit der Datei gefüllt',
    'Ein Klick auf den Dateinamen öffnet nun die Vorschau, ein Klick auf einen Ordner blättert hinein',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
