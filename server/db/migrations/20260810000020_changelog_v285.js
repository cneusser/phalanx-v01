/** Changelog v0.285 (Kontaktliste Seiten/A-Z, Rolle Prozessbeteiligter). */
const ENTRY = {
  version: 'v0.285', released_on: '2026-08-10',
  title: 'Kontaktliste mit Seiten und A-Z, Rolle Prozessbeteiligter',
  items: [
    'Kontaktliste: A-Z-Leiste oben und Seitengröße (10/25/50/Alle) mit Blättern unten',
    'Neue Beteiligten-Rolle „Prozessbeteiligter" (Steuerberater, WP, Consultant), getrennt vom Käufer-Funnel',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
