// ─────────────────────────────────────────────────────────────────────────────
// Was wird im Verwaltungsbereich tatsächlich benutzt? (v0.503)
//
// Anlass, wörtlich: „Vereinfachung der Oberfläche" und mein eigener Vorschlag,
// dafür eine Woche mitzuzählen statt zu raten. Der Verwaltungsbereich hat
// einundzwanzig Reiter. Welche fünf davon täglich gebraucht werden, weiss
// niemand; jede Antwort darauf wäre bisher ein Gefühl gewesen.
//
// Gezählt wird so wenig wie möglich: wer, welcher Reiter, welcher Tag, wie
// oft. Keine Suchbegriffe, keine Mandate, keine Inhalte. Eine Zeile je Person,
// Reiter und Tag, damit die Tabelle nicht wächst, sondern zählt.
// ─────────────────────────────────────────────────────────────────────────────

exports.up = async function (knex) {
  const da = await knex.schema.hasTable('nutzung_bereiche');
  if (da) return;
  await knex.schema.createTable('nutzung_bereiche', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('bereich').notNullable();
    t.date('tag').notNullable();
    t.integer('anzahl').notNullable().defaultTo(1);
    t.timestamp('zuletzt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['tenant_id', 'user_id', 'bereich', 'tag']);
    t.index('tag');
  });
  await knex.raw('ALTER TABLE nutzung_bereiche ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE nutzung_bereiche FORCE ROW LEVEL SECURITY');
  await knex.raw(`
    CREATE POLICY tenant_isolation_nutzung_bereiche ON nutzung_bereiche
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::int)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`);
  await knex.raw(`ALTER TABLE nutzung_bereiche ALTER COLUMN tenant_id
                  SET DEFAULT COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::int, 1)`);
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('nutzung_bereiche');
};
