/** Changelog v0.442 (Q&A ab unterschriebenem NDA, und für Verwaltende sichtbar). */
const ENTRY = {
  version: 'v0.442', released_on: '2026-10-01',
  title: 'Q&A ab unterschriebenem NDA, und für Verwaltende sichtbar',
  items: [
    'Auf der Mandatsseite stand für Verwaltende "Noch keine Fragen gestellt", während im Verwaltungsbereich dieselben Fragen zu sehen waren. Die Seite holte die Fragen nur im Zweig für Interessenten, und dort erst ab freigegebenem Datenraum. Für Verwaltende wurden sie nie geholt, was wie ein Rechteproblem aussah',
    'Das Q&A steht jetzt ab unterschriebener Vertraulichkeitsvereinbarung offen, vorher ab Datenraum-Freigabe. Die Fragen, die ein Interessent nach dem NDA zum Exposé hat, sind genau die, die über eine Datenraum-Freigabe entscheiden. Wer erst danach fragen darf, fragt zu spät',
    'Die Leseroute hatte überhaupt kein Gate: Wer die Adresse kannte, sah die für alle freigegebenen Antworten auch ohne NDA. In einem anonymen Verkaufsprozess ist eine Antwort oft aussagekräftiger als der Teaser',
    'Ohne NDA erscheint kein Eingabefeld mehr, sondern der Grund. Ein Feld, das jede Eingabe abweist, hält der Nutzer für einen Fehler und nicht für eine Regel',
    'Unverändert bleiben die übrigen Stufen: das Informationsmemorandum ab NDA, der Datenraum ab ausdrücklicher Freigabe',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
