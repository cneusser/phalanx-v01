/** Changelog v0.297 (Birdview am Kontakt, Konto-Verknüpfung geheilt). */
const ENTRY = {
  version: 'v0.297', released_on: '2026-08-18',
  title: 'Birdview am Kontakt, Konto-Verknüpfung geheilt',
  items: [
    'Der Kontakt zeigt jetzt zuverlässig sein Plattform-Konto und bietet dort direkt den Birdview an',
    'Fehlende Verknüpfungen zwischen CRM-Kontakt und Konto werden über die E-Mail nachgezogen, einmalig für den Bestand und laufend beim Öffnen eines Kontakts',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
