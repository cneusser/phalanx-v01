/** Changelog v0.455 (Zugriff eines Kontakts prüfen: Birdview im CRM). */
const ENTRY = {
  version: 'v0.455', released_on: '2026-10-10',
  title: 'Zugriff eines Kontakts prüfen',
  items: [
    'In der Kontaktakte beantwortet "Mit seinen Augen ansehen" die Frage, warum jemand die Unterlagen nicht öffnen kann. Mandat für Mandat steht dort die Kette aus Konto, Interesse, NDA, Freigabe und Rechten, und der erste offene Punkt ist der, an dem es hängt',
    'Je Datei im Datenraum steht das Urteil: Ansicht und Download, nur Ansicht, gesperrt oder unsichtbar. Dazu Teaser, IM und einzelne Unterlagen mit demselben Befund',
    'Entschieden wird das nicht in der Oberfläche, sondern von denselben Funktionen, die auch einen Klick zulassen oder abweisen. Eine zweite, freundlichere Rechnung wäre wertlos: Sie würde prüfen, was sie selbst annimmt',
    'Dafür ist der Käufer-Zweig aus der Datenraum-Route in ein eigenes Modul gewandert. Datenraum und Prüfung rufen jetzt dieselbe Stelle auf; es gibt keine zweite Fassung der Regeln, die veralten könnte',
    'Hat der Kontakt kein Nutzerkonto, ist genau das die Antwort, samt Weg: einladen, oder das Konto unter einer anderen Adresse verknüpfen. Die bestehende Birdview konnte diesen Fall nicht zeigen, weil sie sich als die Person anmeldet',
    'Dazu steht dort der Verlauf der Einladungen, denn auf "kein Konto" folgt immer die Frage, warum nicht: nie eingeladen, eingeladen und nicht geöffnet, geöffnet und nicht zu Ende geklickt, eingewilligt ohne Anmeldung, oder angemeldet unter einer anderen Adresse',
    'Behoben: Der Knopf "Zur Plattform einladen" war für Kontakte mit Einwilligung gesperrt, also für genau die Gruppe, die man einladen darf. Wer eingewilligt, aber nie ein Konto angelegt hatte, liess sich dadurch nicht mehr einladen. Der Server hatte das nie so gesehen',
    'Die Prüfung verändert nichts und sendet nichts. Protokolliert wird, dass geprüft wurde',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
