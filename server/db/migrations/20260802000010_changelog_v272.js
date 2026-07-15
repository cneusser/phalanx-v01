/** Changelog v0.272 (Brevo-Weiterleitung + automatische Erstansprache). */
const ENTRY = {
  version: 'v0.272', released_on: '2026-08-02',
  title: 'Anfragen weiterleiten und automatisch ansprechen',
  items: [
    'Marktplatz-Anfragen können jetzt auch per E-Mail-Weiterleitung eingelesen werden: ein Brevo-Inbound-Webhook (POST /api/inbound/lead) parst die Mail und legt den Lead an',
    'Beim Übernehmen einer Anfrage lässt sich „Direkt ansprechen" wählen: die Erstansprache (mit Einwilligung und Herkunftshinweis) geht sofort raus, samt automatischer 7/21-Tage-Reminder',
    'Für den Weiterleitungs-Weg steuert INBOUND_AUTO_OUTREACH=1, ob die Ansprache automatisch erfolgt',
    'Neue Unterlagen lösen weiterhin automatisch eine Benachrichtigung an die berechtigten, eingewilligten Interessenten aus',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
