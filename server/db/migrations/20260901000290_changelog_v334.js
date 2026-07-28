/** Changelog v0.334 (Übergeber sehen ihre zugeordneten Kandidaten). */
const ENTRY = {
  version: 'v0.334', released_on: '2026-07-21',
  title: 'Übergeber sehen zugeordnete Kandidaten',
  items: [
    'Auf der Mandatsseite sieht der Übergeber jetzt zuerst die ihm vom Team zugeordneten Kandidaten, jeweils mit dem Status der Zuordnung (vorgeschlagen, vorgestellt, im Gespräch, vermittelt und weitere)',
    'Darunter stehen wie bisher die weiteren passenden Kandidaten aus dem Netzwerk',
    'Beide Listen folgen demselben Freischalt-Gate: ohne Freischaltung anonyme Vorschau, mit Namen und Kontakt erst nach Freischaltung durch das Team',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
