/** Changelog-Eintrag v0.266 (Dokumente umbenennen). */
const ENTRY = {
  version: 'v0.266', released_on: '2026-07-28',
  title: 'Dokumente umbenennen',
  items: [
    'Bezeichnung und Kurzbeschreibung eines Dokuments lassen sich nachträglich ändern, Klick auf den Namen oder „Umbenennen"',
    'Die Dateiendung bleibt automatisch erhalten, damit die Datei beim Empfänger korrekt öffnet',
    'Jede Änderung steht im Audit-Trail (alter und neuer Name)',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
