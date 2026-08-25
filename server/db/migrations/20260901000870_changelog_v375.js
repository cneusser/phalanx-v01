/** Changelog v0.375 (Newsletter über alle aktuellen Mandate). */
const ENTRY = {
  version: 'v0.375', released_on: '2026-07-21',
  title: 'Newsletter über aktuelle Mandate',
  items: [
    'Neuer Button „Newsletter" im CRM: eine Rundmail über alle aktuellen Mandate an eingewilligte Kontakte (Button in den Marktplatz) oder an alle Kontakte als Bitte um Bestätigung des Zugangs (persönlicher Registrierungslink, Double-Opt-in)',
    'Vor dem Versand: Vorschau der Mail und Anzeige der Empfängerzahl; Widersprüche werden immer ausgeschlossen',
    'Betreff und Einleitungstext liegen als editierbare Mailvorlagen im Admin (newsletter_mandate, newsletter_reregister)',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
