/**
 * Nutzer-Stammdaten: Anrede (Pflicht), Titel (optional) und vollständige
 * Anschrift (Straße, PLZ, Ort) — für alle Rollen. Die Anschrift fließt
 * u. a. in die NDA-Vertragsparteien ein.
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.text('salutation');   // Herr | Frau | Divers
    t.text('title');        // z. B. Dr., Prof.
    t.text('street');
    t.text('postal_code');
    t.text('city');
  });
  await knex.raw(`ALTER TABLE users ADD CONSTRAINT users_salutation_check
    CHECK (salutation IS NULL OR salutation IN ('Herr','Frau','Divers'))`);
};

exports.down = async function (knex) {
  await knex.raw(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_salutation_check`);
  await knex.schema.alterTable('users', (t) => {
    t.dropColumns('salutation', 'title', 'street', 'postal_code', 'city');
  });
};
