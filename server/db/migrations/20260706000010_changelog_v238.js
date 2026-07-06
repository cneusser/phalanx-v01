/** Changelog-Eintrag v0.238 (Mobile-First / responsives Layout). */
const ENTRY = {
  version: 'v0.238', released_on: '2026-07-06',
  title: 'Mobile-First: responsive Darstellung auf Smartphone & Tablet',
  items: [
    'Navigation mit Hamburger-Menü auf kleinen Bildschirmen',
    'Mehrspaltige Layouts (Marktplatz, Nachrichten, Bewertung, Admin) stapeln sich auf dem Handy',
    'Breite Tabellen sind auf dem Handy horizontal scrollbar statt abgeschnitten',
    'Filter-Seitenleiste im Marktplatz auf Mobil optimiert',
    'Kein horizontales Verrutschen mehr, touch-freundliche Bedienelemente',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
