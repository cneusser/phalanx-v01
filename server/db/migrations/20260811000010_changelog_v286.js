/** Changelog v0.286 (Verkäufer-Funnel über mehrere Mandate). */
const ENTRY = {
  version: 'v0.286', released_on: '2026-07-21',
  title: 'Verkäufer-Funnel über mehrere Mandate',
  items: [
    'Mandanten sehen im Dashboard einen nur-lesbaren Funnel ihrer Mandate (Reiter bei mehreren Projekten), mit Kennzahlen je Stufe und den Namen der interessierten Parteien',
    'Bewusst ohne Kontaktdaten und ohne Bezug zu anderen Mandaten; nur für den verknüpften Verkäufer bzw. Berater/Admin zugänglich',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
