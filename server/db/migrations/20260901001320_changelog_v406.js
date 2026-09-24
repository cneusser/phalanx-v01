/** Changelog v0.406 (Pool-Sync las nichts, obwohl die Verbindung stand). */
const ENTRY = {
  version: 'v0.406', released_on: '2026-09-24',
  title: 'Pool-Sync las nichts, obwohl die Verbindung stand',
  items: [
    'Phalanx OS liefert die Kontakte im Feld „items". Genau dieses Feld wurde nicht gelesen, deshalb meldete jeder Lauf „gelesen 0" bei tadelloser Verbindung',
    'Neuer Knopf „Vollabgleich": liest den ganzen Pool statt nur das seit dem letzten Lauf Geänderte. Nötig, weil ein Lauf mit null Kontakten den Zeitstempel trotzdem gesetzt hat',
    '„Verbindung prüfen" zeigt jetzt zuerst, wie viele Kontakte der Pool insgesamt hat. Steht dort eine Zahl und bei jedem Segment eine Null, dann stimmen die Segmentnamen nicht, nicht die Rechte',
    'Erwartet werden Tag-Namen wie „LI:Investor/Kapital", keine Nummern. Darauf weist die Prüfung im Klartext hin',
    'Die Segmentnamen kommen jetzt aus dem Pool selbst: mit Anzahl aufgelistet, die drei größten als fertiger Vorschlag für PHALANX_SYNC_TAGS',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
