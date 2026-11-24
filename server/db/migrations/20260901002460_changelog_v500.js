/** Changelog v0.500 (erfundenes Personal auf der Teststufe). */
const ENTRY = {
  version: 'v0.500', released_on: '2026-11-24',
  title: 'Die Teststufe bekommt erfundenes Personal, damit Rollen prüfbar werden',
  items: [
    'Zweimal hintereinander endete eine Prüfung an derselben Stelle: Die Rollensperren aus v0.495 und der Weg vom Nutzerkonto in das CRM aus v0.499 liessen sich auf der Teststufe nicht anfassen, weil es dort kein Konto mit interner Rolle gab. Beides musste zum Klicken weitergereicht werden, statt geprüft zu werden',
    'Die Demowelt legt jetzt vier erfundene Personalkonten an: Verwaltung, Beratung, Assistenz und Analyse, alle mit dem bekannten Demokennwort. Sie entstehen ausschliesslich auf der Teststufe; in der Produktion weigert sich das Skript zu laufen, wie bisher',
    'Die Beratung betreut dabei DEMO_NORDLICHT und DEMO_TALSOHLE ausdrücklich nicht. Damit ist die Mandatsbindung in beide Richtungen prüfbar: am eigenen Mandat geht alles, am fremden nichts',
    'Beim Zurücksetzen verschwindet das Personal mit der übrigen Demowelt. Das Testdrehbuch nennt die vier Konten jetzt mit',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
