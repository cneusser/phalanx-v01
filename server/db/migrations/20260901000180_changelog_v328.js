/** Changelog v0.328 (Nachfolge: Benachrichtigung bei neuen Treffern). */
const ENTRY = {
  version: 'v0.328', released_on: '2026-07-21',
  title: 'Nachfolge: Benachrichtigung bei passenden Mandaten',
  items: [
    'Wird ein neues Nachfolge-Mandat veröffentlicht, erhalten passende Nachfolge-Interessierte automatisch eine Hinweis-Mail mit der Begründung (Branche, Region, Umsatz)',
    'Benachrichtigt wird nur bei einem starken Treffer (mindestens Branche oder Region), und nur, wer solche Hinweise nicht abbestellt hat',
    'Die Match-Mail hat Vorrang vor der allgemeinen Newsletter-Mail, es gibt keine Doppelbenachrichtigung',
    'Die Bewertungslogik liegt jetzt zentral an einer Stelle, damit Profilansicht und Benachrichtigung identisch bewerten',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
