/** Changelog-Eintrag v0.264 (Rollen pflegbar, Rechtstexte, Fehlergrenze). */
const ENTRY = {
  version: 'v0.264', released_on: '2026-07-26',
  title: 'Rollen selbst zuschneiden, Rechtstexte, keine grauen Seiten mehr',
  items: [
    'Rechte werden per Häkchen vergeben und entzogen, je Rolle, mit Audit-Eintrag',
    'Eigene Rollen anlegen (z. B. Werkstudent, Externer Berater) auf Basis der bekannten Rechte',
    'Neues Recht „Alle Mandate sehen": ohne es sieht eine Rolle nur ihre eigenen Mandate',
    'Nutzungsbedingungen (AGB) und Cookie-Richtlinie neu; Datenschutz um CRM-Ansprache, Protokolle und 2FA ergänzt',
    'Ehrlicher Cookie-Hinweis statt Schein-Consent: CapitalMatch setzt kein Tracking ein',
    'Fehlergrenze: Stürzt eine Seite ab, erscheint die Fehlermeldung statt einer leeren grauen Fläche',
    'Der Client wird jetzt immer ausgeliefert, sobald ein Build vorliegt, Deep-Links und F5 funktionieren zuverlässig',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
