/** Changelog v0.436 (Verschieben, und das Exposé-PDF landet im richtigen Ordner). */
const ENTRY = {
  version: 'v0.436', released_on: '2026-09-30',
  title: 'Verschieben, und das Exposé-PDF landet im richtigen Ordner',
  items: [
    'Bisher gab es im Datenraum nur "eine Position hoch" und "eine Position runter". Wer eine Datei in einen anderen Ordner bringen wollte, musste sie erneut hochladen und die alte löschen. Jetzt gibt es je Zeile einen Knopf zum Verschieben, mit Auswahl aus dem vollständigen Ordnerbaum',
    'Ein Ordner kann dabei nicht in sich selbst und nicht in einen seiner eigenen Unterordner wandern. Sonst entstünde ein Ast, der sich selbst enthält, und dessen Inhalt wäre über den Baum nicht mehr erreichbar',
    'Ein über den Exposé-Editor hochgeladenes PDF lag bisher immer in der obersten Ebene. Es landet nun in dem Ordner, in dem Teaser und Informationsmemorandum liegen. Der heißt nicht in jedem Mandat gleich, deshalb wird er gesucht und nicht geraten',
    'Zur roten Kennzeichnung "nicht freigegeben": sie betrifft nur den Ordnerbaum für Käufer. Die Auslieferung als Exposé-PDF hängt nicht daran und funktioniert unabhängig davon',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
