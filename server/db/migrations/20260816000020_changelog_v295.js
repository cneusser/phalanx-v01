/** Changelog v0.295 (Verkäufer-Bereich fokussiert). */
const ENTRY = {
  version: 'v0.295', released_on: '2026-07-21',
  title: 'Verkäufer-Bereich fokussiert',
  items: [
    'Verkäufer landen in „Mein Bereich" jetzt im eigenen Cockpit, nicht in der Käuferansicht',
    'Marktplatz und Käufer-Werkzeuge sind für Verkäufer ausgeblendet: nur eigene Inserate, Interessenten (ohne Kontaktdaten) und Funnel',
    'Aktive und pausierte Inserate lassen sich über „Bearbeiten" im Wizard pflegen, mit Autosave',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
