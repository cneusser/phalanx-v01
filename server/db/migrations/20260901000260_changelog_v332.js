/** Changelog v0.332 (Nachfolge-Funnel als Kanban mit Notizen). */
const ENTRY = {
  version: 'v0.332', released_on: '2026-07-21',
  title: 'Nachfolge-Funnel als Kanban-Board',
  items: [
    'Der Nachfolge-Funnel im CRM ist jetzt ein echtes Kanban-Board mit einer Spalte je Stufe',
    'Kandidaten lassen sich per Ziehen zwischen den Stufen verschieben, die Anzahl je Spalte ist immer sichtbar',
    'Je Kandidat gibt es eine interne Notiz, direkt auf der Karte pflegbar und nur für das Team sichtbar',
    'Suche und Filter (Umsatz, Szenario) bleiben über dem Board erhalten',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
