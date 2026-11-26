// ─────────────────────────────────────────────────────────────────────────────
// Maschinelle Vorschläge bekommen einen eigenen Platz (v0.509)
//
// Anlass, wörtlich: „vielleicht entsprechend eine KI-Funktion habe, wo Daten
// nachgetragen werden, sei es Branche, sei es Umsatzgröße etc., damit ich hier
// langsam oder sicher eine Datenbasis aufbaue, die detaillierter ist."
//
// Entschieden wurde: Vorschlag mit Quelle, Übernahme erst auf Klick.
//
// Der Grund steht in jeder anderen Datei dieses Projekts auch: Nichts wird
// geraten. Eine Umsatzgrößenordnung, die ein Sprachmodell für plausibel hält,
// sieht im Feld genauso aus wie eine, die jemand recherchiert hat. Zwei Jahre
// später weiss niemand mehr, welche von beiden es war, und dann entscheidet
// eine erfundene Zahl mit darüber, wem ein Mandat vorgelegt wird.
//
// Deshalb eine eigene Tabelle statt eines Feldes im Datensatz:
//
//   · Der Vorschlag steht neben dem Feld, nicht darin.
//   · Herkunft, Modell, Begründung und Zeitpunkt stehen dabei.
//   · Übernommen wird einzeln, und wer übernommen hat, bleibt vermerkt.
//   · Abgelehntes wird nicht gelöscht, sondern als abgelehnt geführt. Sonst
//     schlägt derselbe Lauf morgen dasselbe wieder vor.
// ─────────────────────────────────────────────────────────────────────────────

exports.up = async function (knex) {
  const da = await knex.schema.hasTable('anreicherung_vorschlaege');
  if (da) return;

  await knex.schema.createTable('anreicherung_vorschlaege', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.text('objekt').notNullable();            // firma | kontakt
    t.integer('objekt_id').notNullable();
    t.text('feld').notNullable();              // sektor, revenue_band, employees, region, website
    t.text('wert').notNullable();              // der Vorschlag, immer als Text
    t.text('begruendung');                     // woran das Modell es festmacht
    t.text('quelle').notNullable();            // modellname oder 'regel'
    t.integer('sicherheit');                   // 0 bis 100, wie das Modell sich einschätzt
    t.text('stand').notNullable().defaultTo('offen');   // offen | uebernommen | abgelehnt
    t.integer('entschieden_von').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('entschieden_am', { useTz: true });
    t.timestamp('erstellt_am', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['tenant_id', 'objekt', 'objekt_id', 'feld']);
    t.index(['objekt', 'objekt_id']);
    t.index('stand');
  });

  await knex.raw(`ALTER TABLE anreicherung_vorschlaege ADD CONSTRAINT anreicherung_objekt_check
                  CHECK (objekt IN ('firma', 'kontakt'))`);
  await knex.raw(`ALTER TABLE anreicherung_vorschlaege ADD CONSTRAINT anreicherung_stand_check
                  CHECK (stand IN ('offen', 'uebernommen', 'abgelehnt'))`);

  await knex.raw('ALTER TABLE anreicherung_vorschlaege ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE anreicherung_vorschlaege FORCE ROW LEVEL SECURITY');
  await knex.raw(`
    CREATE POLICY tenant_isolation_anreicherung ON anreicherung_vorschlaege
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::int)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`);
  await knex.raw(`ALTER TABLE anreicherung_vorschlaege ALTER COLUMN tenant_id
                  SET DEFAULT COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::int, 1)`);
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('anreicherung_vorschlaege');
};
