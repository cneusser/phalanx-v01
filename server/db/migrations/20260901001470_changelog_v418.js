/** Changelog v0.418 (Die Berichte sind jetzt ein Klick). */
const ENTRY = {
  version: 'v0.418', released_on: '2026-09-27',
  title: 'Die Berichte sind jetzt ein Klick',
  items: [
    'Suchprofil-Bericht und Datenraum-Plan stehen im Verwaltungsbereich unter "Berichte". Vorher waren sie nur über die Kommandozeile erreichbar, was eine Datenbankverbindung zum Server voraussetzt',
    'Der Datenraum-Plan zeigt je Datei den Vorschlag mit Begründung. Umsortieren und Vertraulichkeit sind zwei getrennte Knöpfe, jeder mit Rückfrage',
    'Die Stufe "offen" wird nie automatisch gesetzt. Ob ein Dokument ohne Vereinbarung sichtbar ist, entscheidet weiterhin die Freigabe im Datenraum',
    'Eine neue Prüfung vergleicht bei jedem Testlauf, ob die Oberfläche nur Adressen aufruft, die es auf dem Server auch gibt',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
