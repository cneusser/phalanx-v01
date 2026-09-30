/** Changelog v0.438 (Die offenen Fragen sind auffindbar). */
const ENTRY = {
  version: 'v0.438', released_on: '2026-09-30',
  title: 'Die offenen Fragen sind auffindbar',
  items: [
    'Die offenen Q&A-Fragen aus der Vorversion erschienen nur in dem Gespräch, das gerade geöffnet war. Wer nicht wusste, wer gefragt hat, fand sie also nicht. In der Liste der Konversationen steht jetzt ein Kennzeichen, in welchem Gespräch etwas wartet',
    'Der Knopf zum Verweisen auf ein Dokument erschien nur, wenn in dem Gespräch schon einmal eine Nachricht zu einem Mandat gelaufen war. In den meisten Gesprächen gibt es die nicht, und dann fehlte der Knopf ganz. Er steht jetzt immer bereit, und ohne Mandatsbezug wird zuerst das Mandat gewählt',
    'Eine Funktion, die man nur findet, wenn man schon weiß wo, ist keine',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
