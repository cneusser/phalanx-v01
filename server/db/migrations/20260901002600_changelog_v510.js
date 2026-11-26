/** Changelog v0.510 (die Vorschläge können auch von Claude kommen). */
const ENTRY = {
  version: 'v0.510', released_on: '2026-11-26',
  title: 'Die Vorschläge können auch von Claude kommen',
  items: [
    'Die maschinellen Vorschläge aus v0.509 sprachen nur das Format von OpenAI. Jetzt auch das von Anthropic: eigener Kopf für den Schlüssel, eigenes Feld für den Auftrag, und eine Obergrenze für die Antwortlänge, ohne die dort gar nichts zurückkommt',
    'Eingestellt werden muss dafür nichts. Beginnt der Schlüssel mit „sk-ant-", ist der Anbieter erkannt, und das Standardmodell ist claude-haiku-5-5. Wer es ausdrücklich setzen will, nimmt ANREICHERUNG_ART',
    'Antworten in Code-Zäunen werden abgeschält. Ein Modell, das um JSON gebeten wird, legt gern drei Rückstriche darum, und das ist streng genommen kein JSON mehr',
    'An der Sache selbst ändert sich nichts: Vorschlag mit Quelle, Übernahme auf Klick, nie in ein Feld, in dem schon etwas steht, und ohne eingerichteten Dienst passiert gar nichts',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
