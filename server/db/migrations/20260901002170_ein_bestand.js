/**
 * Ein Bestand, ein Speicherweg (v0.477, Datenraum 2.0 Sprint 1a)
 *
 * Anlass: „Gefühlt kann ich Dateien hochladen wie zum Beispiel Teaser oder
 * Exposé, aber sie tauchen nicht im Datenraum auf."
 *
 * Die Ursache steht im Code und nicht im Bedienfehler. Es gibt zwei
 * Ablagen nebeneinander:
 *
 *   `safe_items`   der Datenraum, den der Käufer sieht. Dateien liegen beim
 *                  Speicheranbieter, also bei R2.
 *   `documents`    der alte Dokumente-Reiter. Dateien liegen als Datei auf
 *                  dem Railway-Volume, am Speicheranbieter vorbei.
 *
 * Wer über den Dokumente-Reiter hochlädt, schreibt also in die eine Ablage,
 * und der Käufer schaut in die andere. Dazu legte „In Datenraum übernehmen"
 * bisher eine zweite physische Kopie auf dem Volume an: dieselbe Unterlage
 * zweimal, an zwei Orten, mit zwei Schicksalen.
 *
 * Diese Wanderung ist der erste Schritt dagegen. Sie schafft `documents`
 * nicht ab, das wäre ein Umbau am offenen Herzen. Sie gibt der Tabelle zwei
 * Spalten, damit eine Zeile auf dieselbe Datei zeigen kann wie der Safe:
 *
 *   storage_key    der Schlüssel beim Speicheranbieter, derselbe wie im Safe
 *   safe_item_id   woher die Zeile stammt, falls aus dem Safe übernommen
 *
 * `file_path` bleibt stehen und wird weiter gelesen. Bestandsdateien auf dem
 * Volume bleiben damit erreichbar, bis sie umgezogen sind. Eine Wanderung,
 * die alte Wege sofort abschneidet, macht aus einem Umbau einen Ausfall.
 */
exports.up = async function (knex) {
  for (const [name, bauen] of [
    ['storage_key', (t) => t.text('storage_key')],
    ['safe_item_id', (t) => t.integer('safe_item_id')],
  ]) {
    if (!(await knex.schema.hasColumn('documents', name))) {
      await knex.schema.alterTable('documents', bauen);
    }
  }
  await knex.raw('CREATE INDEX IF NOT EXISTS documents_storage_key_idx ON documents (storage_key)').catch(() => {});
  await knex.raw('CREATE INDEX IF NOT EXISTS documents_safe_item_idx ON documents (safe_item_id)').catch(() => {});
};

exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS documents_safe_item_idx').catch(() => {});
  await knex.raw('DROP INDEX IF EXISTS documents_storage_key_idx').catch(() => {});
  for (const name of ['safe_item_id', 'storage_key']) {
    if (await knex.schema.hasColumn('documents', name)) {
      await knex.schema.alterTable('documents', (t) => t.dropColumn(name));
    }
  }
};
