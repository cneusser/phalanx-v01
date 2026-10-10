/** Changelog v0.457 (Eine gescheiterte Suche ist kein Befund). */
const ENTRY = {
  version: 'v0.457', released_on: '2026-10-10',
  title: 'Eine gescheiterte Suche ist kein Befund',
  items: [
    'Die Zugriffsprüfung meldete "kein Nutzerkonto", die Erinnerung im selben Kasten meldete "es besteht bereits ein Konto". Beide konnten nicht recht haben',
    'Die Ursache: An der Kontosuche stand ein verschlucktes catch. Scheiterte die Abfrage, wurde daraus nicht eine Fehlermeldung, sondern die Aussage, diese Person habe kein Konto. Eine Panne der Plattform wurde so zu einer Behauptung über einen Menschen',
    'Jetzt wird der Fehler der Datenbank wörtlich angezeigt, in der Prüfung und in der Kontaktakte. Dort steht dann "Konto nicht feststellbar" statt "kein Plattform-Konto"',
    'Zusätzlich eine Gegenprobe: Es wird gezählt, wie viele Konten diese Adresse tragen. Weicht die Zahl vom Befund ab, sagt die Ansicht ausdrücklich, dass der Fehler bei der Plattform liegt und nicht beim Kontakt',
    'Beim Abgleich von Adressen werden führende und folgende Leerzeichen abgeschnitten. Ein Leerzeichen am Ende der CRM-Adresse hatte sonst zur Folge, dass eine Stelle ein Konto fand und die andere nicht',
    'Die Konfliktmeldung der Erinnerung nennt jetzt die Kontonummer, damit sich ein solcher Widerspruch ohne Blick in die Datenbank auflösen lässt',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
