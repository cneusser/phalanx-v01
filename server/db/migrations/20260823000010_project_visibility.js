/**
 * v0.303: Sichtbarkeit je Mandat.
 *
 * Nicht jedes Mandat gehört in den offenen Marktplatz. Für vertrauliche Prozesse
 * gibt es jetzt zwei Sichtbarkeiten:
 *
 *   public       Regelfall: erscheint im Marktplatz, in den Zählern und im Matching.
 *   invite_only  Vertraulich: erscheint nirgends öffentlich. Sichtbar nur für das
 *                Team, den Ersteller, Mandats-Mitglieder und ausdrücklich
 *                eingeladene Beteiligte. Kein Matching, kein Newsletter.
 *
 * Bestandsmandate bleiben öffentlich, damit sich am heutigen Verhalten nichts ändert.
 */
exports.up = async function (knex) {
  const has = await knex.schema.hasColumn('projects', 'visibility').catch(() => false);
  if (!has) {
    await knex.schema.alterTable('projects', (t) => {
      t.text('visibility').notNullable().defaultTo('public');
    });
    await knex.raw(`CREATE INDEX IF NOT EXISTS projects_visibility_idx ON projects (visibility)`).catch(() => {});
  }
};

exports.down = async function (knex) {
  const has = await knex.schema.hasColumn('projects', 'visibility').catch(() => false);
  if (has) {
    await knex.raw(`DROP INDEX IF EXISTS projects_visibility_idx`).catch(() => {});
    await knex.schema.alterTable('projects', (t) => t.dropColumn('visibility'));
  }
};
