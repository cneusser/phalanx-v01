/** Changelog v0.384 (Mitmachen-Landingpage + Herkunfts-Tracking). */
const ENTRY = {
  version: 'v0.384', released_on: '2026-07-21',
  title: 'Mitmachen-Landingpage mit Herkunfts-Tracking',
  items: [
    'Neue öffentliche Landingpage unter /mitmachen, die zur Registrierung führt; ideal zum Teilen auf LinkedIn',
    'Der Link kann eine Herkunft tragen (z. B. /mitmachen?src=linkedin); diese wird bis in die Registrierung durchgereicht und dauerhaft am Konto gespeichert',
    'Im Admin unter Nutzer zeigt eine Übersicht „Registrierungen nach Herkunft", wie viele Anmeldungen z. B. von LinkedIn kommen (gesamt und in den letzten 30 Tagen)',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
