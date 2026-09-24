/**
 * Aktualisierungsmailing für Firmen-Stammdaten (v0.405).
 *
 * Ein Mailing fragt gezielt nach, was bei einer Firma fehlt. Je Ansprechperson
 * eine Mail, mit einem persönlichen Link auf eine Seite ohne Anmeldung, auf der
 * genau diese Felder ausgefüllt werden können. Wer nichts ändern will,
 * bestätigt mit einem Klick, dass alles stimmt. Auch das ist ein Ergebnis.
 *
 * Zwei Tabellen:
 *   pflege_kampagnen    ein Mailing, mit Versandfenster und Ration
 *   pflege_einladungen  eine Zeile je Person, mit Einmal-Token und Verlauf
 *
 * Der Token ist nur gehasht gespeichert. Wer die Datenbank liest, kann damit
 * keine fremde Firmenakte öffnen.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('pflege_kampagnen', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.text('name').notNullable();
    t.text('betreff').notNullable();
    t.text('text').notNullable();                 // mit {{anrede}}, {{firma}}, {{fehlende_felder}}, {{link}}
    t.text('text_erinnerung');                    // kurze Fassung nach sieben Tagen
    t.text('status').notNullable().defaultTo('entwurf');  // entwurf | laeuft | pausiert | fertig
    // Versandfenster und Ration, damit das Postfach nicht in eine Sperre läuft.
    t.integer('ration').notNullable().defaultTo(30);      // Mails je Lauf
    t.integer('pause_sekunden').notNullable().defaultTo(20);
    t.text('fenster_von').notNullable().defaultTo('08:00');
    t.text('fenster_bis').notNullable().defaultTo('18:00');
    t.integer('erinnerung_nach_tagen').notNullable().defaultTo(7);
    // Sperre gegen zwei gleichzeitige Läufe.
    t.timestamp('lauf_seit', { useTz: true });
    t.text('lauf_kennung');
    t.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
    t.index('tenant_id'); t.index('status');
  });

  await knex.schema.createTable('pflege_einladungen', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('kampagne_id').notNullable().references('id').inTable('pflege_kampagnen').onDelete('CASCADE');
    t.integer('company_id').notNullable().references('id').inTable('crm_companies').onDelete('CASCADE');
    t.integer('contact_id').notNullable().references('id').inTable('crm_contacts').onDelete('CASCADE');
    t.text('email').notNullable();
    t.text('token_hash').notNullable();           // nur der Hash, nie der Token selbst
    t.text('fehlend_json').notNullable().defaultTo('[]');   // was zum Zeitpunkt des Versands fehlte
    // Verlauf. Jeder Schritt mit Zeitstempel, damit das Dashboard rechnen kann.
    t.text('status').notNullable().defaultTo('offen');      // offen | belegt | versendet | geoeffnet | ausgefuellt | bestaetigt | unzustellbar | abgemeldet
    t.timestamp('belegt_am', { useTz: true });              // atomar vor dem Senden gesetzt
    t.timestamp('versendet_am', { useTz: true });
    t.timestamp('geoeffnet_am', { useTz: true });
    t.timestamp('ausgefuellt_am', { useTz: true });
    t.timestamp('bestaetigt_am', { useTz: true });
    t.timestamp('abgemeldet_am', { useTz: true });
    t.timestamp('erinnert_am', { useTz: true });
    t.timestamp('unzustellbar_am', { useTz: true });
    t.text('unzustellbar_grund');                 // Klartext, nicht nur ein Code
    t.timestamps(true, true);
    t.unique(['kampagne_id', 'contact_id']);      // eine Mail je Person und Mailing
    t.index('tenant_id'); t.index(['kampagne_id', 'status']); t.index('token_hash');
  });

  // Gesperrte Adressen: Wer einmal unzustellbar war oder sich abgemeldet hat,
  // bekommt in keinem weiteren Mailing dieser Art eine Mail.
  await knex.schema.createTable('pflege_sperren', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.text('email').notNullable();
    t.text('grund').notNullable();
    t.text('quelle');                             // bounce | abmeldung | manuell
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['tenant_id', 'email']);
  });

  for (const table of ['pflege_kampagnen', 'pflege_einladungen', 'pflege_sperren']) {
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
  await knex.schema.dropTableIfExists('pflege_einladungen');
  await knex.schema.dropTableIfExists('pflege_sperren');
  await knex.schema.dropTableIfExists('pflege_kampagnen');
};
