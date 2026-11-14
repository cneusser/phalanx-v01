/** Changelog v0.468 (Kontaktoffenlegung als eigener Schritt). */
const ENTRY = {
  version: 'v0.468', released_on: '2026-11-14',
  title: 'Der Kontakt wird offengelegt, nicht nebenbei sichtbar',
  items: [
    'Zwischen den beiden Seiten eines Mandats werden Kontaktdaten erst offengelegt, wenn die Verwaltung das ausdrücklich freigibt, und das frühestens, wenn die Vertraulichkeitsvereinbarung von allen Seiten unterzeichnet ist',
    'Bisher genügte die angenommene Kontaktanfrage. Das ist für zwei Investoren im Netzwerk richtig und für Verkäufer und Interessent desselben Mandats zu früh. Beide Fälle werden jetzt unterschieden; am Netzwerk ändert sich nichts',
    'Jede Freigabe steht als eigene Zeile mit Zeitpunkt und handelnder Person. Ein Widerruf ist jederzeit möglich und löscht die Zeile nicht, sondern beendet sie',
    'Im Verwaltungsbereich zeigt jedes Mandat, wer sich gegenübersteht, was freigegeben ist und was noch fehlt. Wo nicht freigegeben werden darf, steht der Grund statt eines grauen Knopfes',
    'Die Prüfung liegt im Server und nicht in der Oberfläche. Eine Freigabe ohne beidseitige Unterschrift wird abgelehnt, auch wenn sie direkt an die Schnittstelle geschickt wird',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
