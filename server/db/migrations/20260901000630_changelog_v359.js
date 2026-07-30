/** Changelog v0.359 (CRM: LinkedIn-Profil ansehen und recherchieren). */
const ENTRY = {
  version: 'v0.359', released_on: '2026-07-21',
  title: 'CRM: LinkedIn-Profil ansehen und recherchieren',
  items: [
    'Neuer LinkedIn-Button je Kontakt in der Liste öffnet ein Popup mit Profilkarte',
    'Ist ein Profil hinterlegt, öffnet es sich per Klick in einem neuen Tab (LinkedIn erlaubt keine Einbettung im Fenster)',
    'Ohne hinterlegtes Profil: Ein-Klick-Suche auf LinkedIn oder Google, gefundene Profil-URL lässt sich direkt im Popup speichern',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
