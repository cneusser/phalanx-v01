/**
 * Kontaktoffenlegung als eigener, nachweisbarer Schritt (v0.468)
 *
 * Bisher galt: Wer eine Kontaktanfrage angenommen hat, sieht die E-Mail-Adresse
 * der Gegenseite. Für zwei Investoren, die sich im Netzwerk verbinden, ist das
 * richtig. Für Verkäufer und Kaufinteressent desselben Mandats ist es zu früh.
 * Dort soll gelten: Die Kontaktdaten werden erst offengelegt, wenn wir das
 * ausdrücklich freigegeben haben, und das frühestens, wenn die
 * Vertraulichkeitsvereinbarung von allen Seiten unterzeichnet ist.
 *
 * Eine Freigabe, die nur in der Oberfläche stattfindet, ist keine. Deshalb hier
 * eine eigene Zeile je Mandat und Personenpaar, mit Zeitpunkt, handelnder
 * Person und der Möglichkeit, sie zu widerrufen. Das Paar wird sortiert
 * gespeichert (kleinere Nutzer-Id zuerst), damit dieselbe Freigabe nicht
 * zweimal in zwei Richtungen entstehen kann.
 */
exports.up = async function (knex) {
  if (!(await knex.schema.hasTable('kontakt_freigaben'))) {
    await knex.schema.createTable('kontakt_freigaben', (t) => {
      t.increments('id').primary();
      t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
      t.integer('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
      t.integer('a_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.integer('b_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.integer('freigegeben_von').references('id').inTable('users').onDelete('SET NULL');
      t.timestamp('freigegeben_am', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      t.integer('widerrufen_von').references('id').inTable('users').onDelete('SET NULL');
      t.timestamp('widerrufen_am', { useTz: true });
      t.text('grund');
      t.unique(['project_id', 'a_user_id', 'b_user_id']);
      t.index('tenant_id');
    });
  }

  // Mandantentrennung wie bei allen anderen Tabellen: ohne gesetzte
  // Sitzungsvariable ist keine Zeile sichtbar.
  await knex.raw('ALTER TABLE kontakt_freigaben ENABLE ROW LEVEL SECURITY').catch(() => {});
  await knex.raw('ALTER TABLE kontakt_freigaben FORCE ROW LEVEL SECURITY').catch(() => {});
  await knex.raw(`
    CREATE POLICY tenant_isolation_kontakt_freigaben ON kontakt_freigaben
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::int)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)
  `).catch(() => { /* Richtlinie besteht bereits */ });
};

exports.down = async function (knex) {
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_kontakt_freigaben ON kontakt_freigaben').catch(() => {});
  await knex.schema.dropTableIfExists('kontakt_freigaben');
};
