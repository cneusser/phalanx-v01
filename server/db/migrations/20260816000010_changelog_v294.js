/** Changelog v0.294 (Stufe D DUB-Benchmark: Verkäufer-Cockpit). */
const ENTRY = {
  version: 'v0.294', released_on: '2026-08-16',
  title: 'Verkäufer-Cockpit: Statistik, Inbox, Umschalter',
  items: [
    'Verkäufer-Statistik über alle eigenen Mandate und Gesamtzahl der Interessenten',
    'Konsolidierte Interessenten-Inbox je Mandat, Klarnamen erst nach Namensnennung, ohne Kontaktdaten',
    'Aktuelles-Feed mit den jüngsten Bewegungen der letzten 14 Tage',
    'Rollen-Umschalter im Menü zwischen Käufer-Bereich und Verkäufer-Bereich',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
