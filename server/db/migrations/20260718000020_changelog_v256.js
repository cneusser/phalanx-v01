/** Changelog-Eintrag v0.256 (Posteingang, Wiedervorlagen, Sprachumschaltung). */
const ENTRY = {
  version: 'v0.256', released_on: '2026-07-18',
  title: 'Antworten landen im Kontakt: und nichts geht mehr unter',
  items: [
    'BCC-Ingest: Antworten von Kontakten landen automatisch in der Kontakt-Historie (Provider-Webhook), oder werden mit zwei Klicks manuell erfasst',
    'Eine eingegangene Antwort stoppt sofort alle Erinnerungen, zieht den Funnel auf „Rückmeldung" und legt eine Wiedervorlage an',
    'Wiedervorlagen mit Frist: neuer Admin-Tab mit „offen / heute fällig / überfällig", Aufgaben auch direkt am Kontakt',
    'Sprachumschaltung Deutsch / Englisch in der Kopfzeile, die Wahl bleibt gespeichert',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
