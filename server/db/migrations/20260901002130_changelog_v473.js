/** Changelog v0.473 (fünf Befunde aus der Durchsicht). */
const ENTRY = {
  version: 'v0.473', released_on: '2026-11-15',
  title: 'Der zweite Faktor war eine Höflichkeitsfrage',
  items: [
    'Bei aktivem zweitem Faktor gab die Anmeldung nach richtigem Passwort eine Bescheinigung zurück, mit der nur der Code eingelöst werden sollte. Sie trug keine Token-Version, und die Prüfung liess eine fehlende Version als Null durchgehen. Damit war diese Bescheinigung fünf Minuten lang ein vollwertiges Sitzungstoken: Wer das Passwort kannte, konnte den zweiten Faktor überspringen',
    'Die Bescheinigung trägt jetzt ihren Zweck und die Token-Version, und die Prüfung weist sie ausdrücklich ab. Ein Schein, der zwei Dinge kann, kann eines davon zu früh',
    'Eine Route zum Anlegen eines Kontakts aus einem Nutzerkonto war zweimal registriert. Express nimmt die erste, und das war die ohne Schreibrecht; die geprüfte Fassung war toter Code. Die ungeschützte ist entfernt',
    'Die Dateitypprüfung beim Hochladen verknüpfte Mimetype und Endung mit ODER. Den Mimetype bestimmt der Absender frei, also genügte die Behauptung "PDF". Jetzt müssen beide stimmen',
    'Die Löschung über einen Einladungslink prüfte weder Ablauf noch Stand. Ein alter Link aus einem weitergeleiteten Postfach löschte damit unwiderruflich eine Akte. Jetzt endet ein abgelaufener Link mit einer Meldung statt mit einer Löschung',
    'Der Link zum Zurücksetzen des Passworts stand im Serverprotokoll und im Mail-Ausgangsbuch im Klartext. Beides ist weg: protokolliert wird die Nutzerkennung, und im Ausgangsbuch werden Zugangsmails ohne Inhalt gezeigt, zusätzlich wird jeder Schlüssel in einem Link unkenntlich gemacht',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
