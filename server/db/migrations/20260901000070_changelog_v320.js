/** Changelog v0.320 (Pflegerechte: Zuordnung im Admin, Hinweis, Automatik). */
const ENTRY = {
  version: 'v0.320', released_on: '2026-07-21',
  title: 'Pflegerechte einfacher vergeben',
  items: [
    'Im Admin-Reiter Projekte lässt sich im Bearbeiten-Dialog jetzt direkt festlegen, wer ein Mandat pflegen darf. Vorher war die Zuordnung dort nicht erreichbar',
    'Verkäufer werden automatisch als Pfleger ihres Mandats eingetragen: bei der Registrierung über eine Mandats-Einladung und wenn ihr Kontakt im Funnel als Verkäufer markiert wird',
    'Ein zugeordneter Betrachter ohne Pflegerecht sieht auf der Mandatsseite jetzt einen klaren Hinweis statt eines fehlenden Bearbeiten-Knopfes',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
