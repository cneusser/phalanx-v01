/** Changelog v0.343 (Safe: Umbenennen, Mandatsname konsequent). */
const ENTRY = {
  version: 'v0.343', released_on: '2026-07-21',
  title: 'Safe: Dateien und Ordner umbenennen',
  items: [
    'Dateien und Ordner im Safe lassen sich jetzt nachträglich umbenennen (Stift-Symbol in der Zeile, Enter speichert, bei Dateien bleibt die Endung erhalten)',
    'Im Aktivitätslog wird der Mandatsname (z. B. Betongold) konsequent verwendet statt der reinen Projekt-Id. Das Hochladen erscheint jetzt korrekt beim Mandat',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
