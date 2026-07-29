/** Changelog v0.344 (Safe: automatische, strukturbasierte Nummerierung). */
const ENTRY = {
  version: 'v0.344', released_on: '2026-07-21',
  title: 'Safe: automatische Nummerierung nach Ordnerstruktur',
  items: [
    'Dateien und Ordner werden jetzt automatisch nach der Ordnerstruktur nummeriert (z. B. 5.1.8). Die Nummer ergibt sich aus der Position entlang der Ordnerkette',
    'Umsortieren per Pfeil nach oben oder unten, die Nummern werden sofort neu vergeben',
    'Eine bereits im Namen enthaltene manuelle Nummer wird in der Anzeige durch die automatische ersetzt, damit nichts doppelt erscheint',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
