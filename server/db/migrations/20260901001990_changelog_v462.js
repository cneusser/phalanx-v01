/** Changelog v0.462 (Mailverlauf in beide Richtungen). */
const ENTRY = {
  version: 'v0.462', released_on: '2026-10-18',
  title: 'Mailverlauf in beide Richtungen',
  items: [
    'Die Historie kannte bisher nur eingehende Mails. Man sah, was ein Interessent wollte, und nicht, was ihm zugesagt wurde. Bei mehreren Beratern an einem Mandat ist das der Punkt, an dem zwei Leute dasselbe zweimal beantworten, und zwar verschieden',
    'Die Richtung ergibt sich jetzt aus dem Absender: Kommt die Mail aus dem eigenen Haus, ist sie ausgehend, und der Kontakt ergibt sich aus dem Empfänger. Die Liste der eigenen Domains steht in der Umgebungskonfiguration (EIGENE_DOMAINS), nicht im Quelltext. Ohne gesetzte Variable bleibt alles eingehend wie bisher, denn eine fehlende Einstellung darf die Richtung nicht raten',
    'Eine Mail an drei Interessenten erzeugt drei Einträge, einen je Akte. Eine Sammelakte liesse sich später nicht mehr trennen. Kopien an eigene Adressen landen in keiner Akte',
    'Die Zuordnung zum Mandat läuft zuerst über den Antwortbezug, dann über den Codenamen im Betreff, dann über ein einziges laufendes Mandat des Kontakts. Bei mehreren laufenden Mandaten ohne Antwortbezug wird keines zugeordnet: Eine geratene Zuordnung wandert in die Mandatsakte und wird dort geglaubt',
    'Dieselbe Mail zweimal eingeliefert erzeugt einen Eintrag. Die Eindeutigkeit liegt als Index in der Datenbank und nicht als Prüfung im Code, denn eine Prüfung im Code greift nicht, wenn zwei Aufrufe gleichzeitig laufen',
    'Eine ausgehende Mail setzt weder "hat geantwortet" noch die Funnel-Stufe und erzeugt keine Wiedervorlage. Dass wir geschrieben haben, ist keine Rückmeldung',
    'Brevo Inbound Parsing wird dafür nicht mehr gebraucht. Phalanx OS liest die Postfächer ohnehin und reicht die Mails direkt weiter; der Auftrag dazu liegt unter docs/auftraege',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
