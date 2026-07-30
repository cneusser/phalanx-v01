/** Changelog v0.357 (Volltextsuche über Dokumentinhalte im Safe und Datenraum). */
const ENTRY = {
  version: 'v0.357', released_on: '2026-07-21',
  title: 'Volltextsuche über Dokumentinhalte',
  items: [
    'Neue Volltextsuche im geschlossenen Bereich: findet nicht nur Dateinamen, sondern auch Fundstellen im Inhalt der PDFs, mit hervorgehobenem Trefferausschnitt',
    'Im Safe (nur für Pfleger) und im Käufer-Datenraum verfügbar. Im Datenraum greift dabei die Zugriffslogik: gefunden wird nur, was für den jeweiligen Nutzer freigegeben ist',
    'Der Text wird beim Hochladen und beim Übernehmen in den Datenraum automatisch extrahiert. Für ältere Dateien zieht der Button „Index aktualisieren" im Safe den Text nach',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
