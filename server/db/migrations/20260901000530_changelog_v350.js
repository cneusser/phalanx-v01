/** Changelog v0.350 (Kontakte auf „nicht kontaktieren" setzen). */
const ENTRY = {
  version: 'v0.350', released_on: '2026-07-21',
  title: 'Kontakte auf „nicht kontaktieren" setzen',
  items: [
    'Im Kontakt-Fenster setzt ein Klick „Nicht kontaktieren" den Kontakt auf Widerspruch. Er wird danach von jeder Ansprache und jedem Mailing ausgenommen, bleibt aber im CRM',
    'Sperre lässt sich mit „Wieder freigeben" aufheben',
    'Im Deal-Funnel können mehrere ausgewählte Kontakte auf einmal auf „nicht kontaktieren" gesetzt werden',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
