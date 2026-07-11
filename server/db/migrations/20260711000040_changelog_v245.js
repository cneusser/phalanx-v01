/** Changelog-Eintrag v0.245 (Exposé-PDF: dynamisches Layout). */
const ENTRY = {
  version: 'v0.245', released_on: '2026-07-11',
  title: 'Exposé-PDF: dynamisches Layout, keine Überlappungen mehr',
  items: [
    'Eckdaten-Raster wird dynamisch berechnet: Zeilenhöhe passt sich dem Inhalt an',
    'Lange Werte brechen sauber um, statt in die nächste Zeile zu laufen',
    'Überschriften stehen nie mehr allein am Seitenende; Vertraulichkeitshinweis wird sauber platziert',
    'Typografie: Zahl und Einheit (z. B. „60 %", „€ 3,46 Mio.") werden nicht mehr getrennt',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
