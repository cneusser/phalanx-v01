/** Changelog v0.392 (Der Safe ist der Datenraum). */
const ENTRY = {
  version: 'v0.392', released_on: '2026-07-28',
  title: 'Der Safe ist der Datenraum',
  items: [
    'Käufer sehen nach Ihrer persönlichen Freigabe den echten Ordnerbaum des Safe statt einer flachen Liste, mit Pfadleiste, Volltextsuche und Vorschau mit persönlichem Wasserzeichen',
    'Ganze Ordner lassen sich als Archiv herunterladen. Dabei wird jede enthaltene Datei einzeln protokolliert, die Nachvollziehbarkeit bleibt also vollständig erhalten',
    'Clean Team: Ordner und Dateien lassen sich als vertraulich kennzeichnen. Sie erscheinen bei Käufern nur gesperrt, bis es eine Einzelfreigabe gibt; eine Freigabe wirkt auch für die Objekte darunter, und eine Freigabe tief im Zweig öffnet den Weg dorthin, ohne die Nachbarschaft preiszugeben',
    'Freigaben können an eine Person, einen Käufertyp, eine Gruppe oder alle Beteiligten gehen, wahlweise nur zum Ansehen oder mit Download',
    'Die Suche liefert Käufern nur Treffer aus freigegebenen Bereichen, damit keine Namen oder Textausschnitte aus gesperrten Bereichen durchscheinen',
    'Neuer Knopf „Alte Dokumente übernehmen": holt Unterlagen aus der bisherigen flachen Datenraum-Liste mit ihrem Ordnerpfad in den Safe',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
