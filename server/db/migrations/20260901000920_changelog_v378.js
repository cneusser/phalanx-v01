/** Changelog v0.378 (Neuer DUB-Kontakt Alexander Kubald). */
const ENTRY = {
  version: 'v0.378', released_on: '2026-07-21',
  title: 'Neuer Kontakt: Alexander Kubald (Betongold)',
  items: [
    'Alexander Kubald (M&A-Berater mit Suchmandat, Quelle DUB.de) als Interessent für das Mandat Betongold aufgenommen und im Deal-Funnel auf Stufe „Rückmeldung" gesetzt',
    'Angelegt mit Einwilligungsstatus „unbekannt"; die Einladung mit Registrierungslink verschickt der Berater per Klick aus dem CRM (Double-Opt-in)',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
