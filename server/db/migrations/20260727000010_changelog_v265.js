/** Changelog-Eintrag v0.265 (Marktplatz-Absturz behoben). */
const ENTRY = {
  version: 'v0.265', released_on: '2026-07-27',
  title: 'Marktplatz repariert',
  items: [
    'Der Marktplatz stürzte beim Laden ab und riss die ganze Seite mit, deshalb waren auch Impressum, Datenschutz und AGB nicht erreichbar',
    'Ursache: Die Ladeanzeige nutzte die Übersetzungsfunktion, ohne sie zu kennen (fehlender Hook)',
    'Zusätzlich prüft jetzt ein Test alle Dateien darauf, dass dieser Fehler nicht wieder auftreten kann',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
