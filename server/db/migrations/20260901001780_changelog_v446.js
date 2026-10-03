/** Changelog v0.446 (Projektnummer aus Phalanx OS, Schnittstelle nach aussen). */
const ENTRY = {
  version: 'v0.446', released_on: '2026-10-03',
  title: 'Projektnummer aus Phalanx OS, Schnittstelle nach außen',
  items: [
    'Ein Mandat kann jetzt die Projektnummer aus Phalanx OS tragen. Sie wird dort vergeben, nicht hier: Zwei Systeme, die beide Nummern vergeben, vergeben irgendwann dieselbe',
    'Die Eingabe prüft Form und Kategorie. 30342 ist gültig und gehört zu Beratung; 99001 wird abgewiesen, weil es die Kategorie 99 nicht gibt. Dieselbe Nummer kann nicht an zwei Mandaten hängen',
    'Neu ist eine Schnittstelle für Phalanx OS, nur mit Schlüssel. Ohne gesetzten Schlüssel ist sie abgeschaltet, nicht offen: Eine Schnittstelle, die bei fehlender Konfiguration durchlässt, ist die gefährlichste Art von Vergesslichkeit',
    'Hinaus gehen Zahlen und Zustände: Nummer, Codename, Status, Zahl der Interessenten, unterschriebene Vereinbarungen, freigegebene Datenräume. Keine Klarnamen, kein Firmenname des Verkäufers, keine Dokumente, keine Q&A-Texte, keine Nachrichten',
    'Diese Zusage steht nicht nur im Kommentar: Jede Antwort wird vor dem Senden auf unerwartete Felder geprüft und im Zweifel zurückgehalten. Ein Kommentar wird beim nächsten ergänzten Feld gebrochen, ohne dass es jemand merkt',
    'Herein kommt nur der Projektname. Der Codename bleibt unantastbar, denn er ist die Anonymisierung gegenüber Käufern. Ein Mandat wird über diesen Weg nie angelegt und nie gelöscht',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
