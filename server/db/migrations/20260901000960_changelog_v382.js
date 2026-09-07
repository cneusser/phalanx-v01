/** Changelog v0.382 (Vorbereitete Mandate im Dashboard + LinkedIn im Funnel). */
const ENTRY = {
  version: 'v0.382', released_on: '2026-07-21',
  title: 'Vorbereitete Mandate direkt nach der Anmeldung',
  items: [
    'Neue Kachel „Für Sie vorbereitete Mandate" auf dem Käufer-Dashboard: Sie zeigt genau die Mandate, die für den Kontakt vorbereitet wurden, mit Button zum Zeichnen der Vertraulichkeitserklärung bzw. Zugang anfragen bei Startup-Finanzierungen',
    'Nur veröffentlichte Mandate werden angezeigt, Entwürfe bleiben unsichtbar',
    'Im Deal-Funnel sind über LinkedIn angesprochene Kontakte jetzt mit einem Kennzeichen „LinkedIn" markiert',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
