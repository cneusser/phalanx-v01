/** Changelog v0.496 (Mandantentrennung im Datenzugriff). */
const ENTRY = {
  version: 'v0.496', released_on: '2026-11-23',
  title: 'Der Mandant wird mitgeführt, statt an jeder Abfrage wiederholt zu werden',
  items: [
    'Wer in einem anderen Mandanten arbeiten wollte, musste das bisher an jeder einzelnen Abfrage sagen. Sechs Dateien taten das, zehn nicht; allein die Verwaltung und die Unterlagen sprachen an 231 Stellen daran vorbei. Solange es einen Mandanten gibt, fällt das nicht auf. Beim zweiten fände Lesen nichts und Schreiben landete beim falschen',
    'Jetzt trägt die Anfrage ihren Mandanten mit sich, und der Datenzugriff nimmt ihn von dort. Eine Route kann ihn damit nicht mehr vergessen. 231 Aufrufe einzeln anzufassen wäre die Art Änderung, bei der einer übersehen wird',
    'Auch die Vorbelegung der Spalte richtet sich jetzt nach dem Mandanten der Sitzung statt fest nach der Eins. Eine Einfügung ohne ausdrückliche Angabe landet damit dort, wo sie auch wieder gelesen werden darf, in 67 Tabellen',
    'Für den Plattformmandanten ändert sich nichts. Er läuft weiter über die Standardverbindung, ohne Transaktion, und die Prüfung hält genau das fest',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
