/** Changelog v0.410 (Zweisprachigkeit). */
const ENTRY = {
  version: 'v0.410', released_on: '2026-09-26',
  title: 'Zweisprachig, und ehrlich darüber',
  items: [
    'Die Sprache wird erkannt: erst die eigene Wahl, dann der Browser, sonst Deutsch. Das Profil schlägt vor, überschreibt aber nie eine getroffene Wahl',
    'Eine Regel für alle Texte: die bisherige Spalte führt Deutsch, die Spalte mit _en führt Englisch',
    'Der Mandatsbestand ist übersetzt. Cavendish lag nur auf Englisch vor und liegt jetzt auch auf Deutsch vor',
    'Nichts geht ungeprüft nach draußen: Jede Fassung steht als Entwurf, bis sie freigegeben ist. Solange sieht ein englischer Leser den deutschen Text mit Hinweis auf die Sprache',
    'Neue Ansicht in der Datenpflege: beide Fassungen nebeneinander, änderbar, einzeln freizugeben',
    'Ein Übersetzungsdienst ist anschließbar. Ohne Schlüssel bleibt die zweite Fassung leer und wird als fehlend ausgewiesen',
    'Korrektur: Die Spannenfunktion hat aus jeder Zahl einen Millionenbetrag gemacht, auch aus einer Prozentangabe. Umgerechnet wird jetzt nur noch, was eindeutig Geld ist',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
