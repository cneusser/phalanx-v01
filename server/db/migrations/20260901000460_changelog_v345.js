/** Changelog v0.345 (Safe: Sammel-Uebernahme in den Datenraum). */
const ENTRY = {
  version: 'v0.345', released_on: '2026-07-21',
  title: 'Safe: in Datenraum übernehmen je Datei, Ordner oder gesamt',
  items: [
    'Eine ganze Ordnerstruktur lässt sich jetzt mit einem Klick in den Datenraum übernehmen (Freigabe-Symbol am Ordner, inklusive aller Unterordner)',
    'Neuer Button „Alles in Datenraum" übernimmt sämtliche Dateien eines Mandats auf einmal',
    'Bereits im Datenraum vorhandene Dateien werden anhand des Namens erkannt und übersprungen, es entstehen keine Dubletten',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
