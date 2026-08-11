/** Changelog v0.372 (Chat: direkte Berater-Aktionen aus der Konversation). */
const ENTRY = {
  version: 'v0.372', released_on: '2026-07-21',
  title: 'Chat: NDA freigeben und zum Mandat springen',
  items: [
    'Im internen Chat sehen Berater und Admins bei einer Konversation mit Mandatsbezug jetzt eine Aktionsleiste: „NDA freigeben und Datenraum", „Zum Mandat" und „Deal-Funnel"',
    'Ein Klick auf „NDA freigeben und Datenraum" gibt für genau diesen Kontakt und dieses Mandat die NDA frei und öffnet den Datenraum, ohne Umweg über die Admin-Liste',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
