/** Changelog v0.498 (Nachbesserung zu v0.497). */
const ENTRY = {
  version: 'v0.498', released_on: '2026-11-24',
  title: 'Die Anmeldung wartet nicht mehr auf einen Test, den es gar nicht gibt',
  items: [
    'Mit v0.497 wartet das Anmeldeformular auf den Roboter-Test, bevor es abschickt. Das war richtig, hatte aber einen Fall nicht bedacht: Ist überhaupt kein Test eingerichtet, blieb der Zustand auf „lädt", und die Anmeldung dauerte zehn Sekunden, bevor sie durchging',
    'Aufgefallen ist das erst im Browser auf der Teststufe, nicht in den Prüfungen. Die messen die Mechanik, nicht die Wartezeit eines Menschen vor dem Bildschirm',
    'Jetzt meldet der Test ausdrücklich „nicht eingerichtet", und das Formular schickt sofort. Die Prüfung achtet ab jetzt auch auf diesen Fall',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
