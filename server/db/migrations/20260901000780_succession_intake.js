// Login-freie Nachfolge-Fragebogen-Antworten (über den Pflege-Link). Werden bei
// der späteren Registrierung in succession_profiles übernommen.
exports.up = async function (knex) {
  const has = await knex.schema.hasTable('succession_intake').catch(() => false);
  if (has) return;
  await knex.schema.createTable('succession_intake', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1);
    t.integer('contact_id').notNullable().references('id').inTable('crm_contacts').onDelete('CASCADE');
    // Freitext-Felder (analog succession_profiles)
    t.text('plz_ort');
    t.text('branchenerfahrung');
    t.text('funktionale_erfahrung');
    t.text('fuehrungserfahrung');
    t.text('budgetverantwortung');
    t.text('umsatz_band');
    t.text('mbi_szenario');
    t.text('eigenkapital');
    t.text('verfuegbarkeit');
    t.text('bemerkungen');
    t.text('succession_type');
    // Mehrfachauswahl als JSON-Text
    t.text('special_situations');
    t.text('ziel_laender');
    t.text('ziel_regionen');
    t.text('branchenfokus');
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    t.unique(['contact_id']);
    t.index('tenant_id');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('succession_intake').catch(() => {});
};
