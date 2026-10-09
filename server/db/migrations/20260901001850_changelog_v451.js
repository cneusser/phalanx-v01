/** Changelog v0.451 (Weitergeleitete Mails und Dokumentverweise aus der Mail). */
const ENTRY = {
  version: 'v0.451', released_on: '2026-10-09',
  title: 'Weitergeleitete Mails und Dokumentverweise aus der Mail',
  items: [
    'Eine an die Plattform weitergeleitete Kundenmail landete bisher bei niemandem. Der Absender ist beim Weiterleiten die eigene Adresse, und die Zuordnung läuft über den Absender. Die Mail stand dann als "unbekannter Absender" im Protokoll und beim Kontakt gar nicht',
    'Jetzt wird bei einer Weiterleitung der ursprüngliche Absender aus dem Kopf gelesen, in den Formen von Outlook, Apple Mail, Gmail und Thunderbird, deutsch wie englisch',
    'Die Reihenfolge ist dabei das Entscheidende: Der echte Absender hat immer Vorrang, im Text gesucht wird erst, wenn zu ihm kein Kontakt existiert. Eine zitierte Mail kann so niemals eine direkte Antwort überschreiben, denn eine falsch zugeordnete Nachricht ist schlimmer als eine nicht zugeordnete',
    'In der Historie steht der Kunde als Absender, nicht das eigene Haus, und am Text ist vermerkt, über welche Adresse weitergeleitet wurde',
    'Ein Dokumentverweis in einer E-Mail trifft oft jemanden, der nicht angemeldet ist. Der Link führt jetzt zur Anmeldung und danach genau zum Dokument. Ohne diesen Umweg landete der Empfänger beim Teaser, fand nichts und hielt den Link für kaputt',
    'Ein Verweis bleibt dabei keine Freigabe: Wer das Dokument nicht sehen darf, bekommt es auch nach der Anmeldung nicht zu sehen, und jeder Aufruf steht im Zugriffsprotokoll',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
