/** Changelog-Eintrag v0.253 (CRM III — Mandats-Mailings & automatisches Nachfassen). */
const ENTRY = {
  version: 'v0.253', released_on: '2026-07-15',
  title: 'Mandats-Mailings mit automatischem Nachfassen',
  items: [
    'Im Funnel: „Alle auswählen" — global oder je Stufe (Widersprüche werden gar nicht erst angehakt)',
    'Massenmailing je Mandat: anonymes Kurzprofil, DSGVO-Einwilligung und Pflege-Link in einer professionellen Mail',
    'Automatische Erinnerung an Tag 7 und abschließende Nachfrage an Tag 21 — jede Reaktion stoppt die Serie sofort',
    'Prozess-Updates gehen an aktive, eingewilligte Beteiligte; wesentliche Änderungen am Mandat lösen sie automatisch aus',
    'Reaktionsquote je Mailing sichtbar; Reminder-Automatik jederzeit abschaltbar',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
