/** Changelog v0.511 (die erste echte Anfrage an Claude lief in einen Fehler). */
const ENTRY = {
  version: 'v0.511', released_on: '2026-11-26',
  title: 'Die Vorschläge von Claude liefen in einen Fehler 400',
  items: [
    'Die erste echte Anfrage auf der Teststufe wurde abgewiesen: „temperature is deprecated for this model". Die neueren Modelle von Anthropic nehmen diese Angabe nicht mehr entgegen, und zwar nicht als Warnung, sondern als Fehler. Sie entfällt',
    'Für diese Aufgabe ist das ohne Verlust: Gefragt wird nach Tatsachen, nicht nach Formulierungen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
