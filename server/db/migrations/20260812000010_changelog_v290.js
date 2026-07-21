/** Changelog v0.290 (Rückfrage beim Verschieben, Prozess-Übersicht). */
const ENTRY = {
  version: 'v0.290', released_on: '2026-07-21',
  title: 'Rückfrage beim Verschieben, Prozess-Übersicht',
  items: [
    'Verschieben im Funnel fragt jetzt nach: „Nur verschieben" oder „Verschieben + passende Prozess-Mail". Verschieben allein sendet keine Mail',
    'Neue Prozess- und Automatik-Übersicht erklärt die Funnel-Stufen und alle automatischen Mails',
    'Erinnerung: der Kontakt zeigt unter „Aktivitäten" den vollständigen E-Mail- und Chat-Verlauf',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
