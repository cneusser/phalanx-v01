/** Changelog v0.422 (Der Bau im Container bricht nicht mehr an einer Datei). */
const ENTRY = {
  version: 'v0.422', released_on: '2026-09-28',
  title: 'Der Bau im Container bricht nicht mehr an einer fehlenden Datei',
  items: [
    'Die Auslieferung von v0.421 ist fehlgeschlagen: Die Oberfläche bindet die gemeinsame Branchenliste ein, das Bauskript für den Server kopierte diese Datei aber nicht mit. Auf dem eigenen Rechner fällt so etwas nie auf',
    'Ein Prüflauf nimmt das jetzt vorweg: Er sucht jeden Zugriff der Oberfläche auf Dateien außerhalb ihres eigenen Verzeichnisses und verlangt, dass das Bauskript sie mitnimmt, und zwar rechtzeitig',
    'Zwei Übersetzungsschlüssel waren doppelt vergeben. Der frühere war dabei wirkungslos, man hätte ihn ändern können, ohne dass sich etwas tut. Der Prüflauf schlägt jetzt auch darauf an',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
