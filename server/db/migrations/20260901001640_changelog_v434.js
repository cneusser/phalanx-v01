/** Changelog v0.434 (Das Protokoll nennt die Fassung des Browsers). */
const ENTRY = {
  version: 'v0.434', released_on: '2026-09-30',
  title: 'Das Protokoll nennt die Fassung des Browsers',
  items: [
    'Nach mehreren Korrekturen hintereinander war im Serverprotokoll nicht zu erkennen, welcher Stand des Browsers einen Upload geschickt hat. Damit ließ sich eine Messung nicht der Fassung zuordnen, die sie erzeugt hat, und jede Rückmeldung blieb mehrdeutig',
    'Jeder Upload nennt jetzt die Fassung, die ihn gesendet hat, und wie viele Bytes der Browser vor dem Senden tatsächlich lesen konnte',
    'Weicht die gelesene Menge von der angekündigten ab, steht das im Protokoll. Damit ist der Unterschied zwischen einer unlesbaren Datei und einem Abriss auf der Leitung direkt ablesbar',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
