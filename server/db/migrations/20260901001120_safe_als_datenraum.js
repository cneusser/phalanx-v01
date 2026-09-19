/**
 * Safe wird der Datenraum (v0.392).
 *
 * Bisher war der Safe rein intern und wurde per „Publish" in eine flache
 * Dokumentenliste kopiert, wodurch die Ordnerstruktur beim Käufer verloren ging.
 * Künftig lesen Käufer den Safe-Baum direkt.
 *
 * Neu:
 *   safe_items.confidential   Clean Team: nur mit ausdrücklicher Einzelfreigabe
 *                             sichtbar. Wirkt auf den ganzen Teilbaum: Was unter
 *                             einem vertraulichen Ordner liegt, ist ebenfalls
 *                             vertraulich.
 *   safe_access_log.detail    Zusatz zum Protokolleintrag, z. B. „im Archiv
 *                             enthalten", damit ein Sammel-Download je Datei
 *                             nachvollziehbar bleibt.
 */
exports.up = async function (knex) {
  const hasConf = await knex.schema.hasColumn('safe_items', 'confidential').catch(() => false);
  if (!hasConf) {
    await knex.schema.alterTable('safe_items', (t) => {
      t.integer('confidential').notNullable().defaultTo(0);
    });
  }
  const hasDetail = await knex.schema.hasColumn('safe_access_log', 'detail').catch(() => false);
  if (!hasDetail) {
    await knex.schema.alterTable('safe_access_log', (t) => { t.text('detail'); });
  }
  await knex.raw(
    'CREATE INDEX IF NOT EXISTS safe_items_confidential_idx ON safe_items (project_id) WHERE confidential = 1'
  ).catch(() => {});
};

exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS safe_items_confidential_idx').catch(() => {});
  const hasDetail = await knex.schema.hasColumn('safe_access_log', 'detail').catch(() => false);
  if (hasDetail) await knex.schema.alterTable('safe_access_log', (t) => { t.dropColumn('detail'); });
  const hasConf = await knex.schema.hasColumn('safe_items', 'confidential').catch(() => false);
  if (hasConf) await knex.schema.alterTable('safe_items', (t) => { t.dropColumn('confidential'); });
};
