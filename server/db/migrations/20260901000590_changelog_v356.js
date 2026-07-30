/** Changelog v0.356 (Admin-Kennzahl Aktivität zählt jetzt alle Ereignisse). */
const ENTRY = {
  version: 'v0.356', released_on: '2026-07-21',
  title: 'Admin: Aktivitäts-Kennzahl passt zur Liste',
  items: [
    'Die Kennzahl „Aktivität (Ereignisse im Zeitraum)" zählt jetzt alle Ereignisse: fachliche Vorgänge (wie in der Aktivitätsliste) und technische Zugriffe. Vorher wurde nur das technische Zugriffs-Log gezählt, deshalb war die Zahl niedriger als die Liste',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
