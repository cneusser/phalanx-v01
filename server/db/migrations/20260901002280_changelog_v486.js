/** Changelog v0.486 (Demowelt der Teststufe auf einen Knopf). */
const ENTRY = {
  version: 'v0.486', released_on: '2026-11-21',
  title: 'Die Demowelt der Teststufe lässt sich mit einem Klick zurücksetzen',
  items: [
    'Das Zurücksetzen der Teststufe braucht man nicht einmal, sondern vor jedem Testdurchgang. Über die Railway-Kommandozeile oder ein vorübergehend verändertes Start-Kommando war das jedes Mal eine kleine Bastelei',
    'Im Admin-Dashboard steht jetzt, und nur auf der Teststufe, der Knopf „Demowelt zurücksetzen". Er löscht die erfundenen Mandate und Konten und legt sie neu an, damit jeder Testdurchgang vom selben Zustand startet',
    'Drei Sicherungen, weil diese Funktion Daten löscht: Sie läuft nur, wenn die Stufe auf „teststufe" steht, nur für ein Verwaltungskonto, und sie fasst ausschliesslich an, was sie selbst angelegt hat, also Mandate mit dem Vorsatz DEMO_ und Konten auf der Domäne demo.capitalmatch.invalid',
    'Auf der Produktion erscheint der Knopf nicht, und selbst ein Aufruf von Hand wird dort abgewiesen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
