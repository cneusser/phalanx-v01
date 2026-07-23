/** Changelog v0.317 ("NDA liegt vor" im Funnel schaltet das IM frei). */
const ENTRY = {
  version: 'v0.317', released_on: '2026-07-21',
  title: 'NDA im Funnel schaltet das IM frei',
  items: [
    'Bisher blieb das IM gesperrt, obwohl im Funnel „NDA liegt vor" gesetzt war: Die CRM-Angabe war nicht mit dem Plattform-Zugang des Interessenten verbunden',
    'Jetzt schaltet „NDA liegt vor" bei einer Deal-Partei mit verknüpftem Konto das IM automatisch frei, und der Interessent erscheint in den Plattform-Ansichten',
    'Wird der NDA zurückgenommen, greift die Sperre wieder, ohne einen bereits erteilten Datenraum- oder LOI-Zugang anzutasten',
    'Eine weiter fortgeschrittene Stufe wird nie zurückgestuft',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
