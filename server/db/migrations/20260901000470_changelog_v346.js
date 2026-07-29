/** Changelog v0.346 (Safe: leere Ordnerstruktur anlegen). */
const ENTRY = {
  version: 'v0.346', released_on: '2026-07-21',
  title: 'Safe: leere Ordnerstruktur anlegen',
  items: [
    'Neuer Button „Ordnerstruktur": eine ganze, auch verschachtelte und leere Ordnerstruktur lässt sich in einem Schritt anlegen (der Browser überträgt leere Ordner beim normalen Ordner-Upload nicht mit)',
    'Zwei Eingabeformate, frei mischbar: vollständige Pfade mit Schrägstrich oder eine eingerückte Baumliste',
    'Die Ordner entstehen unter dem aktuell geöffneten Ordner und werden automatisch nummeriert',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
