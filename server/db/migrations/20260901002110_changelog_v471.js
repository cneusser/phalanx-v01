/** Changelog v0.471 (Übersetzungen zum Auf- und Zuklappen). */
const ENTRY = {
  version: 'v0.471', released_on: '2026-11-14',
  title: 'Acht Mandate auf einmal sind sieben zu viel',
  items: [
    'Der Bereich "Übersetzungen der Mandate" zeigte alle Mandate ausgeklappt untereinander. Bei acht Mandaten mit je drei Feldern in zwei Sprachen waren das mehrere Bildschirmhöhen, und gearbeitet wird immer nur an einem',
    'Jedes Mandat ist jetzt eine Zeile zum Aufklappen. Zugeklappt stehen Name, Status und ein Hinweis, falls die englische Fassung unvollständig ist',
    'Darüber drei Schalter: noch offen, freigegeben, alle. Vorausgewählt ist "noch offen", denn das ist die Arbeitsliste',
    'Dazu "Alle aufklappen" und "Alle zuklappen" für den Überblick',
    'Freigeben und Speichern bleiben auch an der zugeklappten Zeile erreichbar',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
