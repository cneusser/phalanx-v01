// ─────────────────────────────────────────────────────────────────────────────
// Ein NDA, der per Mail zurückkam, bekommt einen Platz (v0.504)
//
// Anlass, wörtlich: „da ich aktuell sehr viele NDAs auch über Mail mache,
// möchte ich diese gerne in der Plattform danach ablegen unter dem jeweiligen
// Kontakt." Beispiel war Wiedemeyer: unterschrieben zurückgeschickt, und die
// Plattform hatte dafür nur ein Häkchen.
//
// Zwei Dinge lagen bis hierher unverbunden nebeneinander:
//
//   ndas / nda_requests   der Online-Weg, mit Wortlaut, Fassung, Prüfsumme,
//                         Gegenzeichnung. Vollständig, aber nur für den, der
//                         online zeichnet.
//   crm_deal_parties.nda_status   ein Auswahlfeld mit drei Werten. Es behauptet
//                         „liegt vor", belegt aber nichts.
//
// Ein per Mail unterschriebener NDA fiel in die Lücke dazwischen. Man konnte
// das Häkchen setzen und den Datenraum öffnen, ohne dass irgendwo eine Datei
// lag. Für eine Governance, die ein Jahr später noch tragen soll, ist das die
// schlechteste aller Lagen: das Recht wurde erteilt, die Grundlage dafür liegt
// im Postfach.
//
// Diese Tabelle ist die Grundlage. Sie hält dasselbe fest, was der Online-Weg
// festhält, nur von Hand eingetragen statt erzeugt: wer, für welches Mandat,
// wann unterzeichnet, welche Vertragspartei, auf welchem Weg hereingekommen,
// und die Datei selbst mit ihrer Prüfsumme.
//
// Drei Festlegungen:
//
//   1. Die Zeile hängt am Mandat und am Kontakt, nicht am Nutzerkonto. Ein
//      NDA kann unterschrieben sein, bevor jemand ein Konto hat. Gibt es ein
//      Konto, wird es zusätzlich vermerkt, damit der Unterzeichner seinen
//      eigenen NDA herunterladen kann.
//   2. Nichts wird gelöscht. Kommt eine neue Fassung, wird sie hochgelegt und
//      die alte als „ersetzt" gekennzeichnet. Beide bleiben lesbar.
//   3. Die Datei liegt nicht im Datenraum. Der Datenraum ist das, was ein
//      Käufer sehen darf; ein NDA ist eine Urkunde über die Verwaltung und
//      gehört nicht in denselben Baum.
// ─────────────────────────────────────────────────────────────────────────────

exports.up = async function (knex) {
  const da = await knex.schema.hasTable('nda_dokumente');
  if (da) return;

  await knex.schema.createTable('nda_dokumente', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    t.integer('contact_id').references('id').inTable('crm_contacts').onDelete('SET NULL');
    t.integer('party_id').references('id').inTable('crm_deal_parties').onDelete('SET NULL');
    // Das Konto des Unterzeichners, falls es eines gibt. Nur dann kann er
    // seinen eigenen NDA später selbst herunterladen.
    t.integer('user_id').references('id').inTable('users').onDelete('SET NULL');

    // Die Datei
    t.text('dateiname').notNullable();
    t.text('storage_key');
    t.text('file_path');            // Rückfall für Altzeilen, siehe utils/dateiAblage.js
    t.text('mime');
    t.integer('groesse').notNullable().defaultTo(0);
    t.text('pruefsumme');           // SHA-256, Manipulationsnachweis

    // Die Angaben, die der Online-Weg erzeugt und hier von Hand kommen
    t.date('unterzeichnet_am').notNullable();
    t.text('unterzeichner_name').notNullable();
    t.text('partei_firma');
    t.text('partei_sitz');
    t.text('partei_register');
    t.text('herkunft').notNullable().defaultTo('mail');   // mail | papier | anbieter | sonstiges
    t.text('bemerkung');

    // Wer hat hochgelegt, wann, und gilt die Zeile noch
    t.integer('hochgeladen_von').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('hochgeladen_am', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('ersetzt_am', { useTz: true });
    t.integer('ersetzt_durch').references('id').inTable('nda_dokumente').onDelete('SET NULL');

    t.index(['tenant_id', 'project_id']);
    t.index('contact_id');
    t.index('user_id');
  });

  await knex.raw(`
    ALTER TABLE nda_dokumente ADD CONSTRAINT nda_dokumente_herkunft_check
    CHECK (herkunft IN ('mail', 'papier', 'anbieter', 'sonstiges'))`);

  await knex.raw('ALTER TABLE nda_dokumente ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE nda_dokumente FORCE ROW LEVEL SECURITY');
  await knex.raw(`
    CREATE POLICY tenant_isolation_nda_dokumente ON nda_dokumente
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::int)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`);
  await knex.raw(`ALTER TABLE nda_dokumente ALTER COLUMN tenant_id
                  SET DEFAULT COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::int, 1)`);
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('nda_dokumente');
};
