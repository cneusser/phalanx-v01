/** Changelog-Eintrag v0.243 (Sprint 17 — Gamification / XP). */
const ENTRY = {
  version: 'v0.243', released_on: '2026-07-10',
  title: 'XP & Level — Belohnung für echte Prozessschritte',
  items: [
    'Sammeln Sie XP für echte Schritte: Interesse, NDA, Datenraum, Due Diligence, LOI',
    'Großer Bonus für Deals, die über die Plattform abgewickelt werden',
    'Level vom Entdecker bis zum Elite-Dealmaker mit Fortschrittsanzeige im „Mein Bereich"',
    'Punktevergabe an dieselben Prozess-Events wie die Deal-Timeline (idempotent, DSGVO-schonend)',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
