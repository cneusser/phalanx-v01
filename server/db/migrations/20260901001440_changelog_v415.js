/** Changelog v0.415 (Die ganze Plattform spricht beide Sprachen). */
const ENTRY = {
  version: 'v0.415', released_on: '2026-09-26',
  title: 'Die ganze Plattform spricht beide Sprachen',
  items: [
    'Nachrichten, Feedback, Verkäufer-Bereich, Profil, Nachfolge-Profil, Unternehmenswert und die ausführliche Bewertung sind jetzt zweisprachig. 368 Schlüssel, jeder mit englischer Fassung',
    'Branchen und Regionen bleiben bewusst deutsch: dort ist der deutsche Text der gespeicherte Wert. Eine englische Anzeige braucht erst eine Trennung von Wert und Beschriftung',
    'Umsatzgrößen und MBI-Szenarien haben diese Trennung bereits und werden übersetzt',
    'Die Prüfung auf Übersetzungen außerhalb einer Funktion zählt jetzt echte Klammertiefe. Die erste Fassung suchte nach Zeilenmustern und hatte eine mehrzeilige Tabelle übersehen, die die ganze Plattform lahmgelegt hätte',
    '15 Seiten in beiden Sprachen im Browser durchgeklickt, kein einziger Fehler',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
