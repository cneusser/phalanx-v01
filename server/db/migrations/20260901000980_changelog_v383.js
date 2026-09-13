/** Changelog v0.383 (Cavendish aktualisiert und veröffentlicht, Fokus-Newsletter). */
const ENTRY = {
  version: 'v0.383', released_on: '2026-07-21',
  title: 'Cavendish veröffentlicht, Fokus-Newsletter',
  items: [
    'Mandat Cavendish nach Rückmeldung des Mandanten aktualisiert (11 Absichtserklärungen, Team ohne CFO, 2.700-Stunden-Test) und veröffentlicht',
    'Newsletter kann ein Mandat in den Fokus stellen und weitere Mandate anteasern; neue Option „Cavendish im Fokus" stellt Cavendish als Aufmacher voran und teasert FARADAY und CUDD an',
    'Editierbare Vorlage newsletter_cavendish im Admin',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
