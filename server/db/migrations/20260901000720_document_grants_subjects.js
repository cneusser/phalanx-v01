// Feingranulare Datenraum-Freigabe: document_grants um Subjekt-Typen erweitern
// (Person, Käufergruppe, alle Beteiligten, eigene Gruppe), analog safe_grants.
// Bestandsdaten (nur user_id) werden auf subject_type='user' migriert.
exports.up = async function (knex) {
  const hasType = await knex.schema.hasColumn('document_grants', 'subject_type').catch(() => false);
  if (!hasType) await knex.schema.alterTable('document_grants', (t) => { t.text('subject_type').notNullable().defaultTo('user'); });
  const hasRef = await knex.schema.hasColumn('document_grants', 'subject_ref').catch(() => false);
  if (!hasRef) await knex.schema.alterTable('document_grants', (t) => { t.text('subject_ref'); });

  // Bestehende Zeilen (user-basiert) abbilden.
  await knex.raw(`UPDATE document_grants SET subject_type = 'user', subject_ref = user_id::text
                  WHERE subject_ref IS NULL AND user_id IS NOT NULL`).catch(() => {});

  // user_id darf jetzt leer sein (für Gruppen-/Käufergruppen-Freigaben).
  await knex.raw('ALTER TABLE document_grants ALTER COLUMN user_id DROP NOT NULL').catch(() => {});

  // Eindeutigkeit auf das Subjekt umstellen (alte user-Unique fällt weg).
  await knex.raw('ALTER TABLE document_grants DROP CONSTRAINT IF EXISTS document_grants_document_id_user_id_unique').catch(() => {});
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS document_grants_doc_subject_uidx
                  ON document_grants (document_id, subject_type, subject_ref)`).catch(() => {});
};

exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS document_grants_doc_subject_uidx').catch(() => {});
  for (const col of ['subject_ref', 'subject_type']) {
    const has = await knex.schema.hasColumn('document_grants', col).catch(() => false);
    if (has) await knex.schema.alterTable('document_grants', (t) => { t.dropColumn(col); }).catch(() => {});
  }
};
