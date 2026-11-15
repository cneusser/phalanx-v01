/** Changelog v0.474 (Datenpflege klappt zu). */
const ENTRY = {
  version: 'v0.474', released_on: '2026-11-15',
  title: 'Die Datenpflege klappt zu',
  items: [
    'Alle fünf Bereiche der Datenpflege lassen sich auf- und zuklappen. Zugeklappt steht neben der Überschrift, was drinsteht, etwa wie viele Firmen Lücken haben oder wie viele Mandate noch offen sind',
    'Beim ersten Besuch ist nur "Fehlende Angaben" offen. Welche Bereiche offen sind, merkt sich die Seite im Browser',
    'Damit entfällt das weite Scrollen auf einer Seite, auf der ohnehin immer nur an einem Bereich gearbeitet wird',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
