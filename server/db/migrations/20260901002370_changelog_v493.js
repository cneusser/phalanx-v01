/** Changelog v0.493 (startklar statt Punktestand). */
const ENTRY = {
  version: 'v0.493', released_on: '2026-11-22',
  title: 'Startklar statt Punktestand, und die Suchaufträge sind auffindbar',
  items: [
    'Der Punktestand auf dem Dashboard ist entfallen. Punkte gab es für Schritte, die ohnehin jeder geht, einlösen liess sich nichts, und die Zahl sagte niemandem, was als Nächstes zu tun ist. Die Frage „Was kann ich mit den Punkten machen?" hatte keine Antwort',
    'An seiner Stelle steht, was noch fehlt, damit die Plattform für Sie arbeitet: wer Sie sind, wie wir Sie erreichen, Ihre Gesellschaft im Vertrag, wonach Sie suchen, und ein gespeicherter Suchauftrag. Jeder Schritt nennt die fehlenden Angaben beim Namen, sagt wozu sie gebraucht werden und führt mit einem Verweis direkt dorthin',
    'Erledigtes bleibt stehen, damit der Fortschritt sichtbar ist. Ist alles gepflegt, schrumpft der Baustein auf eine Zeile und nimmt keinen Platz mehr weg. Der gespeicherte Suchauftrag ist freiwillig und hält den Fortschritt nicht auf',
    'Die Suchaufträge waren über kein Menü erreichbar, obwohl die Begrüssung auf dem Dashboard sie ankündigt. Sie stehen jetzt im Benutzermenü, in der breiten wie in der schmalen Ansicht',
    'Sitz, Register und vertretungsberechtigte Person lassen sich jetzt auch im Profil pflegen. Bisher wurden sie nur im Unterschriftsdialog erhoben, und wer sie später ändern wollte, fand keine Stelle dafür',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
