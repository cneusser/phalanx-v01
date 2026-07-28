/** Changelog v0.331 (Nachfolge im CRM mit Kandidaten-Funnel). */
const ENTRY = {
  version: 'v0.331', released_on: '2026-07-21',
  title: 'Nachfolge im CRM mit eigenem Funnel',
  items: [
    'Neuer CRM-Reiter „Nachfolge": alle Nachfolge-Interessierten an einem Ort, mit Suche und Filtern',
    'Eigener Funnel je Kandidat: neu, Profil vollständig, Mandat vorgestellt, im Gespräch, vermittelt, kein Match. Der Status ist je Person direkt setzbar',
    'Trichter-Überblick oben zeigt die Anzahl je Stufe und dient zugleich als Filter',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
