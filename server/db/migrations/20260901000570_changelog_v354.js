/** Changelog v0.354 (Safe: doppelte Ordner zusammenführen statt nur leere entfernen). */
const ENTRY = {
  version: 'v0.354', released_on: '2026-07-21',
  title: 'Safe: doppelte Ordner zuverlässig zusammenführen',
  items: [
    'Die Bereinigung führt gleichnamige Ordner jetzt zusammen: Inhalte einer Dublette werden in den ersten Ordner verschoben und die geleerte Dublette in den Papierkorb gelegt. Vorher wurden Dubletten mit Inhalt übersprungen, daher schien nichts zu passieren',
    'Rückmeldung nennt jetzt die Zahl der zusammengeführten Ordner und der verschobenen Objekte',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
