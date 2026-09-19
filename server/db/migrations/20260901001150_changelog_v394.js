/** Changelog v0.394 (Ordner zusammenführen auf allen Ebenen). */
const ENTRY = {
  version: 'v0.394', released_on: '2026-07-30',
  title: 'Ordner zusammenführen auf allen Ebenen',
  items: [
    '„Bereinigen" führt gleichnamige Ordner jetzt auf jeder Ebene zusammen, nicht mehr nur ganz oben. Nach einem Import aus mehreren Quellen entsteht so wieder genau eine Struktur; Inhalte wandern mit, gelöscht wird nichts',
    'Nach dem Zusammenführen werden die Positionen je Ebene neu vergeben, damit die Nummerierung wieder lückenlos ist',
    'Ein Ordner mit „Clean Team" im Namen wird beim Anlegen automatisch als vertraulich gekennzeichnet und steht damit nie versehentlich offen',
    'Die Überschrift des Safe nennt ihn nicht mehr eine reine Ablage ohne Investor-Zugriff: Er ist seit v0.392 zugleich der Datenraum',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
