/** Changelog v0.426 (Fehlkonfiguration wird sichtbar, nicht nur protokolliert). */
const ENTRY = {
  version: 'v0.426', released_on: '2026-09-29',
  title: 'Fehlkonfiguration wird sichtbar, nicht nur protokolliert',
  items: [
    'Die Startprüfung aus v0.419 schreibt ihre Beanstandungen bisher nur ins Protokoll. Dorthin sieht man erst, wenn man schon weiß, dass etwas kaputt ist',
    'Sie stehen jetzt auch auf der Seite mit den Änderungen und in der Auskunft unter /api/version. Damit sieht man von außen, ob eine Adresse falsch eingestellt ist, ohne sich anzumelden',
    'Anlass war die Anmeldung über Phalanx OS, die seit Tagen an genau so einer Einstellung scheitert. Die Warnung stand die ganze Zeit im Protokoll',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
