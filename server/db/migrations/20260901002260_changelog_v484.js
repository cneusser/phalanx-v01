/** Changelog v0.484 (eine Fehlermeldung, die auf die richtige Stelle zeigt). */
const ENTRY = {
  version: 'v0.484', released_on: '2026-11-21',
  title: 'Eine unbrauchbare Datenbankadresse wird beim Namen genannt',
  items: [
    'Beim Einrichten der Teststufe stand in der Variablen DATABASE_URL der Verweis als Text statt des aufgelösten Wertes. Railway löst einen Verweis nur auf, wenn er über „Add Reference" angelegt wurde; getippt bleibt er Text',
    'Die Anwendung meldete daraufhin in Schleife „Failed to initialize database: getaddrinfo ENOTFOUND base" und stürzte ab. Der Rechner „base" existiert nicht, der Name ist ein Bruchstück: Der Verbindungsparser zerschneidet jede Zeichenkette ohne Doppelpunkt und Schrägstriche und findet in „DATABASE_URL" das Wort „base"',
    'Die Meldung zeigte damit auf das Netz, obwohl der Fehler in der Variablen stand. Das kostete eine Stunde Suche an der falschen Stelle',
    'Neu ist eine Prüfung vor dem ersten Verbindungsversuch. Ist DATABASE_URL gesetzt, aber keine Adresse, die mit postgres:// oder postgresql:// beginnt, bricht der Start sofort ab und nennt den gefundenen Wert, das erwartete Format und, wenn es nach einem unaufgelösten Verweis aussieht, den Weg zur Reparatur',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
