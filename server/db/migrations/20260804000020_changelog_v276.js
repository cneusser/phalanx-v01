/** Changelog v0.276 (Herkunft als Admin-Kachel, dezenter im Funnel). */
const ENTRY = {
  version: 'v0.276', released_on: '2026-07-21',
  title: 'Herkunft der Kontakte als Admin-Kachel',
  items: [
    'Neue Kachel „Herkunft der Kontakte" in der Admin-Übersicht: je Plattform Quelle, Anzahl und letzter Eingang',
    'Die auffällige Plattform-Leiste über dem Deal-Funnel ist entfernt; die dezente Markierung an der Karte bleibt',
    'Erinnerung: versendete Mails liegen im Admin unter „Mail-Ausgang" (Klick zeigt das Original)',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
