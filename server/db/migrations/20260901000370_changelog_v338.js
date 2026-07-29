/** Changelog v0.338 (Datensafe: feingranulare Zugriffsstruktur je Dokument). */
const ENTRY = {
  version: 'v0.338', released_on: '2026-07-21',
  title: 'Datensafe: Zugriff je Empfänger und Dokument',
  items: [
    'Ein Dokument im Datenraum kann jetzt beschränkt werden: dann sehen es nur ausdrücklich freigegebene Empfänger',
    'Je Empfänger lässt sich zwischen nur Ansicht und Download unterscheiden. Eine reine Ansichts-Freigabe zeigt das Dokument, erlaubt aber keinen Download',
    'Serverseitig durchgesetzt für Liste, Download, Vorschau und ablaufende Links, nicht über die Oberfläche umgehbar',
    'Rückwärtskompatibel: ohne Beschränkung bleibt der bisherige Datenraum-Zugang unverändert',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
