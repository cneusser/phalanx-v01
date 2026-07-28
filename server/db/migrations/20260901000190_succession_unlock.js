/**
 * Übergeber-Seite: Freischaltung der Nachfolge-Kandidaten je Mandat.
 * succession_unlocked = 0: der Übergeber sieht nur die Anzahl und eine anonyme
 * Vorschau. = 1: er sieht die Kandidaten mit Namen (spätere Bezahlstufe, aktuell
 * durch das Team freigeschaltet).
 */
exports.up = async function (knex) {
  const has = await knex.schema.hasColumn('projects', 'succession_unlocked').catch(() => false);
  if (!has) await knex.schema.alterTable('projects', (t) => { t.integer('succession_unlocked').notNullable().defaultTo(0); });
};
exports.down = async function (knex) {
  const has = await knex.schema.hasColumn('projects', 'succession_unlocked').catch(() => false);
  if (has) await knex.schema.alterTable('projects', (t) => { t.dropColumn('succession_unlocked'); }).catch(() => {});
};
