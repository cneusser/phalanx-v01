/** Changelog v0.413 (Lesbar, mitlaufend, und der Marktplatz lädt wieder). */
const ENTRY = {
  version: 'v0.413', released_on: '2026-09-26',
  title: 'Lesbar, mitlaufend, und der Marktplatz lädt wieder',
  items: [
    'Der Marktplatz zeigt wieder Mandate an: die Abfrage hatte die neuen englischen Spalten angefordert, bevor die Migration sie angelegt hatte, und lief deshalb auf einen Serverfehler. Sie fragt jetzt zuerst, welche Spalten es gibt',
    'Die Menüpunkte sind zurück. Der aktive Punkt stand in der Farbe der Leiste auf der Leiste und war damit unsichtbar, ebenso der Knopf "Jetzt Mandat starten" auf dunklem Grund. Beide haben jetzt den Goldton der Marke',
    'Die Kopfleiste läuft beim Scrollen mit. Ein overflow-x an der Außenhülle hatte das Mitlaufen stillgelegt',
    'Neuer Knopf zurück nach oben, unten rechts, sichtbar ab einer Bildschirmhöhe, mit Beschriftung für Vorleseprogramme und Rücksicht auf eingestellte Bewegungsarmut',
    'Ein Prüflauf misst den Kontrast künftig automatisch mit, damit sich eine unsichtbare Beschriftung nicht wiederholt',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
