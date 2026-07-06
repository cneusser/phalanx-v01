/**
 * E-Mail-Verifizierung: Registrierung ist erst nach Bestätigung der E-Mail
 * abgeschlossen. Bestandsnutzer gelten als verifiziert (Backfill = 1), damit
 * sie sich weiter anmelden können.
 */
exports.up = async function (knex) {
  const hasVerified = await knex.schema.hasColumn('users', 'email_verified');
  if (!hasVerified) {
    await knex.schema.alterTable('users', (t) => {
      t.integer('email_verified').notNullable().defaultTo(0);
      t.text('email_verify_token');
      t.timestamp('email_verify_expires', { useTz: true });
    });
    // Bestandsnutzer als verifiziert markieren (kein Aussperren bestehender Konten)
    await knex('users').update({ email_verified: 1 });
  }
};

exports.down = async function (knex) {
  const has = await knex.schema.hasColumn('users', 'email_verified');
  if (has) await knex.schema.alterTable('users', (t) => {
    t.dropColumn('email_verified'); t.dropColumn('email_verify_token'); t.dropColumn('email_verify_expires');
  });
};
