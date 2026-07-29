/** Changelog v0.339 (Übersicht: Zeitraum wirkt auf die Kacheln). */
const ENTRY = {
  version: 'v0.339', released_on: '2026-07-21',
  title: 'Übersicht: Zeitraum-Umschalter wirkt auf die Kacheln',
  items: [
    'Der Zeitraum-Umschalter (7/30/90 Tage, YTD) beeinflusst jetzt die zeitraumbezogenen Kacheln: NDA-Anfragen, neue Nutzer, Feedback, ausführliche Bewertungen, Bewertungs-Leads und Aktivität zählen im gewählten Fenster',
    'Echte Momentaufnahmen (Pipeline im Prozess, aktive Projekte) bleiben bewusst stabil und sind als „aktuell" gekennzeichnet',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
