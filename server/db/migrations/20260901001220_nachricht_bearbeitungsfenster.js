/**
 * Bearbeitungsfenster für Nachrichten (v0.399).
 *
 * Bisher ging eine Nachricht im selben Moment hinaus, in dem sie abgeschickt
 * wurde: Der Eintrag stand sofort im Thread des Empfängers und die Hinweis-Mail
 * verließ den Server. Ein Tippfehler oder ein halb fertiger Satz war damit
 * endgültig.
 *
 * Neu ist ein kurzes Fenster zwischen Abschicken und Zustellen:
 * - zustellung_ab: Ab diesem Zeitpunkt sieht der Empfänger die Nachricht und
 *   erst dann geht die Hinweis-Mail hinaus. Bis dahin gehört sie dem Absender.
 * - benachrichtigt_am: Vermerk des Hintergrundlaufs, verhindert Doppelversand.
 * - bearbeitet_am: gesetzt, sobald der Text nachträglich geändert wurde.
 * - zurueckgezogen_am: weiche Rücknahme, die Zeile bleibt für die Nachvollzieh-
 *   barkeit bestehen, wird aber niemandem mehr angezeigt.
 *
 * Bestandszeilen haben zustellung_ab = NULL und gelten damit als zugestellt.
 */
exports.up = async function (knex) {
  const spalten = [
    ['zustellung_ab', (t) => t.timestamp('zustellung_ab', { useTz: true })],
    ['benachrichtigt_am', (t) => t.timestamp('benachrichtigt_am', { useTz: true })],
    ['bearbeitet_am', (t) => t.timestamp('bearbeitet_am', { useTz: true })],
    ['zurueckgezogen_am', (t) => t.timestamp('zurueckgezogen_am', { useTz: true })],
  ];
  for (const [name, bauen] of spalten) {
    const da = await knex.schema.hasColumn('messages', name).catch(() => false);
    if (!da) await knex.schema.alterTable('messages', bauen);
  }
  // Der Hintergrundlauf sucht genau nach diesem Zuschnitt.
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS messages_zustellung_idx
     ON messages (zustellung_ab)
     WHERE benachrichtigt_am IS NULL AND zurueckgezogen_am IS NULL`
  ).catch(() => {});
};

exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS messages_zustellung_idx').catch(() => {});
  await knex.schema.alterTable('messages', (t) => {
    t.dropColumn('zurueckgezogen_am');
    t.dropColumn('bearbeitet_am');
    t.dropColumn('benachrichtigt_am');
    t.dropColumn('zustellung_ab');
  });
};
