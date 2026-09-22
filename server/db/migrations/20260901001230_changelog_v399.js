/** Changelog v0.399 (Nachrichten mehrzeilig schreiben und nachbessern). */
const ENTRY = {
  version: 'v0.399', released_on: '2026-08-04',
  title: 'Nachrichten mehrzeilig schreiben und noch nachbessern',
  items: [
    'Das Eingabefeld im Nachrichtenbereich ist mehrzeilig und wächst mit dem Text. Enter macht eine neue Zeile, gesendet wird über den Knopf oder mit Cmd beziehungsweise Strg und Enter',
    'Zeilenumbrüche bleiben erhalten, in der Anzeige ebenso wie in der Hinweis-Mail',
    'Nach dem Senden bleiben zehn Minuten, um den Text noch zu ändern oder die Nachricht ganz zurückzunehmen',
    'Der Empfänger sieht die Nachricht erst nach Ablauf dieser Zeit, und erst dann geht die Hinweis-Mail hinaus. Was einmal zugestellt ist, bleibt unveränderlich',
    'Die Blase zeigt währenddessen, wann zugestellt wird; nachträglich geänderte Nachrichten tragen den Vermerk „bearbeitet"',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
