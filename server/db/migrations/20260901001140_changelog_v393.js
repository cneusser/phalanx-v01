/** Changelog v0.393 (Einzelfreigaben und Speicher-Umzug). */
const ENTRY = {
  version: 'v0.393', released_on: '2026-07-29',
  title: 'Einzelfreigaben für Clean Team und Umzug auf Cloudflare',
  items: [
    'Neuer Dialog „Freigaben" je Ordner und Datei: Sie geben vertrauliche Bereiche gezielt frei, an eine einzelne Person, einen Käufertyp, eine Gruppe oder alle Beteiligten, wahlweise nur zum Ansehen oder mit Download',
    'Bestehende Freigaben sind auf einen Blick sichtbar und lassen sich einzeln wieder entziehen',
    'Speicher-Umzug auf Cloudflare R2 per Knopfdruck: kopiert die Dateien eines Mandats in Stapeln, prüft jede Datei per Gegenprobe und löscht nichts',
    'Während des Umzugs greift beim Lesen ein Rückfall auf den bisherigen Speicher, damit kein Abruf ins Leere läuft',
    'Behoben: Die Freigabe „alle Beteiligten" legte sich bei jedem Speichern erneut an, statt aktualisiert zu werden',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
