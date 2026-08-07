/** Changelog v0.371 (Geteilter Team-Posteingang über alle Kontakte). */
const ENTRY = {
  version: 'v0.371', released_on: '2026-07-21',
  title: 'Geteilter Team-Posteingang',
  items: [
    'Neuer Button „Posteingang" im CRM zeigt alle E-Mail-Konversationen über alle Kontakte an einem Ort, mit Vorschau, Richtung und Zeitpunkt',
    'Filter „Antwort offen" zeigt Konversationen, bei denen zuletzt eine eingegangene Nachricht steht und noch keine Antwort folgte, ein roter Punkt markiert sie',
    'Ein Klick öffnet den Kontakt direkt in der Konversationsansicht zum Antworten',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
