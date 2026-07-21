/** Changelog v0.311 (Kontaktauswahl im Unternehmen repariert, Firma im Kontakt sichtbar). */
const ENTRY = {
  version: 'v0.311', released_on: '2026-07-21',
  title: 'Kontaktauswahl im Unternehmen repariert',
  items: [
    'Fehler behoben: Die Auswahl „Kontakt zuordnen" im Unternehmen war leer, sobald oben eine Suche aktiv war',
    'Zuordnungslisten arbeiten jetzt immer mit dem vollständigen Bestand, unabhängig von der Suche',
    'Die Kontaktauswahl hat ein eigenes Suchfeld und zeigt zur Orientierung das Unternehmen mit an',
    'Im Kontakt steht die Unternehmenszuordnung jetzt mitten im Formular statt unterhalb des Speichern-Knopfes',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
