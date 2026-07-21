/** Changelog v0.293 (Stufe C DUB-Benchmark: Zielsteuerung, Namensnennung, Plattform-NDA). */
const ENTRY = {
  version: 'v0.293', released_on: '2026-07-21',
  title: 'Käufergruppen, Namensnennung und Plattform-NDA',
  items: [
    'Zielsteuerung je Inserat: Käufergruppen (strategisch, Finanzinvestor, Privat, M&A-Berater) und Schlagwörter, damit das richtige Publikum matcht',
    'Namensnennung als eigener, protokollierter Schritt: der Klarname wird je Interessent bewusst freigegeben, vorher bleibt alles anonym',
    'Plattform-NDA als Käufer-Gütesiegel: einmal gezeichnet, sichtbar als Badge am Kontakt und im Funnel',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
