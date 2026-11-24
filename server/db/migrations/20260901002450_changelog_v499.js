/** Changelog v0.499 (Nutzerkonto und CRM finden zueinander). */
const ENTRY = {
  version: 'v0.499', released_on: '2026-11-24',
  title: 'Der Klick auf einen Nutzernamen öffnet den Kontakt, und Konten ohne Kontakt sind auffindbar',
  items: [
    'In der Nutzerliste der Verwaltung tat ein Klick auf den Namen nichts. Dahinter steckten zwei Fehler: Die Oberfläche las die falsche Kennung aus der Antwort, und die Übernahme scheiterte ohnehin am Server, weil sie in eine Spalte schreiben wollte, die es im CRM nicht gibt. Sichtbar war davon nichts, nicht einmal eine Fehlermeldung',
    'Beides ist behoben. Das Unternehmen aus dem Konto wird dabei richtig abgelegt, nämlich als Verknüpfung zu einem Unternehmen statt als Textfeld am Kontakt, und ein bestehendes Unternehmen wird wiederverwendet statt doppelt angelegt',
    'Wer sich selbst registriert, wird ein Nutzerkonto und kein CRM-Kontakt. Das ist richtig so, denn ein Kontakt trägt Einwilligung, Herkunft und Ansprachehistorie. Unsichtbar war es trotzdem: Man suchte jemanden im CRM und fand nichts',
    'Das CRM zeigt jetzt unter den Kontakten die Nutzerkonten, zu denen noch kein Kontakt gehört, und bietet die Übernahme an. Angelegt wird nur auf Klick, niemand landet ungefragt im CRM',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
