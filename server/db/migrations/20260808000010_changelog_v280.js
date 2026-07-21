/** Changelog v0.280 (Verkäufer aus dem Käufer-Funnel trennen, Verkäufer einladen). */
const ENTRY = {
  version: 'v0.280', released_on: '2026-07-21',
  title: 'Verkäufer getrennt vom Käufer-Funnel, Verkäufer einladbar',
  items: [
    'Die Funnel-Spalten zeigen nur noch Käufer; Verkäufer/Mandant und weitere Beteiligte stehen in einer eigenen Leiste',
    'Verkäufer lassen sich zur Plattform einladen und sehen nach der Registrierung den Prozessstand ihres Mandats',
    'Registrierung als Rolle „seller" ohne Käufer-Automatik/NDA; Zugang über den CRM-Kontakt mit dem Mandat verknüpft',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
