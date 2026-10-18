/** Changelog v0.461 (Anbindung an Phalanx OS pruefen). */
const ENTRY = {
  version: 'v0.461', released_on: '2026-10-18',
  title: 'Anbindung an Phalanx OS prüfen',
  items: [
    'In der Verwaltung gibt es unter der Korrespondenz-Zeile einen Knopf, der je einen Abruf mit limit=1 gegen beide Endpunkte macht und Statuscode, Antwortzeit und Feldnamen meldet',
    'Gemeldet werden ausdrücklich keine Inhalte: keine Betreffzeilen, keine Texte, auch nicht gekürzt. Eine Prüfmeldung landet in Protokollen und in Bildschirmfotos, und Korrespondenz aus einem laufenden Verkaufsprozess hat dort nichts zu suchen',
    'Die Probe zeigt, welche erwarteten Felder die Gegenstelle nicht liefert und welche sie zusätzlich schickt. Genau daran scheitert eine Anbindung sonst still: Die Ansicht zeigt Lücken, und niemand weiss, warum',
    'Der Abruf geht am Zwischenspeicher vorbei, sonst prüfte man den Speicher statt die Leitung',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
