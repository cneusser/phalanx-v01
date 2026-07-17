/** Changelog v0.277 (Prozessstand für den Mandanten, Reaktionen sichtbar). */
const ENTRY = {
  version: 'v0.277', released_on: '2026-08-05',
  title: 'Prozessstand für den Mandanten, Reaktionen sichtbar',
  items: [
    'Verkäufer sehen im Dashboard einen reduzierten Funnel ihres Mandats: interessierte Parteien mit Namen und Stufe, ohne Kontaktdaten und ohne Bezug zu anderen Mandaten',
    'In „Versendete Mailings" zeigt ein Klick auf die Reaktions-Zahl, wer reagiert hat (Empfängerliste nach Status, Klick öffnet den Kontakt)',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
