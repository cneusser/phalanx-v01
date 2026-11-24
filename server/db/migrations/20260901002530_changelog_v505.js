/** Changelog v0.505 (ein Fragezeichen im Kommentar leerte die Mandatsliste). */
const ENTRY = {
  version: 'v0.505', released_on: '2026-11-24',
  title: 'Die Mandatsliste im Kontakt kam leer zurück',
  items: [
    'In der Kontaktakte stand unter „Mandate" nichts mehr, auch bei Kontakten mit Zuordnung. Ursache war ein erklärender Kommentar aus v0.504, der auf ein Fragezeichen endete. In einer Abfrage ist jedes Fragezeichen ein Platzhalter für einen Wert, auch eines hinter zwei Bindestrichen: vier Platzhalter bei drei Werten, und die Abfrage brach ab',
    'Darunter stand ein stummes Abfangen des Fehlers, das daraus „Dieser Kontakt ist noch keinem Mandat zugeordnet" machte. Eine leere Liste, die nach einer Antwort aussieht, ist schlimmer als eine Fehlermeldung. Der Fehler wird jetzt protokolliert',
    'Zwei neue Prüfungen: Eine liest den Quelltext und weist jede Abfrage zurück, die ein Fragezeichen in einem Kommentar trägt. Die andere ruft die Kontaktakte auf und erwartet dort das Mandat samt Ampel und hinterlegter Datei. Die zweite hätte gereicht, und sie fehlte',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
