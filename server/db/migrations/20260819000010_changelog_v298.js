/** Changelog v0.298 (Konto verknüpfen, Unternehmen und Mandat aus dem Kontakt). */
const ENTRY = {
  version: 'v0.298', released_on: '2026-08-19',
  title: 'Konto verknüpfen, Unternehmen und Mandat aus dem Kontakt',
  items: [
    'Plattform-Konto lässt sich am Kontakt manuell suchen und verknüpfen, auch wenn die E-Mail im CRM abweicht. Danach steht der Birdview bereit',
    'Unternehmen direkt aus dem Kontakt zuordnen: bestehendes wählen oder neues anlegen, in beide Richtungen',
    'Mandat samt Rolle und Startstufe direkt aus dem Kontakt zuordnen',
    'Beim Anlegen eines Kontakts lassen sich Unternehmen (auch neu) und Mandat mit Rolle gleich mitgeben',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
