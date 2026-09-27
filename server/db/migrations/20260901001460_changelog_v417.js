/** Changelog v0.417 (Zwei Werkzeuge: Suchprofil-Bericht und Datenraum-Plan). */
const ENTRY = {
  version: 'v0.417', released_on: '2026-09-27',
  title: 'Zwei Werkzeuge: Suchprofil-Bericht und Datenraum-Plan',
  items: [
    'Der Suchprofil-Bericht zeigt, welche Nachfolge-Profile vor v0.416 auf kein einziges Mandat trafen und jetzt treffen. Damit lässt sich entscheiden, wen man anschreibt',
    'Der Datenraum-Plan schlägt für jede Datei einen Ordner und eine Vertraulichkeitsstufe vor, mit Begründung je Zeile. Er ändert von sich aus nichts',
    'Umsortieren und Vertraulichkeit sind zwei getrennte Schritte: eine falsch einsortierte Datei ist in zehn Sekunden zurückgeschoben, eine falsch gesetzte Stufe fällt erst auf, wenn jemand etwas gesehen hat',
    'Dateinamen, die auf keine Regel passen, werden nicht geraten, sondern bleiben liegen und werden gemeldet',
    'Dazu eine Prüfliste mit 16 Punkten, die übliche Unterlagen im Bestand sucht und meldet, was zu fehlen scheint',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
