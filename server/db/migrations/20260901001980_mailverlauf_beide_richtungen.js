/**
 * Mailverlauf in beide Richtungen: Antwortbezug und Eindeutigkeit (v0.462).
 *
 * Bisher kannte die Historie nur die eingehende Seite. Man sah, was ein
 * Interessent wollte, aber nicht, was ihm zugesagt wurde. Bei mehreren
 * Beratern an einem Mandat ist das der Punkt, an dem zwei Leute dasselbe
 * zweimal beantworten, und zwar verschieden.
 *
 * ── Zwei Spalten für den Antwortbezug ──────────────────────────────────────
 *
 * Die Zuordnung zum Mandat lief über den Codenamen im Betreff. Betreffzeilen
 * werden gekürzt, übersetzt und mit „Aw:" versehen; nach dem dritten Hin und
 * Her stimmt das nicht mehr. `in_reply_to` und `thread_key` erlauben die
 * einzige belastbare Zuordnung: Eine Antwort erbt das Mandat der Mail, auf
 * die sie antwortet.
 *
 * ── Eindeutigkeit in der Datenbank, nicht im Code ──────────────────────────
 *
 * Dieselbe Mail kommt leicht zweimal herein: einmal über BCC, einmal über
 * einen späteren Abgleich. Eine Prüfung im Code greift nicht, wenn zwei
 * Aufrufe gleichzeitig laufen, und genau dann passiert es. Deshalb ein
 * eindeutiger Index.
 *
 * Er gilt je Mandant, Kontakt und message_id. Nicht je message_id allein:
 * Eine Rundmail an drei Interessenten trägt dieselbe message_id und gehört
 * trotzdem in drei Akten. Zeilen ohne message_id, also die von Hand
 * erfassten, bleiben aussen vor.
 */
exports.up = async function (knex) {
  for (const [name, bauen] of [
    ['in_reply_to', (t) => t.text('in_reply_to')],
    ['thread_key', (t) => t.text('thread_key')],
  ]) {
    if (!(await knex.schema.hasColumn('crm_messages', name))) {
      await knex.schema.alterTable('crm_messages', bauen);
    }
  }
  await knex.raw('CREATE INDEX IF NOT EXISTS crm_messages_thread_idx ON crm_messages (thread_key)');

  // Vor dem eindeutigen Index aufräumen: Was schon doppelt drinsteht, würde
  // ihn sonst scheitern lassen. Gelöscht wird nur die jüngere Dublette, und
  // nur bei gleicher message_id, gleichem Kontakt und gleichem Mandanten.
  //
  // Bewusst ohne catch: Wenn dieses Aufräumen scheitert, soll man es sehen.
  await knex.raw(`
    DELETE FROM crm_messages a USING crm_messages b
     WHERE a.id > b.id
       AND a.message_id IS NOT NULL AND a.message_id <> ''
       AND a.message_id = b.message_id
       AND a.contact_id = b.contact_id
       AND a.tenant_id = b.tenant_id`);

  // ── Warum der Index scheitern darf und der Start trotzdem nicht ──────────
  //
  // Die Wanderungsschritte laufen beim Hochfahren, und ein Fehler darin
  // verhindert den Start der gesamten Plattform. Ein eindeutiger Index auf
  // Bestandsdaten ist genau die Art Schritt, die das auslösen kann: Bleibt
  // wider Erwarten eine Dublette übrig, bricht er ab, und niemand kommt mehr
  // auf die Seite.
  //
  // Das wäre die falsche Abwägung. Ohne den Index kann dieselbe Mail
  // zweimal in einer Akte stehen, und das ist ärgerlich und sichtbar und
  // nachträglich zu beheben. Eine Plattform, die nicht hochfährt, ist keines
  // davon. Deshalb wird vorher gezählt, und bei einem Rest wird der Index
  // ausgelassen und laut gemeldet statt erzwungen.
  const rest = await knex.raw(`
    SELECT COUNT(*)::int AS n FROM (
      SELECT 1 FROM crm_messages
       WHERE message_id IS NOT NULL AND message_id <> ''
       GROUP BY tenant_id, contact_id, message_id HAVING COUNT(*) > 1) s`);
  const uebrig = Number((rest.rows && rest.rows[0] && rest.rows[0].n) || 0);
  if (uebrig > 0) {
    console.warn(`⚠️  crm_messages: ${uebrig} Gruppen mit gleicher message_id bestehen weiter. `
      + 'Der eindeutige Index wird deshalb nicht angelegt. Folge: Dieselbe Mail kann zweimal '
      + 'in einer Akte stehen. Bitte die Dubletten bereinigen und die Wanderung erneut laufen lassen.');
    return;
  }
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS crm_messages_msgid_idx
      ON crm_messages (tenant_id, contact_id, message_id)
      WHERE message_id IS NOT NULL AND message_id <> ''`);
};

exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS crm_messages_msgid_idx');
  await knex.raw('DROP INDEX IF EXISTS crm_messages_thread_idx');
  for (const name of ['thread_key', 'in_reply_to']) {
    if (await knex.schema.hasColumn('crm_messages', name)) {
      await knex.schema.alterTable('crm_messages', (t) => t.dropColumn(name));
    }
  }
};
