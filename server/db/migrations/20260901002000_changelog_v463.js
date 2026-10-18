/** Changelog v0.463 (Adressmaske, Investorenvorschlag, Migration entschaerft). */
const ENTRY = {
  version: 'v0.463', released_on: '2026-10-18',
  title: 'Zwei Oberflächen zu fertigem Serverstand',
  items: [
    'Die Anschrift eines Unternehmens wird jetzt in getrennten Feldern erfasst: Straße, Hausnummer, Adresszusatz, PLZ, Ort und Land. Migration und Zerleger gab es seit v0.447, nur kein Eingabefeld, und so blieb alles im alten Sammelfeld stehen',
    'Die Hausnummer ist ein Textfeld. "28a", "12 bis 14" und "5/7" sind Hausnummern und keine Zahlen. Das Land ist zweistellig nach ISO 3166-1, denn "Deutschland", "Germany" und "GER" meinen dasselbe und lassen sich nicht vergleichen',
    'Die Anzeigezeile wird gerechnet und nicht gespeichert. Eine gespeicherte Anzeigezeile ist eine zweite Wahrheit: Sie veraltet, sobald jemand ein Feld ändert, und niemand bemerkt es',
    'Die alten Felder bleiben im Bestand und werden nicht mehr bearbeitet. Steht dort noch etwas und in den neuen Feldern nichts, weist die Maske darauf hin',
    'Im Deal-Funnel gibt es "Suchkriterien abgleichen": Die Auswertung lag seit v0.439 als Route bereit, es führte nur kein Weg dorthin. Je Vorschlag stehen die Gründe dabei, und ein fehlender Einwilligungsstand wird am Treffer selbst gezeigt und nicht in einer Fußnote',
    'Übernommene landen auf Stufe 0 und warten auf Freigabe. Versendet wird nichts',
    'Entschärft: Die Wanderung zum Mailverlauf legte einen eindeutigen Index auf Bestandsdaten an. Wanderungen laufen beim Hochfahren, und ein Fehler darin hätte die gesamte Plattform am Start gehindert. Bleibt wider Erwarten eine Dublette übrig, wird der Index jetzt ausgelassen und laut gemeldet statt erzwungen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
