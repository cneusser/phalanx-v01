/** Changelog-Eintrag v0.241 (Sprint 15: Connect & Interaktion Käufer↔Berater). */
const ENTRY = {
  version: 'v0.241', released_on: '2026-07-10',
  title: 'Direkte Vernetzung: aus Interesse wird ein mandatsbezogener Chat',
  items: [
    'Interesse/NDA verbindet Sie automatisch mit Ihrem Berater und öffnet einen mandatsbezogenen Chat',
    'Neuer Button „Chat mit Ihrem Berater starten" direkt im Mandat',
    'Prozess-Ereignisse (NDA, Due Diligence, LOI, Closing) erscheinen als Timeline im Chat',
    'Intro-Benachrichtigung per E-Mail; Mandatsbezug in jeder Nachricht sichtbar',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
