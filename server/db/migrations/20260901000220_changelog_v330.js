/** Changelog v0.330 (Strukturierte Umsatzklasse am Mandat). */
const ENTRY = {
  version: 'v0.330', released_on: '2026-07-21',
  title: 'Umsatz beidseitig als Auswahl',
  items: [
    'Das Mandat hat jetzt eine strukturierte Umsatzklasse (dieselben Bänder wie das Nachfolge-Profil): unter 1, 1 bis 3, 3 bis 10, 10 bis 30, über 30 Mio. Euro',
    'Wählbar im Bearbeiten-Dialog (Admin und Marktplatz). Die bisherige Freitext-Anzeige des Umsatzbands bleibt erhalten',
    'Das Nachfolge-Matching vergleicht den Umsatz nun exakt Klasse gegen Klasse. Fehlt die Klasse, wird wie bisher aus dem Freitext gelesen',
    'Bestehende Mandate wurden aus ihrem Umsatzband automatisch klassifiziert',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
