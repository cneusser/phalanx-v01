/**
 * Nachfolge-Profil (angelehnt an den Fragebogen CH-NF-03). Ein Datensatz je
 * Nutzer, den der Nachfolge-Interessent selbst pflegt. Grundlage für das spätere
 * Matching gegen Nachfolge-Mandate.
 */
exports.up = async function (knex) {
  const exists = await knex.schema.hasTable('succession_profiles');
  if (!exists) {
    await knex.schema.createTable('succession_profiles', (t) => {
      t.increments('id').primary();
      t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
      t.integer('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
      // Person
      t.text('plz_ort');
      // Erfahrung
      t.text('branchenerfahrung');
      t.text('funktionale_erfahrung');
      t.text('fuehrungserfahrung');          // z. B. Mitarbeiterzahl
      t.text('budgetverantwortung');
      t.text('special_situations').notNullable().defaultTo('[]'); // JSON-Array
      // Gesuchtes Target
      t.text('ziel_laender').notNullable().defaultTo('[]');       // JSON: Deutschland/Österreich/Schweiz
      t.text('ziel_regionen').notNullable().defaultTo('[]');      // JSON: Bundesländer/Freitext
      t.text('branchenfokus').notNullable().defaultTo('[]');      // JSON-Array
      t.text('umsatz_band');                 // <1 | 1-3 | 3-10 | 10-30 | >30 (Mio. Euro)
      t.text('mbi_szenario');                // reine_beteiligung | partnerschaft | operative_fuehrung | andere
      t.text('eigenkapital');                // Freitext: vorhandenes EK / Finanzierungsinstrumente
      t.text('verfuegbarkeit');              // ab wann verfügbar
      t.text('bemerkungen');
      t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      t.index('tenant_id'); t.index('user_id');
    });
    await knex.raw('ALTER TABLE succession_profiles ENABLE ROW LEVEL SECURITY');
    await knex.raw('ALTER TABLE succession_profiles FORCE ROW LEVEL SECURITY');
    await knex.raw(`
      CREATE POLICY tenant_isolation_succession_profiles ON succession_profiles
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true)::int)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`);
  }
};

exports.down = async function (knex) {
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_succession_profiles ON succession_profiles').catch(() => {});
  await knex.schema.dropTableIfExists('succession_profiles');
};
