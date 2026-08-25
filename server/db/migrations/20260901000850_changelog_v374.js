/** Changelog v0.374 (Vorbereitetes Suchprofil wird bei Registrierung aktiv). */
const ENTRY = {
  version: 'v0.374', released_on: '2026-07-21',
  title: 'Suchprofil für eingeladene Käufer, automatisch beim Anmelden',
  items: [
    'Berater können einem eingeladenen Käufer ein Suchprofil hinterlegen; sobald sich die Person registriert, wird daraus ein echtes Suchprofil des Kontos, das automatisch gegen neue Mandate matcht',
    'Der Mandatsabgleich versteht jetzt auch Listen (mehrere Branchen oder Regionen je Profil), nicht nur einzelne Werte',
    'Für Christoph Giesen (Motus Unternehmerkapital / Kernfels Gruppe) ist das Buy-Side-Suchprofil vorbereitet und greift ab seiner Anmeldung',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
