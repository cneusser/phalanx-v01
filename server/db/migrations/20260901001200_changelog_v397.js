/** Changelog v0.397 (Interessent je Mandat stummschalten). */
const ENTRY = {
  version: 'v0.397', released_on: '2026-08-02',
  title: 'Interessent je Mandat stummschalten',
  items: [
    'Bittet jemand darum, zu einem bestimmten Mandat keine Hinweise mehr zu bekommen, genügt in der NDA-Liste ein Klick auf „Stummschalten"',
    'Der Zugang bleibt dabei vollständig bestehen: Unterlagen, Datenraum und Q&A stehen weiter offen, es gehen nur keine Benachrichtigungen mehr an diese Person hinaus',
    'Die Stummschaltung wirkt auf alle Wege: Hinweise auf neue Unterlagen ebenso wie Mandats-Updates an Folgende',
    'Bereits eingereihte, noch nicht versendete Sammelmeldungen werden beim Stummschalten mit abgeräumt',
    'Jederzeit mit einem weiteren Klick wieder einschaltbar',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
