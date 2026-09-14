/** Changelog v0.386 (Cavendish WebExposé befuellt und veroeffentlicht). */
const ENTRY = {
  version: 'v0.386', released_on: '2026-07-22',
  title: 'Cavendish: WebExposé befüllt und veröffentlicht',
  items: [
    'Das WebExposé für Cavendish ist mit Eckdaten (DUB-Raster) und allen inhaltlichen Sektionen gefüllt (Unternehmen, Geschäftsmodell, Markt, Organisation, Finanzen, Stärken, Investorenprofil, Prozess)',
    'Inhalte aus IM und Teaser abgeleitet; Gründername bleibt anonymisiert; Status auf veröffentlicht (sichtbar für Käufer nach unterzeichnetem NDA)',
    'Feinschliff jederzeit im Exposé-Editor des Mandats möglich',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
