/** Changelog-Eintrag v0.242 (Sprint 16 — Admin-Dashboard 2.0 / Analytics). */
const ENTRY = {
  version: 'v0.242', released_on: '2026-07-10',
  title: 'Admin-Dashboard 2.0 — Analytics, Funnel & Kennzahlen',
  items: [
    'Statische Schnellzugriff-Blöcke durch datengetragene Kacheln mit Live-Kennzahlen ersetzt',
    'Deal-Funnel (Interesse → NDA → signiert → Datenraum → LOI → Closing) mit Conversion-Raten',
    'Zeitreihen (7/30/90 Tage, YTD) als Sparklines: neue Nutzer, NDAs, Datenraum-Zugriffe, Nachrichten',
    'Mandats-Ranking mit Stagnations-Warnung; klickbare KPI-Kacheln; CSV-Export der Kennzahlen',
    'Neuer Analytics-Endpoint GET /api/admin/analytics',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
