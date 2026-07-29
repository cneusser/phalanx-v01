/** Changelog v0.352 (Zwei-Wege-Mail: Antwortadresse und Brevo-Inbound). */
const ENTRY = {
  version: 'v0.352', released_on: '2026-07-21',
  title: 'Zwei-Wege-Mail vorbereitet: Antwortadresse und Brevo-Inbound',
  items: [
    'Neue Einstellung INBOUND_REPLY_TO: ist sie gesetzt, gehen Antworten auf Kontakt-Mails an die überwachte Plattform-Adresse und werden automatisch dem Kontakt-Thread zugeordnet. Ohne die Einstellung bleibt alles wie bisher (Antwort geht an den Absender)',
    'Der Inbound-Endpoint versteht jetzt zusätzlich das Brevo-Format (mehrere Mails je Aufruf über „items")',
    'env-Beispiel um MAIL_FROM und INBOUND_REPLY_TO ergänzt',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
