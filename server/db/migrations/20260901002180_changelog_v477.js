/** Changelog v0.477 (Datenraum 2.0, Sprint 1a: ein Bestand, ein Speicherweg). */
const ENTRY = {
  version: 'v0.477', released_on: '2026-11-15',
  title: 'Der Teaser steht jetzt dort, wo der Käufer ihn sucht',
  items: [
    'Anlass war die Beobachtung: hochgeladene Unterlagen wie Teaser oder Exposé tauchten im Datenraum nicht auf. Das war kein Bedienfehler. Es gab zwei Ablagen, die nichts voneinander wussten: Der Dokumente-Reiter schrieb als Datei auf das Railway-Volume, der Datenraum zeigt die Objekte beim Speicheranbieter',
    'Was über den Dokumente-Reiter hochgeladen wird, geht jetzt denselben Weg wie alles andere und bekommt zusätzlich einen Platz im Datenraum-Baum. Nach Zugangsstufe sortiert: 00 Teaser, 01 Informationsmemorandum, 02 Unterlagen. Eine eigene Ordnerangabe schlägt die Stufe',
    'Es entsteht dabei keine zweite Datei. Der Eintrag im Baum zeigt auf denselben Schlüssel wie die Dokumentzeile',
    'Auch "In Datenraum übernehmen" legt keine zweite Kopie mehr an. Bisher lag dieselbe Unterlage zweimal, einmal beim Speicheranbieter und einmal als Datei daneben. Zwei Kopien bedeuten zwei Schicksale: Wird im Safe geschwärzt, blieb die Kopie ungeschwärzt',
    'Bestehende Zeilen bleiben lesbar. Sie tragen weiterhin ihren Dateipfad, und der wird weiter gelesen, bis sie umgezogen sind',
    'Dazu eine Stelle im Code, die Dateien ablegt, holt und entfernt. Vorher taten das vier Stellen mit je eigener Ordnerlogik, und genau daraus folgte, dass die Hälfte der Unterlagen nicht bei R2 lag, obwohl R2 eingestellt ist',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
