/**
 * Rundmail an registrierte Konten (v0.409).
 *
 * Anlass ist die neue Oberfläche, aber das Werkzeug bleibt: Von Zeit zu Zeit
 * muss man allen Nutzern etwas mitteilen, das ihren Zugang betrifft.
 *
 * Bewusst getrennt von `pflege_kampagnen`: Dort geht es um fehlende Angaben
 * einzelner Firmen, hier um eine Nachricht an alle. Beide teilen aber dieselben
 * Grundsätze, weil sie sich bewährt haben:
 *   · je Empfänger genau eine Zeile, eindeutig über (kampagne_id, user_id)
 *   · vor dem Senden atomar belegen, sonst schickt ein zweiter Lauf doppelt
 *   · Versand in Rationen, von Hand angestoßen, innerhalb eines Zeitfensters
 *   · Abmeldung je Mailing, Sperrliste für unzustellbare Adressen
 *
 * Empfängerkreis ist enger gefasst als „alle": nur bestätigte, aktive und
 * freigeschaltete Konten. Das ist ein Vertragsverhältnis, eine Mitteilung über
 * die Plattform ist dort zulässig. Wer widersprochen hat, bleibt außen vor.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('rundmails', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.text('name').notNullable();
    t.text('betreff').notNullable();
    t.text('titel').notNullable();
    t.text('text').notNullable();                        // mit {{anrede}}
    t.text('status').notNullable().defaultTo('entwurf'); // entwurf | laeuft | pausiert | fertig
    t.integer('ration').notNullable().defaultTo(40);
    t.integer('pause_sekunden').notNullable().defaultTo(15);
    t.text('fenster_von').notNullable().defaultTo('08:00');
    t.text('fenster_bis').notNullable().defaultTo('18:00');
    // Sperre gegen zwei gleichzeitige Läufe.
    t.timestamp('lauf_seit', { useTz: true });
    t.text('lauf_kennung');
    t.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
    t.index('tenant_id'); t.index('status');
  });

  await knex.schema.createTable('rundmail_empfaenger', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('rundmail_id').notNullable().references('id').inTable('rundmails').onDelete('CASCADE');
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('email').notNullable();
    t.text('token_hash').notNullable();                  // für die Abmeldung, nur gehasst
    t.text('status').notNullable().defaultTo('offen');   // offen | belegt | versendet | abgemeldet | unzustellbar
    t.timestamp('belegt_am', { useTz: true });
    t.timestamp('versendet_am', { useTz: true });
    t.timestamp('abgemeldet_am', { useTz: true });
    t.timestamp('unzustellbar_am', { useTz: true });
    t.text('unzustellbar_grund');                        // Klartext, nicht nur ein Code
    t.timestamps(true, true);
    t.unique(['rundmail_id', 'user_id']);                // eine Mail je Person und Mailing
    t.index('tenant_id'); t.index(['rundmail_id', 'status']); t.index('token_hash');
  });

  for (const table of ['rundmails', 'rundmail_empfaenger']) {
    await knex.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`).catch(() => {});
    await knex.raw(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`).catch(() => {});
    await knex.raw(`
      CREATE POLICY tenant_isolation_${table} ON ${table}
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true)::int)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`).catch(() => {});
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('rundmail_empfaenger');
  await knex.schema.dropTableIfExists('rundmails');
};
