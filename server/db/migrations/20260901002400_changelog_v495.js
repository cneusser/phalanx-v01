/** Changelog v0.495 (Sicherheitsdurchsicht, erster Teil). */
const ENTRY = {
  version: 'v0.495', released_on: '2026-11-23',
  title: 'Wer was darf, und an welchem Mandat',
  items: [
    'Die Rechte gelten jetzt auch beim Schreiben. Die Wache im Verwaltungsbereich prüfte nur, ob jemand zum Haus gehört, nicht was er darf: An 39 der 49 schreibenden Routen stand nichts weiter. Damit konnte die Rolle „Analyst (nur lesen)" Mandate löschen, Datenräume freigeben und Vereinbarungen bewilligen. Die Rechte dafür gibt es seit Langem, sie wurden nur nicht verlangt',
    'Was sich je Rolle ändert: Verwaltung und Eigentümer unverändert. Die Beratung unverändert, ausser dass sie keine Mandate mehr löscht. Die Assistenz pflegt weiter, veröffentlicht und gibt aber nicht mehr frei. Der Analyst liest, wie seine Beschriftung es seit jeher verspricht',
    'Die Beratung arbeitet nur noch an ihren Mandaten. Eine einzige Zeile öffnete bisher jedem Berater jedes Mandat, schreibend: Datenraum, Unterlagen, Freigaben, Vereinbarungen. An anderer Stelle beschreibt die Plattform dieselbe Rolle ausdrücklich als „sieht nur eigene Mandate". Jetzt entscheidet die Zuordnung: wer das Mandat angelegt hat oder ihm als Mitglied zugeordnet ist. Bestehende Zuordnungen hat die Umstellung angelegt, es bricht also nichts weg',
    'Der Datenraum nimmt nicht mehr jede Datei. Bisher gab es dort keine Typprüfung, und die Vorschau lieferte jede Datei mit dem vom Absender behaupteten Typ aus, immer zur Anzeige im Browser. Eine HTML- oder SVG-Datei wurde damit im Ursprung der Plattform geöffnet. Die strenge Prüfung der Unterlagen gab es daneben längst; beide benutzen jetzt dieselbe Liste',
    'Ausgeliefert wird mit dem Typ, der sich aus der Endung ergibt, nicht mit dem gespeicherten, und im Browser geöffnet werden nur PDF und Bilder. Altbestand, der vorher ungeprüft hereinkam, wird damit nachträglich entschärft: Er wird heruntergeladen statt angezeigt',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
