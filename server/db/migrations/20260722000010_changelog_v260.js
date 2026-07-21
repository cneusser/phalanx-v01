/** Changelog-Eintrag v0.260 (Mail-Ausgang zeigt Mails, Feedback löschbar). */
const ENTRY = {
  version: 'v0.260', released_on: '2026-07-21',
  title: 'Mail-Ausgang zeigt die Mails: Feedback löschbar',
  items: [
    'Fehler behoben: Der Mail-Ausgang zählte Mails, zeigte aber keine, die Abfrage scheiterte still an einem Typproblem',
    'Feedback-Einträge lassen sich jetzt löschen (Feedback und Q&A sind zwei getrennte Bereiche)',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
