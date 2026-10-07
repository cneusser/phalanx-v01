/** Changelog v0.448 (DUB-Multiples Q3/2026, Bewertung rechnet mit EBITDA). */
const ENTRY = {
  version: 'v0.448', released_on: '2026-10-07',
  title: 'DUB-Multiples Q3/2026, Bewertung rechnet mit EBITDA',
  items: [
    'Ein Fehler zuerst, weil er wichtiger ist als die neuen Zahlen: Die DUB KMU-Multiples sind EBITDA-Multiples, beide Bewertungs-Engines multiplizierten aber den EBIT. Das galt auch für den Stand Q2/2026. Die Werte fielen dadurch systematisch zu niedrig aus, bei einem Betrieb mit 237 TEUR EBIT und 60 TEUR Abschreibungen um rund ein Viertel',
    'Beide Engines multiplizieren jetzt den EBITDA. Das Ertragswert- und das DCF-Verfahren rechnen bewusst weiter mit dem EBIT, denn sie bilden den Ertrag nach Abschreibungen ab',
    'Im Schnellcheck gibt es dafür ein Feld für die Abschreibungen. Fehlt es, wird weiter gerechnet, aber das Ergebnis sagt, dass der Wert zu niedrig ist. Eine geschätzte Abschreibungsquote wäre bequemer und falsch: Sie sähe aus wie eine Angabe des Unternehmens',
    'Bereits gespeicherte Bewertungen bleiben unverändert. Sie neu zu rechnen hieße, Zahlen zu ändern, die jemand bereits gesehen und weitergegeben hat',
    'Die Werte vom Stand Q3/26 sind eingepflegt, alle zwanzig Branchen in drei Größenklassen',
    'Die Multiples haben jetzt eine Zeitachse. Gerechnet wird mit dem aktiven Stand, alle früheren bleiben lesbar. Im Verwaltungsbereich zeigt ein Bericht alle Stände nebeneinander samt Veränderung zum vorigen, und ein Stand lässt sich bewusst aktiv schalten',
    'Die Umsatz-Multiples stehen nicht auf der veröffentlichten Seite, sondern nur im PDF-Report. Sie wurden aus dem alten Stand übernommen und nicht erfunden',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
