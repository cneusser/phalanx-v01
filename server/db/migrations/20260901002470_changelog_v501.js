/** Changelog v0.501 (die Teststufe richtet sich selbst ein). */
const ENTRY = {
  version: 'v0.501', released_on: '2026-11-24',
  title: 'Die Teststufe legt ihre Demowelt beim Start selbst an',
  items: [
    'Die Demowelt entstand bisher nur über einen Knopf im Verwaltungsbereich. Der setzt ein Konto voraus, das dort unter Umständen noch gar nicht brauchbar ist. Die Frage „Wie komme ich auf die Verwaltung, wenn ich nicht eingeloggt bin?" hatte keine gute Antwort, und sie kommt bei jedem Neuaufsetzen wieder',
    'Jetzt prüft die Plattform beim Start: Steht die Stufe auf Teststufe und gibt es dort noch kein einziges Demomandat, legt sie die Demowelt an, samt Mandaten, Interessenten und Personal. In der Produktion passiert nichts, und das Skript selbst weigert sich dort weiterhin zu laufen',
    'Wer die Demowelt bewusst geleert hat, bekommt sie nicht beim nächsten Start zurück: Es zählt, ob Demomandate vorhanden sind, nicht ob jemand den Knopf gedrückt hat',
    'Scheitert der Aufbau, startet die Plattform trotzdem. Eine Teststufe ohne Demodaten ist unbequem, eine Teststufe, die nicht hochkommt, wäre unbrauchbar',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
