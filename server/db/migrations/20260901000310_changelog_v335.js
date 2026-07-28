/** Changelog v0.335 (Bezahl-Freischaltung der Nachfolge-Kandidaten). */
const ENTRY = {
  version: 'v0.335', released_on: '2026-07-21',
  title: 'Bezahl-Freischaltung für Übergeber',
  items: [
    'Der Übergeber kann die Nachfolge-Kandidaten jetzt selbst gegen Gebühr freischalten, sofern die Bezahlung aktiviert ist. Der Preis wird direkt am Knopf angezeigt',
    'Abgewickelt über das vorhandene Payment-Interface (Stub, austauschbar gegen einen echten Anbieter). Jede Freischaltung wird als Abrechnungsereignis protokolliert, doppelbuchungssicher',
    'Ist die Bezahlung nicht aktiv, bleibt es beim bisherigen Weg: das Team schaltet ohne Zahlung frei, der Übergeber sieht einen Hinweis auf seinen Ansprechpartner',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
