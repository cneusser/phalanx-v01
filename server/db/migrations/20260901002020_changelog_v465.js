/** Changelog v0.465 (Anmeldeschleife: Panne ist nicht abgemeldet). */
const ENTRY = {
  version: 'v0.465', released_on: '2026-10-23',
  title: 'Anmeldeschleife beim Login über Phalanx OS',
  items: [
    'Die Anmeldung über Phalanx OS führte zurück auf die Anmeldeseite, und zwar ohne Begründung. Das System wusste an jeder Stelle, woran es scheitert, und sagte an keiner etwas',
    'Die Ursache war nicht ein Fehler, sondern ein Muster: Eine Panne wurde behandelt wie "nicht angemeldet". Die Nutzerabfrage konnte eine Ausnahme werfen, die Oberfläche warf daraufhin das Token weg, der Benutzer meldete sich neu an und scheiterte an derselben Stelle',
    'Jetzt antwortet die Anmeldeprüfung bei einer gescheiterten Abfrage mit 503 statt mit einer Ausnahme und sagt, dass es nicht an den Zugangsdaten liegt. Die Oberfläche wirft das Token nur noch bei 401 weg; bei allem anderen bleibt es liegen und der Grund erscheint',
    'Die Landeseite nach dem SSO-Login prüft das Token jetzt einmal, bevor sie weiterleitet. Scheitert es, steht der Grund dort, statt dass man wortlos auf der Anmeldeseite landet',
    'Jeder abgewiesene SSO-Versuch steht mit Begründung im Prüfpfad: welche Adresse Phalanx OS gemeldet hat, ob sie dort bestätigt ist, welche Rolle das Konto hier trägt',
    'Auf der Anmeldeseite stehen die Gründe im Klartext und nennen den Ausweg, statt ein Schlagwort in Klammern zu zeigen. Der Hinweis hängt nicht mehr daran, dass die Anbindung als eingeschaltet gemeldet wird: Fiel diese Abfrage aus, verschwand mit dem Knopf auch die Begründung',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
