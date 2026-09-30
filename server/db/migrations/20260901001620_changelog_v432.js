/** Changelog v0.432 (Uploads hinterlassen eine Spur, Deploys kommen an). */
const ENTRY = {
  version: 'v0.432', released_on: '2026-09-30',
  title: 'Uploads hinterlassen eine Spur, Deploys kommen an',
  items: [
    'Nach dem dritten erfolglosen Anlauf habe ich die Laufzeitprotokolle gelesen und darin nichts über den Upload gefunden. Nicht weil nichts passiert wäre, sondern weil dieser Server Anfragen überhaupt nicht protokolliert hat',
    'Jeder Upload hinterlässt jetzt eine Spur: wann er ankam, wie groß er war, wie er endete, wie lange er dauerte. Bricht er ab, steht dort auch, wie viele Bytes bis dahin angekommen waren. Damit ist unterscheidbar, ob die Anfrage früh stirbt, spät stirbt oder den Server nie erreicht',
    'Dateinamen stehen bewusst nicht im Protokoll. In einem anonymen Verkaufsprozess ist ein Dateiname schon eine Auskunft',
    'Die Seite selbst kommt nie mehr aus dem Zwischenspeicher des Browsers. Bisher war nach einem Deploy nicht zu unterscheiden, ob eine Korrektur nicht wirkt oder ob der Browser noch den alten Stand ausführt',
    'Das Startprotokoll nannte fest verdrahtet "v0.2.0" statt der laufenden Fassung. Ein Protokoll mit falscher Versionsangabe führt bei der Fehlersuche in die Irre',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
