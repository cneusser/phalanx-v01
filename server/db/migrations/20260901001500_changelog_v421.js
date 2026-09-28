/** Changelog v0.421 (Sichtbare Fassung und öffentliche Änderungsliste). */
const ENTRY = {
  version: 'v0.421', released_on: '2026-09-28',
  title: 'Sichtbare Fassung und öffentliche Änderungsliste',
  items: [
    'Unten links steht jetzt die Fassung, die Sie gerade sehen. Ein Klick darauf führt zur Liste aller Änderungen',
    'Zeigt Ihr Browser eine ältere Fassung als der Server, erscheint daneben ein Knopf zum Neuladen. Das ist der häufigste Grund dafür, dass eine Änderung scheinbar fehlt',
    'Die Änderungsliste unter /changelog sehen alle angemeldeten Nutzer, nicht mehr nur die Verwaltung',
    'Ein Prüflauf stellt sicher, dass die angezeigte Fassung zur jüngsten Änderung passt. Eine Versionsanzeige, der man nicht trauen kann, ist schlimmer als keine',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
