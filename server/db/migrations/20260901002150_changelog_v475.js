/** Changelog v0.475 (Pakete auf einen sicheren Stand). */
const ENTRY = {
  version: 'v0.475', released_on: '2026-11-15',
  title: 'Von siebzehn Lücken auf fünf, und keine davon mehr hoch',
  items: [
    'Der Serverteil meldete 17 Schwachstellen, davon 2 kritisch und 9 hoch. Jetzt sind es 5, alle mittel. Kritisch und hoch sind auf null',
    'Ohne Bruch behoben: proxy-addr und tar (beide kritisch), body-parser, brace-expansion, multer, path-to-regexp, canvas, pdfjs-dist und node-pre-gyp',
    'nodemailer von 6 auf 10. Die genutzte Schnittstelle, createTransport und sendMail, ist unverändert; behoben werden damit eine Zustellung an eine unbeabsichtigte Domain und eine Einschleusung über den Umschlag',
    'xlsx ist draussen. Es trug zwei offene Lücken, die nicht behoben werden: SheetJS liefert über npm nicht mehr aus. Gelesen wurden damit nur hochgeladene Tabellen an zwei Stellen, und das übernimmt jetzt exceljs, das ohnehin im Projekt lag. Das Lesen läuft dadurch asynchron, das Ergebnis ist dasselbe',
    'Express von 4 auf 5. Damit entfallen qs, body-parser und path-to-regexp als eigene Baustellen. Im Code waren zwei Stellen anzupassen: der Platzhalter am Ende heisst jetzt "{*rest}" und der wahlfreie Mandatsparameter im Klarnamen-Bericht "{/:projectId}"',
    'Dazu eine Zeile, die Express 4 nachstellt: Ein fehlender Rumpf wird wieder zum leeren Objekt. Express 5 lässt ihn undefiniert, und im Bestand lesen rund 330 Stellen den Rumpf direkt aus; jede davon hätte sonst mit einem Serverfehler geantwortet statt mit der Angabe, welches Feld fehlt',
    'In der Oberfläche sind von drei Meldungen zwei behoben. Die verbleibenden zwei hängen an React Router 6 und wären ein Wechsel auf 7, also eine eigene Entscheidung',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
