/** Changelog v0.373 (Zwei neue Kandidaten ins CRM aufgenommen). */
const ENTRY = {
  version: 'v0.373', released_on: '2026-07-21',
  title: 'Neue Kandidaten: Bihrer (Cudd) und Motus / Kernfels',
  items: [
    'Thomas Bihrer (Privatperson) als Interessent für das Mandat Cudd aufgenommen und im Deal-Funnel auf Stufe „Rückmeldung" gesetzt',
    'Christoph Giesen mit Unternehmen Motus Unternehmerkapital (Marke Kernfels Gruppe) als Buy-Side-Suchmandat aufgenommen, das vollständige Suchprofil liegt in den Notizen des Kontakts',
    'Beide mit Einwilligungsstatus „unbekannt" angelegt, die Einladung mit Registrierungslink verschickt der Berater per Klick aus dem CRM (Double-Opt-in)',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
