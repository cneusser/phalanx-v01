/** Changelog v0.407 (Datenpflege zeigte 0 Firmen). */
const ENTRY = {
  version: 'v0.407', released_on: '2026-09-24',
  title: 'Datenpflege zeigte null Firmen, obwohl Hunderte da sind',
  items: [
    'Die Abfrage filterte auf crm_companies.is_deleted. Diese Spalte gibt es nicht: Firmen werden hart gelöscht oder zusammengeführt, Kontakte tragen anonymized_at',
    'Der Datenbankfehler wurde von einem catch verschluckt und kam als leere Liste zurück. Eine leere Liste sieht aus wie ein Ergebnis, ein Fehler nicht. Das catch ist weg, Fehler stehen jetzt im Klartext auf der Seite',
    'Die Rolle der Ansprechperson steht mal am Kontakt, mal an der Verknüpfung zur Firma. Beide Stellen werden jetzt überall gleich bewertet, sonst gilt eine Firma an einer Stelle als vollständig und an der anderen nicht',
    'Beendete Zuordnungen zählen nicht mehr als Ansprechperson',
    'Der leere Zustand sagt jetzt, was los ist: keine Unternehmen angelegt, nichts fehlt bei diesem Feld, oder alles vollständig',
    'Neuer Test prüft Spaltennamen gegen die Migrationen, ohne Datenbank',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
