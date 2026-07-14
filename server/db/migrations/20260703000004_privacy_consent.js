/**
 * DSGVO: Einwilligungszeitpunkt bei Registrierung speichern.
 * (Einwilligung in Datenspeicherung und projektbezogene Ansprache)
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.timestamp('privacy_consent_at', { useTz: true });
  });
  // Bestandsnutzer: Einwilligung war implizit Teil der bisherigen Registrierung, 
  // Zeitpunkt der Registrierung als bestmögliche Annäherung dokumentieren
  await knex.raw(`UPDATE users SET privacy_consent_at = created_at WHERE privacy_consent_at IS NULL`);
};

exports.down = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('privacy_consent_at');
  });
};
