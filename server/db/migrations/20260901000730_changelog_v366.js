/** Changelog v0.366 (Feingranulare Datenraum-Freigabe: Personen, Käufergruppen, Beteiligte, eigene Gruppen). */
const ENTRY = {
  version: 'v0.366', released_on: '2026-07-21',
  title: 'Feingranulare Datenraum-Freigabe je Dokument',
  items: [
    'Dokumente lassen sich jetzt gezielt freigeben: an einzelne Personen, an eine Käufergruppe (z. B. Strategen, Family Offices), an alle Beteiligten eines Mandats oder an eigene Gruppen, jeweils als Ansicht oder Download',
    'Eigene Gruppen (z. B. Bieterkonsortien) lassen sich im Freigabe-Fenster anlegen und mit Mitgliedern pflegen',
    'Die Durchsetzung greift im ganzen Datenraum: Liste, Suche, Vorschau und Download prüfen die höchste zutreffende Freigabe des Nutzers',
    'Bestehende Einzel-Freigaben bleiben unverändert gültig (als Personen-Freigabe migriert)',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
