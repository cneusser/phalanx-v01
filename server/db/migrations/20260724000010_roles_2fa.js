/**
 * Sprint 13: CRM V: Rollen, 2-Faktor-Authentifizierung, DSGVO-Härtung.
 *
 *   users.totp_*        TOTP-Geheimnis (Base32), Aktivierungsstatus, Backup-Codes
 *                       (nur als Hash). Für Staff-Rollen erzwingbar über ENV
 *                       REQUIRE_2FA_STAFF=1.
 *
 *   Rollen              'assistant' (pflegen, aber nicht versenden/löschen) und
 *                       'analyst' (nur lesen) ergänzen super_admin / tenant_owner /
 *                       advisor. Die Rechte-Matrix liegt im Code
 *                       (middleware/permissions.js): sie ist Teil des Audits und
 *                       soll nicht still per SQL veränderbar sein.
 *
 *   crm_contacts.anonymized_at  Recht auf Vergessenwerden: Der Kontakt wird
 *                       anonymisiert (Name/E-Mail/Telefon gelöscht), die Historie
 *                       bleibt als Nachweis erhalten: inklusive der Tatsache,
 *                       dass gelöscht wurde.
 */
exports.up = async function (knex) {
  const cols = [
    ['totp_secret', (t) => t.text('totp_secret')],
    ['totp_enabled', (t) => t.integer('totp_enabled').notNullable().defaultTo(0)],
    ['totp_confirmed_at', (t) => t.timestamp('totp_confirmed_at', { useTz: true })],
    ['backup_codes_json', (t) => t.text('backup_codes_json')],
  ];
  for (const [name, add] of cols) {
    const has = await knex.schema.hasColumn('users', name);
    if (!has) await knex.schema.alterTable('users', (t) => add(t));
  }

  const hasAnon = await knex.schema.hasColumn('crm_contacts', 'anonymized_at');
  if (!hasAnon) {
    await knex.schema.alterTable('crm_contacts', (t) => {
      t.timestamp('anonymized_at', { useTz: true });
      t.integer('anonymized_by').references('id').inTable('users').onDelete('SET NULL');
    });
  }

  // Falls die Rollen-Spalte einen CHECK trägt, muss er die neuen Rollen kennen.
  await knex.raw(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`).catch(() => {});
  await knex.raw(`
    ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('super_admin','tenant_owner','advisor','assistant','analyst','buyer','seller'))
  `).catch(() => {});
};

exports.down = async function (knex) {
  await knex.raw(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`).catch(() => {});
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('totp_secret'); t.dropColumn('totp_enabled');
    t.dropColumn('totp_confirmed_at'); t.dropColumn('backup_codes_json');
  }).catch(() => {});
  await knex.schema.alterTable('crm_contacts', (t) => {
    t.dropColumn('anonymized_at'); t.dropColumn('anonymized_by');
  }).catch(() => {});
};
