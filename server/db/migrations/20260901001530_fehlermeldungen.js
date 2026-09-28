/**
 * Abstürze der Oberfläche einsammeln (v0.424).
 *
 * Bisher zeigte die Fehlergrenze dem Nutzer eine Meldung und schrieb sie in
 * die Browserkonsole. Dorthin sieht niemand. Ein Interessent im FARADAY-
 * Datenraum hing vier Tage fest, und wir erfuhren davon durch eine E-Mail mit
 * einem Bildschirmfoto.
 *
 * Gespeichert wird, was zur Eingrenzung nötig ist: Meldung, Komponentenpfad,
 * Adresse, Fassung, Browserkennung. Die Nutzerkennung nur, wenn jemand
 * angemeldet ist, und als Fremdschlüssel, nicht als Name. Kein Inhalt der
 * Seite, keine Formulardaten, nichts aus dem Datenraum.
 */
exports.up = async function (knex) {
  if (await knex.schema.hasTable('fehlermeldungen')) return;
  await knex.schema.createTable('fehlermeldungen', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.text('meldung').notNullable();
    t.text('komponenten');          // React-Komponentenpfad, gekürzt
    t.text('adresse');              // Pfad in der Anwendung, ohne Parameter
    t.text('fassung');              // Version, die der Browser geladen hatte
    t.text('browser');              // User-Agent, gekürzt
    t.integer('anzahl').notNullable().defaultTo(1);
    t.timestamp('zuerst_am', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('zuletzt_am', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('erledigt_am', { useTz: true });
    t.index('tenant_id');
    t.index('zuletzt_am');
  });
  // Dieselbe Meldung auf derselben Seite in derselben Fassung ist derselbe
  // Fehler. Sonst steht nach einem Ausfall tausendmal dasselbe in der Liste.
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS fehlermeldungen_gleich_idx
                  ON fehlermeldungen (tenant_id, md5(meldung), COALESCE(adresse,''), COALESCE(fassung,''))`);
  await knex.raw('ALTER TABLE fehlermeldungen ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE fehlermeldungen FORCE ROW LEVEL SECURITY');
  await knex.raw(`CREATE POLICY tenant_isolation_fehlermeldungen ON fehlermeldungen
                  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::int)
                  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`).catch(() => {});
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('fehlermeldungen');
};
