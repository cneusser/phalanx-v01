/** Changelog v0.401 (Datenraum bedient sich wie ein Dateimanager). */
const ENTRY = {
  version: 'v0.401', released_on: '2026-08-06',
  title: 'Datenraum bedient sich wie ein Dateimanager',
  items: [
    '„Alles herunterladen" steht jetzt ganz oben, zusammen mit der Anzahl der freigegebenen Dokumente und der Gesamtgröße',
    'Mehrfachauswahl: Zeilen ankreuzen, mit gedrückter Umschalttaste ganze Bereiche, dann die Auswahl als ein Archiv laden',
    'Tabelle mit Name, Größe, Änderungsdatum und Dateityp, sortierbar durch Klick auf die Überschrift',
    'Doppelklick öffnet einen Ordner, die Rücktaste geht eine Ebene zurück',
    'Ist für einen Zugang nur das Ansehen freigegeben, steht das oben, statt dass ein Knopf mit einer Fehlermeldung antwortet',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
