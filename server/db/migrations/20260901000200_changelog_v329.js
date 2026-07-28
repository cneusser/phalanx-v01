/** Changelog v0.329 (Übergeber-Sicht: Nachfolge-Kandidaten mit Freischaltung). */
const ENTRY = {
  version: 'v0.329', released_on: '2026-07-21',
  title: 'Übergeber sehen passende Nachfolge-Kandidaten',
  items: [
    'Auf der Mandatsseite sehen Pfleger eines Nachfolge-Mandats jetzt die passenden Nachfolge-Kandidaten aus dem Netzwerk, mit Übereinstimmung in Prozent und Begründung (Branche, Region, Umsatz)',
    'Datenschutz: Ohne Freischaltung nur Anzahl und anonyme Vorschau (kein Name). Nach Freischaltung erscheinen Name, Kontakt, Eigenkapital und Verfügbarkeit',
    'Die Freischaltung setzt das Team (spätere Bezahlstufe für Übergeber). Ein Knopf schaltet je Mandat frei oder sperrt wieder',
    'Nur Pfleger des jeweiligen Mandats sehen die Kandidaten, alles serverseitig geprüft',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
