/** Changelog v0.502 (zwei Nachtraege aus der Pruefung auf der Teststufe). */
const ENTRY = {
  version: 'v0.502', released_on: '2026-11-24',
  title: 'Das Zurücksetzen räumt auch im CRM auf, und die Bindung der Assistenz steht schwarz auf weiss',
  items: [
    'Wurde ein Demokonto einmal als Kontakt ins CRM übernommen, blieb dieser Kontakt beim Zurücksetzen der Demowelt stehen. Beim nächsten Durchgang galt dieselbe Person dann als „schon im CRM", und genau der Weg, den man prüfen wollte, war nicht mehr begehbar. Das Zurücksetzen nimmt die Kontakte jetzt mit und sagt, wie viele es waren',
    'Mit v0.495 ist nicht nur die Beratung an ihre Mandate gebunden, sondern jede Rolle ausser Verwaltung und Eigentümer, also auch die Assistenz. Das ist so gewollt, stand aber nirgends: Die Änderungsliste zu v0.495 las sich, als pflege die Assistenz weiterhin alles',
    'Zur Klarstellung: Die Assistenz pflegt die Mandate, denen sie zugeordnet ist, und veröffentlicht nie. Ohne Zuordnung kommt dieselbe Meldung wie bei der Beratung. Die Prüfung hält jetzt beide Fälle fest',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
