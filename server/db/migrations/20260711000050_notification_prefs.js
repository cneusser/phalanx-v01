/**
 * Sprint 18 — Engagement-Mailings.
 *  notification_prefs: granulare Opt-in/Opt-out je Nutzer (DSGVO: jederzeit abwählbar).
 *  watchlist.source:  unterscheidet manuelles Folgen (Stern) von Auto-Folgen bei Interesse.
 * Fehlt eine prefs-Zeile, gelten die Defaults (alles an) — die Zeile wird bei der
 * ersten Änderung angelegt (Upsert).
 */
exports.up = async function (knex) {
  await knex.schema.createTable('notification_prefs', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    t.integer('newsletter').notNullable().defaultTo(1);            // neue Mandate allgemein
    t.text('newsletter_freq').notNullable().defaultTo('instant');  // instant | off (daily/weekly via Suchprofil-Digest)
    t.integer('follow_updates').notNullable().defaultTo(1);        // Änderungen an gefolgten Mandaten
    t.integer('similar_suggestions').notNullable().defaultTo(1);   // Hinweise auf ähnliche Mandate
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index('tenant_id'); t.index('user_id');
  });

  await knex.raw(`ALTER TABLE notification_prefs ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`ALTER TABLE notification_prefs FORCE ROW LEVEL SECURITY`);
  await knex.raw(`
    CREATE POLICY tenant_isolation_notification_prefs ON notification_prefs
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::int)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`);

  // Folgen-Quelle: 'manual' (Stern) | 'auto' (bei Interesse/NDA automatisch)
  const hasSource = await knex.schema.hasColumn('watchlist', 'source');
  if (!hasSource) {
    await knex.schema.alterTable('watchlist', (t) => {
      t.text('source').notNullable().defaultTo('manual');
    });
  }
};

exports.down = async function (knex) {
  await knex.raw(`DROP POLICY IF EXISTS tenant_isolation_notification_prefs ON notification_prefs`);
  await knex.schema.dropTableIfExists('notification_prefs');
  const hasSource = await knex.schema.hasColumn('watchlist', 'source');
  if (hasSource) await knex.schema.alterTable('watchlist', (t) => { t.dropColumn('source'); });
};
