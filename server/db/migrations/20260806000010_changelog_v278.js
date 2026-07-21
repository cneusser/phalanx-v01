/** Changelog v0.278 (Recherchelisten aus Excel ins CRM). */
const ENTRY = {
  version: 'v0.278', released_on: '2026-07-21',
  title: 'Recherchelisten aus Excel ins CRM',
  items: [
    'Neuer Knopf „Liste importieren (Excel)" im CRM: Spalten werden automatisch erkannt, auch Investoren-/Fondslisten ohne Personennamen',
    'Vor dem Speichern ein Abgleich: welche Kontakte sind neu, welche schon im CRM (mit Zusammenfassung)',
    'Neue Kontakte anlegen, optional einem Mandat zuordnen und auf Wunsch alle einladen (Projektvorstellung, Hintergrund, Einwilligung, automatische Reminder)',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
