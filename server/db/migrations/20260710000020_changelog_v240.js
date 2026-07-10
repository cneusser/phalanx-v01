/** Changelog-Eintrag v0.240 (zwei neue Transaktionsmandate + Roadmap-Ausbau). */
const ENTRY = {
  version: 'v0.240', released_on: '2026-07-10',
  title: 'Zwei neue M&A-Mandate & erweiterte Roadmap (Vernetzung, XP)',
  items: [
    'Neues Mandat „Betongold": Nachfolge-/Skalierungscase (Immobilien / Facility Management)',
    'Neues Mandat „Cudd": Transformationscase (Konsumgüter / Markenartikel)',
    'Roadmap: direkte Vernetzung Käufer↔Verkäufer über Chat (Interesse → Intro → mandatsbezogener Chat)',
    'Roadmap: XP-/Level-Gamification für Prozessschritte und plattformseitige Deal-Abwicklung',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
