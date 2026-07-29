/** Changelog v0.342 (Safe-Datenraum-Freigaben: Fundament). */
const ENTRY = {
  version: 'v0.342', released_on: '2026-07-21',
  title: 'Safe-Datenraum-Freigaben: Fundament',
  items: [
    'Grundlage für Freigaben direkt im Safe (Drooms-Modell): je Datei oder Ordner an Einzelpersonen, Käufergruppen, alle Beteiligten eines Mandats oder eigene Gruppen, jeweils nur Ansicht oder Download',
    'Neues Datenmodell (safe_grants, safe_groups, safe_group_members) mit Mandantentrennung, plus die getestete Zugriffs-Auflösung mit Ordner-Vererbung',
    'Verwaltungs-Endpunkte für Freigaben und eigene Gruppen sind angelegt. Die Oberfläche und der Investoren-Datenraum folgen als nächste Etappen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
