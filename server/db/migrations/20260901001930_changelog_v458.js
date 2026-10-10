/** Changelog v0.458 (users.last_login gab es nie). */
const ENTRY = {
  version: 'v0.458', released_on: '2026-10-10',
  title: 'Eine Spalte, die es nie gab',
  items: [
    'Die Spalte users.last_login wurde an vier Stellen abgefragt und war nie angelegt worden. Kein Wanderungsschritt erzeugt sie, und trotzdem stand sie seit Langem in den Abfragen',
    'Weil an diesen Stellen ein catch hing, wurde aus dem Datenbankfehler dreierlei: in der Kontaktakte "kein Plattform-Konto", obwohl das Konto besteht; in "Ansicht prüfen" eine leere Personenliste; im Konten-Bericht eine leere Spalte. Drei Symptome, eine Ursache, und keines sah nach einem Fehler aus',
    'Die Spalte wird nachgetragen statt aus den Abfragen entfernt: Wann jemand zuletzt da war, ist die Angabe, nach der man einen Interessenten als Erstes beurteilt. Die Anmeldungen schreiben sie jetzt fort, auch über 2FA und über Phalanx OS',
    'Rückwirkend wird sie aus dem Anmeldeprotokoll gefüllt. Das ist genauer als leere Felder und ehrlicher als ein erfundenes Datum',
    'Die Schemaprüfung vergleicht ab sofort auch die abgefragten Spalten der Tabelle users mit dem Schema, nicht mehr nur die Tabellennamen. Derselbe Fehler fällt künftig beim Bauen auf und nicht erst, wenn zwei Ansichten einander widersprechen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
