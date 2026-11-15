/** Changelog v0.473 (Auswahl in der Datenpflege, ohne Scrollen). */
const ENTRY = {
  version: 'v0.473', released_on: '2026-11-15',
  title: 'Auswählen, ohne zu scrollen',
  items: [
    'Neben den Reitern steht jetzt "alle N auswählen". Das Kästchen in der Tabellenkopfzeile gab es länger, nur steht es genau dort, wohin man erst scrollen muss; bei 276 Zeilen ist das der Unterschied zwischen zwei Klicks und zwei Minuten',
    'Die Leiste "Für die Auswahl setzen" bleibt beim Scrollen oben stehen, damit Auswählen und Setzen nicht an zwei Enden der Seite liegen',
    'Vor dem Setzen für mehr als 25 Firmen wird nachgefragt, mit Feldname, Wert und Zahl: Eine Sammelaktion ist schnell und damit gefährlich',
    'Behoben: Ein Klick auf "alle" liess die Auswahl des vorigen Reiters stehen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
