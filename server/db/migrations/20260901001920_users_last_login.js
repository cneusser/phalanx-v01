/**
 * users.last_login nachtragen (v0.458).
 *
 * Die Spalte wurde an vier Stellen abgefragt und war nie angelegt worden. Kein
 * einziger Wanderungsschritt erzeugt sie, und trotzdem steht sie seit Langem in
 * den Abfragen. Postgres antwortet darauf mit „column last_login does not
 * exist", und weil an diesen Stellen ein catch stand, wurde daraus:
 *
 *   · in der Kontaktakte: „kein Plattform-Konto" (falsch, das Konto gibt es)
 *   · in der Ansicht „Ansicht prüfen": eine leere Personenliste
 *   · im Konten-Bericht: eine leere Spalte
 *
 * Drei verschiedene Symptome, eine Ursache. Aufgefallen ist sie erst, als zwei
 * Ansichten nebeneinander Gegenteiliges behaupteten.
 *
 * Die Spalte wird angelegt statt aus den Abfragen entfernt: Wann jemand zuletzt
 * da war, ist die Angabe, nach der man einen Interessenten als Erstes beurteilt.
 *
 * Ein Anfangswert lässt sich aus dem Protokoll gewinnen: Jede Anmeldung steht
 * als LOGIN in audit_logs. Das ist genauer als leere Felder und ehrlicher als
 * ein erfundenes Datum.
 */
exports.up = async function (knex) {
  const hat = await knex.schema.hasColumn('users', 'last_login').catch(() => false);
  if (!hat) {
    await knex.schema.alterTable('users', (t) => { t.timestamp('last_login', { useTz: true }); });
  }
  // Rückwirkend aus dem Anmeldeprotokoll füllen, soweit vorhanden.
  await knex.raw(`
    UPDATE users u SET last_login = s.letzte
      FROM (SELECT user_id, MAX(created_at) AS letzte FROM audit_logs
             WHERE action = 'LOGIN' AND user_id IS NOT NULL GROUP BY user_id) s
     WHERE s.user_id = u.id AND u.last_login IS NULL`).catch(() => {});
};

exports.down = async function (knex) {
  const hat = await knex.schema.hasColumn('users', 'last_login').catch(() => false);
  if (hat) await knex.schema.alterTable('users', (t) => { t.dropColumn('last_login'); });
};
