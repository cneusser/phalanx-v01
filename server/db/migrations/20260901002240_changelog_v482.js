/** Changelog v0.482 (Teststufe, Testdrehbuch, und zwei Funde daraus). */
const ENTRY = {
  version: 'v0.482', released_on: '2026-11-20',
  title: 'Eine Teststufe neben der Produktion, und zwei Fehler, die sie am ersten Tag fand',
  items: [
    'Es gibt jetzt zwei Ebenen. Die Teststufe läuft als eigener Dienst mit eigener Datenbank, eigenem Dateispeicher und erfundenen Daten. Sie teilt nichts mit der Produktion, eine fehlerhafte Migration dort trifft also die Produktion nicht',
    'Drei Sicherungen, denn ohne sie wäre eine Kopie der Plattform gefährlicher als keine. Erstens ein braun gestreifter Balken auf jeder Seite, auch vor der Anmeldung, der sich nicht wegklicken lässt. Zweitens kein Mailversand: Jede Mail wird zurückgehalten, bis eine Adresse ausdrücklich freigeschaltet ist, und trägt dann „[TESTSTUFE]" im Betreff. Drittens ein Tor: Ohne Einladungslink sieht ein Besucher eine schlichte Seite und sonst nichts',
    'Die Demowelt bringt vier erfundene Mandate und vier Interessenten, von denen jeder an einer anderen Stelle des Prozesses steht: einer hat nur angefragt, einer hat die Vereinbarung zum Unterschreiben, einer hat unterschrieben, einer ist im Datenraum. Ein Befehl setzt alles auf den Ausgangszustand zurück, und er weigert sich, wenn er auf der Produktion aufgerufen wird',
    'Das Testdrehbuch hat vier Abschnitte: Sicht des Verkäufers, Sicht des Käufers, Neuanlage, Abruf von Daten. Es gibt es zweimal, als Liste zum Abhaken und als Programm, das denselben Schritten in derselben Ordnung folgt',
    'Beim allerersten Durchlauf fand das Drehbuch zwei Fehler, die in der Produktion standen und die keine der bisherigen Prüfungen sehen konnte',
    'Der schwerere: Wer ein Mandat nur angefragt hatte, konnte Informationsmemorandum und Datenraum-Unterlagen herunterladen. Die Ursache war eine verlorene Angabe. Beim Aufbau des Lesekontextes wurde die Stufe des Interessenten nicht mitgegeben, und der Rückfallwert war die höchste Stufe statt der niedrigsten. Ein Versehen wurde so zu einem offenen Datenraum. Der Rückfall ist jetzt die öffentliche Stufe, ein Versehen führt damit zu einem zu engen Blick, und den meldet der Nutzer',
    'Der zweite: Das Archiv eines Ordners und des ganzen Datenraums brach mit einem Serverfehler ab. Das Paket „archiver" liefert in seiner neuen Hauptversion keine aufrufbare Funktion mehr, und der Aufruf stand an zwei Stellen unverändert. Das kam aus einer Paketaktualisierung und war im Quelltext nicht zu erkennen',
    'Dazu eine Anleitung, was in Railway einzurichten ist, und die Reihenfolge für künftige Releases: erst auf die Teststufe, dort das Drehbuch, dann die Produktion',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
