/** Changelog v0.369 (Schwärzen/Redaction im Safe). */
const ENTRY = {
  version: 'v0.369', released_on: '2026-07-21',
  title: 'Schwärzen: Begriffe in PDFs unkenntlich machen',
  items: [
    'Neue Funktion „Schwärzen" je PDF im Safe: Begriffe eingeben (Namen, Zahlen), alle Fundstellen werden schwarz überdeckt UND der Text an diesen Stellen wirklich entfernt (nicht nur verdeckt), sodass nichts mehr auslesbar oder kopierbar ist',
    'Vorschau zählt vor dem Schwärzen, wie oft jeder Begriff vorkommt',
    'Es entsteht eine neue Kopie „(geschwärzt)", das Original bleibt unverändert im Safe. Die geschwärzte Kopie lässt sich prüfen und in den Datenraum übernehmen',
    'Grenze: In gescannten Bild-PDFs ohne Textebene findet die Stichwortsuche nichts',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
