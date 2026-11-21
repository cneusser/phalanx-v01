/** Changelog v0.485 (waehrend des Starts antworten statt schweigen). */
const ENTRY = {
  version: 'v0.485', released_on: '2026-11-21',
  title: 'Die Plattform antwortet schon, während sie startet',
  items: [
    'Der erste Start der Teststufe hing minutenlang, und von aussen kam nur „Application failed to respond", der Fehler 502. Die Ursache lag in der Reihenfolge: Bisher wurde erst die Datenbank vorbereitet und erst danach der Port geöffnet. Auf einer leeren Datenbank bedeutet das über 300 Migrationen und den Startseed, bevor überhaupt jemand lauscht',
    'Das betrifft nicht nur das Einrichten. Jede Überwachung hält einen Dienst, der nicht antwortet, für tot und startet ihn neu, mitten im Lauf. Der nächste Versuch beginnt wieder von vorn, und bei einer langen Migration kann das endlos so weitergehen',
    'Jetzt ist es umgekehrt: Der Port steht sofort offen. Während die Datenbank vorbereitet wird, antwortet die Plattform mit einer Seite, die sagt, was gerade passiert, und lädt sich alle zehn Sekunden selbst neu. Die Schnittstelle antwortet in derselben Zeit mit einer lesbaren Begründung statt mit Schweigen',
    'Der Dienstzustand meldet dabei „startet" und bleibt erreichbar, damit die Überwachung den Dienst als lebendig erkennt und ihn in Ruhe arbeiten lässt',
    'Scheitert die Vorbereitung wirklich, bleibt der Port noch fünf Sekunden offen und zeigt die Begründung, bevor sich die Anwendung beendet. So steht die Ursache auf dem Bildschirm und nicht nur im Protokoll',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
