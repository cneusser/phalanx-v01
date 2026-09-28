/** Changelog v0.420 (Nachrichten: Ungelesenes zuerst, der Rest eingeklappt). */
const ENTRY = {
  version: 'v0.420', released_on: '2026-09-28',
  title: 'Nachrichten: Ungelesenes zuerst, der Rest eingeklappt',
  items: [
    'Die Konversationsliste zeigt Ungelesenes oben in einem eigenen Abschnitt, darin das Neueste zuerst. Gelesenes steht darunter',
    'Die Liste ist auf zehn Einträge gekürzt, der Rest kommt auf Klick. Ungelesenes wird dabei nie abgeschnitten, auch wenn es mehr als zehn sind',
    'Neues Suchfeld über Name, Firma und letzte Nachricht. Es erscheint erst ab sechs Konversationen, vorher wäre es nur im Weg',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
