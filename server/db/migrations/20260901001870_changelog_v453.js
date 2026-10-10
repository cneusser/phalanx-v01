/** Changelog v0.453 (Kontakt zum Mandat: suchen statt wählen). */
const ENTRY = {
  version: 'v0.453', released_on: '2026-10-10',
  title: 'Kontakt zum Mandat: suchen statt wählen',
  items: [
    'Im Deal-Funnel war "Kontakt zum Mandat hinzufügen" ein Auswahlfeld über alle Kontakte. Bei einigen hundert Einträgen findet man den richtigen nicht',
    'Jetzt ein Suchfeld: ab drei Zeichen erscheinen die Treffer mit Name, Firma und Adresse. Wer schon im Mandat ist, steht als solcher dabei und lässt sich nicht doppelt hinzufügen',
    'Beim Nachsehen kam ein zweites, ernsteres Problem heraus, nach dem niemand gefragt hatte: Die Liste war serverseitig auf 500 Kontakte begrenzt. Wer darüber hinaus suchte, sah den Kontakt nicht und musste annehmen, es gebe ihn nicht',
    'Gesucht wird deshalb auf dem Server, mit derselben wortweisen Suche wie im CRM. "Bauer Daniel" findet dasselbe wie "Daniel Bauer", und bei zu vielen Treffern fordert die Liste zum Eingrenzen auf, statt stillschweigend abzuschneiden',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
