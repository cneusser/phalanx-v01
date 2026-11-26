/** Changelog v0.508 (der Unterzeichner bekommt seine Urkunde jetzt wirklich). */
const ENTRY = {
  version: 'v0.508', released_on: '2026-11-26',
  title: 'Die unterzeichnete Vereinbarung lag der Mail an den Unterzeichner nicht bei',
  items: [
    'Seit v0.489 steht im Changelog, das unterzeichnete Dokument gehe an beide Seiten. Das stimmte nur für die Beratung. Die Mail an den Unterzeichner läuft über eine andere Funktion, und die nahm den Anhang gar nicht erst entgegen: Die Eigenschaft fehlte in der Parameterliste und fiel damit stillschweigend weg. Die Mail kam an, nur ohne das PDF',
    'Betroffen waren beide Wege, die Unterschrift und „Erneut senden". Wer online unterzeichnet hat, bekommt seine Urkunde ab jetzt als Anhang, genau wie die Beratung',
    'Eine Prüfung hält die Stelle offen: Keine Mailfunktion darf künftig einen Anhang annehmen, ohne ihn weiterzugeben',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
