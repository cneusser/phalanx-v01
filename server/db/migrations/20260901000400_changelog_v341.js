/** Changelog v0.341 (Aktivitätslog-Mandat korrekt, Ordner per Drag-and-drop). */
const ENTRY = {
  version: 'v0.341', released_on: '2026-07-21',
  title: 'Aktivitätslog-Mandat korrekt, Ordner-Upload',
  items: [
    'Im Aktivitätslog wurde bei Safe-Aktionen (Ansicht, Download, Löschen) ein falsches Mandat angezeigt, weil die Objekt-Id fälschlich als Projekt-Id gelesen wurde. Das Mandat wird jetzt korrekt über die Safe-Ablage aufgelöst',
    'Ordner lassen sich jetzt auch per Drag-and-drop hochladen, inklusive der Unterordnerstruktur',
    'Auch leere Ordner werden beim Ziehen mit angelegt',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
