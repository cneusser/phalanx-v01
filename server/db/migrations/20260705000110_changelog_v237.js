/** Changelog-Eintrag v0.237 (E-Mail-Verifizierung, Paygate-Vorbereitung, Chat). */
const ENTRY = {
  version: 'v0.237', released_on: '2026-07-05',
  title: 'E-Mail-Bestätigung, Nachrichten & Paygate-Vorbereitung',
  items: [
    'Registrierung erst nach Bestätigung der E-Mail-Adresse abgeschlossen',
    'In-App-Nachrichten und Kontakte (Netzwerk) zwischen bestätigten Nutzern',
    'Ausführliche Bewertung: Paygate vorbereitet, kostenlos bis 31.08.2026',
    'Changelog-Historie vervollständigt',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
