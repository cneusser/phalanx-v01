/** Changelog v0.333 (Kandidat-zu-Mandat-Verknüpfung + Marktplatz-Layoutfix). */
const ENTRY = {
  version: 'v0.333', released_on: '2026-07-21',
  title: 'Kandidat zu Mandat verknüpfen, Marktplatz-Layout',
  items: [
    'Im Nachfolge-Funnel lässt sich je Kandidat festhalten, welchem Mandat (Übergeber) er zugeordnet ist, mit eigenem Status je Zuordnung: vorgeschlagen, vorgestellt, Übergeber interessiert, im Gespräch, abgesagt, vermittelt',
    'Jede Zuordnung hat eine eigene Notiz. Die Karte zeigt die Anzahl der Zuordnungen, ein Klick öffnet die Verwaltung',
    'Marktplatz: In der Listen- und Tabellenansicht sprengte der Inhalt bei schmaler Spalte das Layout. Das ist behoben, die Tabelle scrollt jetzt sauber innerhalb ihrer Spalte',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
