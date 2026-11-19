/** Changelog v0.480 (Freigeben und Vereinbarung in einem Schritt). */
const ENTRY = {
  version: 'v0.480', released_on: '2026-11-19',
  title: 'Konto freigeben und Vertraulichkeitsvereinbarung in einem Schritt',
  items: [
    'Wer sich beim Anfragen eines Mandats registriert, legt zwei Dinge an: ein Konto, das freigeschaltet werden muss, und eine Anfrage nach der Vertraulichkeitsvereinbarung, die versendet werden muss. Bisher waren das zwei Knöpfe an zwei Stellen, und zwischen ihnen wartete der Interessent',
    'In der Nutzerliste steht neben dem gewöhnlichen Knopf jetzt ein zweiter: "Freigeben und NDA", mit dem Codenamen des Mandats daneben. Er erscheint nur, wenn für diesen Nutzer tatsächlich eine Anfrage offen ist',
    'Freigegeben wird dabei ausschliesslich, was den Stand "angefordert" hat. Eine bereits versendete Vereinbarung wird nicht erneut versendet, eine unterzeichnete oder zurückgewiesene gar nicht angefasst',
    'Hat der Nutzer mehrere Mandate angefragt, gehen alle offenen Anfragen auf einmal heraus, und jede wird einzeln mit Codenamen protokolliert',
    'Der Interessent bekommt eine Mail statt zwei: Steht die Vereinbarung bereit, nennt diese Mail beides, den freigeschalteten Zugang und die Unterschrift',
    'Die Regel steht jetzt an einer Stelle. Der bisherige Knopf im Mandat ruft denselben Vorgang auf, es gibt also keine zweite Fassung, die beim nächsten Mal anders entscheidet',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
