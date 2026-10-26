/** Changelog v0.467 (Uebersetzungen: ein verschluckter Fehler). */
const ENTRY = {
  version: 'v0.467', released_on: '2026-10-26',
  title: 'Der Abschnitt, den es scheinbar nicht gab',
  items: [
    'Der Bereich "Übersetzungen der Mandate" in der Datenpflege war nicht zu sehen. Er fehlte nicht, er war kaputt: Die Abfrage dahinter antwortete mit 500, und die Oberfläche fing das mit einem leeren catch ab. Ein verschluckter Fehler sieht aus wie eine fehlende Funktion',
    'Das leere catch ist weg. Lässt sich der Bereich nicht laden, steht der Grund an seiner Stelle, unter derselben Überschrift',
    'Die Abfrage sieht jetzt zuerst nach, welche Spalten es gibt, und benennt die fehlenden, statt mit einem Serverfehler abzubrechen',
    'Eine Wanderung zieht die zweisprachigen Spalten nach. Die ursprüngliche von v0.410 legte sie nur an, wenn die deutsche Spalte damals schon bestand; eine halb ausgeführte Wanderung gilt als ausgeführt und läuft nie wieder. Die neue prüft den Endzustand statt den Verlauf und lässt sich gefahrlos mehrfach ausführen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
