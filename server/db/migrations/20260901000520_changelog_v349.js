/** Changelog v0.349 (Käufer-Datenraum als Ordnerbrowser, Neu-Markierung, Benachrichtigung). */
const ENTRY = {
  version: 'v0.349', released_on: '2026-07-21',
  title: 'Käufer-Datenraum: Ordnerbrowser, neue Unterlagen, Benachrichtigung',
  items: [
    'Der Käufer klickt sich jetzt genau wie im Safe durch Ordner und Dateien (Breadcrumb, Unterordner, Eine-Ebene-höher) statt durch eine flache Liste. Die Ordnerstruktur wird beim Übernehmen aus dem Safe übernommen',
    'Neue Unterlagen werden je Käufer als „NEU" markiert (seit dem letzten Besuch), inklusive Zähler und Markierung am Ordner',
    'Suchfeld im Datenraum: schnelle Suche über Dateiname, Beschreibung und Ordner',
    'Neuer Button im Safe „Käufer benachrichtigen": informiert alle Käufer mit Datenraum-Zugang per E-Mail über neue Unterlagen (mit optionalem eigenen Text)',
    'Bestehende Dokumente wurden ihrem Safe-Ordner zugeordnet (Nachzug per Migration)',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
