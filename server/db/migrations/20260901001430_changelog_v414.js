/** Changelog v0.414 (Auch hinter dem Login beide Sprachen, Kontakt neu). */
const ENTRY = {
  version: 'v0.414', released_on: '2026-09-26',
  title: 'Auch hinter dem Login beide Sprachen, Kontakt neu',
  items: [
    'Mandatsdetail, Mein Bereich und der Datenraum sprechen jetzt Deutsch und Englisch, mit Datumsangaben in der jeweiligen Schreibweise',
    'Die Kontaktseite trägt die Handschrift der Startseite: Georgia in den Überschriften, scharfe Kanten, Gold als einziger Akzent',
    'Auf der Kontaktseite steht der Termin jetzt gleichberechtigt neben dem Formular. Wer lieber spricht als schreibt, sucht sich direkt eine Zeit aus, ohne die Seite zu verlassen',
    'Die Felder haben sichtbare Beschriftungen statt nur Platzhaltertexte. Ein Platzhalter verschwindet beim Tippen, und dann weiß niemand mehr, was in das Feld gehört',
    'Ein Prüflauf schlägt künftig an, wenn eine Übersetzung außerhalb einer Funktion aufgerufen wird. Das führt zu einer weißen Seite auf der ganzen Plattform, nicht nur zu einem falschen Wort',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
