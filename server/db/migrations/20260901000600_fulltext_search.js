// Volltextsuche über Dokumentinhalte: content_text + generierte content_tsv
// (Deutsch) mit GIN-Index, an documents (Datenraum) und safe_items (Safe).
exports.up = async function (knex) {
  // documents hat kein „name", sondern „filename" → eigene Definition.
  const hasDocText = await knex.schema.hasColumn('documents', 'content_text').catch(() => false);
  if (!hasDocText) await knex.schema.alterTable('documents', (t) => { t.text('content_text'); });
  const hasDocTsv = await knex.schema.hasColumn('documents', 'content_tsv').catch(() => false);
  if (!hasDocTsv) {
    await knex.raw(`
      ALTER TABLE documents ADD COLUMN content_tsv tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('german', coalesce(filename, '')), 'A') ||
        setweight(to_tsvector('german', coalesce(content_text, '')), 'B')
      ) STORED
    `).catch(() => {});
  }
  await knex.raw(`CREATE INDEX IF NOT EXISTS documents_content_tsv_idx ON documents USING GIN (content_tsv)`).catch(() => {});

  // safe_items hat „name".
  const hasSiText = await knex.schema.hasColumn('safe_items', 'content_text').catch(() => false);
  if (!hasSiText) await knex.schema.alterTable('safe_items', (t) => { t.text('content_text'); });
  const hasSiTsv = await knex.schema.hasColumn('safe_items', 'content_tsv').catch(() => false);
  if (!hasSiTsv) {
    await knex.raw(`
      ALTER TABLE safe_items ADD COLUMN content_tsv tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('german', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('german', coalesce(content_text, '')), 'B')
      ) STORED
    `).catch(() => {});
  }
  await knex.raw(`CREATE INDEX IF NOT EXISTS safe_items_content_tsv_idx ON safe_items USING GIN (content_tsv)`).catch(() => {});
};

exports.down = async function (knex) {
  await knex.raw(`DROP INDEX IF EXISTS documents_content_tsv_idx`).catch(() => {});
  await knex.raw(`DROP INDEX IF EXISTS safe_items_content_tsv_idx`).catch(() => {});
  for (const table of ['documents', 'safe_items']) {
    await knex.raw(`ALTER TABLE ${table} DROP COLUMN IF EXISTS content_tsv`).catch(() => {});
    await knex.schema.alterTable(table, (t) => { t.dropColumn('content_text'); }).catch(() => {});
  }
};
