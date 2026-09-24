/** Changelog v0.404 (Eine Datenraum-Struktur für alle Mandate). */
const ENTRY = {
  version: 'v0.404', released_on: '2026-08-08',
  title: 'Eine Datenraum-Struktur für alle Mandate',
  items: [
    'Sieben Bereiche auf der ersten Ebene, darunter je drei bis fünf Unterordner. Tiefer als zwei Ebenen wird es nicht mehr',
    'Der Knopf „Einheitliche Struktur" zeigt erst eine Vorschau und baut erst auf Bestätigung um',
    'Dateien werden nach ihrem Namen einsortiert; was sich nicht sicher zuordnen lässt, bleibt liegen und wird aufgelistet',
    'Eine Verzeichnisliste aus einem anderen Datenraum lässt sich einfügen, die Zuordnung steht daneben',
    'Leere Altordner wandern in den Papierkorb, nichts mit Inhalt wird gelöscht',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
