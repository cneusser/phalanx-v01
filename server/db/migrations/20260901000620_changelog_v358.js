/** Changelog v0.358 (Zwei-Wege-Mail: Konversationsansicht je Kontakt). */
const ENTRY = {
  version: 'v0.358', released_on: '2026-07-21',
  title: 'CRM: Zwei-Wege-Mail-Konversation je Kontakt',
  items: [
    'Neuer Tab „Konversation" im Kontakt: ausgehende Nachrichten und eingegangene Antworten als Verlauf mit Sprechblasen (gesendet rechts, eingegangen links), inklusive Betreff, Text, Mandat und Zeit',
    'Inline-Antwort direkt aus der Konversation, der Betreff wird als „AW: …" vorbelegt',
    'Ausgehende Mails werden jetzt in den Thread geschrieben, sowohl freie Nachrichten als auch Prozess-Mails. Die Aktivitäts-Timeline vermeidet dabei Doppelungen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
