/** Changelog v0.435 (Dateien aus der Cloud werden abgewartet). */
const ENTRY = {
  version: 'v0.435', released_on: '2026-09-30',
  title: 'Dateien aus der Cloud werden abgewartet',
  items: [
    'Die Ursache der Upload-Abbrüche steht fest und lag nie am Server: Dateien in einem Ordner mit Cloud-Abgleich liegen lokal oft nur als Platzhalter. Sie zeigen eine Größe, lassen sich aber nicht lesen. Der Browser brach deshalb mitten im Senden ab und nannte als Grund nur "Load failed"',
    'Ein erster Lesezugriff schlägt fehl, stößt im Betriebssystem aber den Download an. Deshalb wird jetzt bis zu dreimal gelesen, mit Pause dazwischen, und die Oberfläche sagt dabei, dass die Datei geholt wird',
    'Bleibt es dabei, nennt die Meldung die Datei und den Weg: im Finder über das Kontextmenü herunterladen oder dauerhaft auf dem Gerät behalten',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
