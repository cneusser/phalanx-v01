/**
 * v0.306: Unterlagen-Link ohne Registrierung.
 *
 * Für Gegenüber, die kein Konto anlegen und kein NDA zeichnen (typisch für
 * institutionelle Investoren): ein persönlicher, ablaufender Link auf genau eine
 * Unterlage. Vor dem Öffnen bestätigt der Empfänger die Vertraulichkeit mit Namen.
 * Diese Bestätigung ersetzt keine Unterschrift, ist aber ein belastbarer Nachweis,
 * wer wann worauf zugegriffen hat.
 *
 * Schutz: Ablaufdatum, optionale Höchstzahl an Abrufen, jederzeitiger Widerruf,
 * Wasserzeichen mit dem Namen des Empfängers, vollständiges Zugriffsprotokoll.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('share_links', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    t.integer('contact_id').references('id').inTable('crm_contacts').onDelete('SET NULL');
    // document = eine Datei aus der Dokumentenliste · expose = das hinterlegte Exposé-PDF
    t.text('scope').notNullable().defaultTo('document');
    t.integer('document_id').references('id').inTable('documents').onDelete('CASCADE');
    t.text('token').notNullable().unique();
    t.text('label');
    t.text('recipient_email');
    t.timestamp('expires_at', { useTz: true }).notNullable();
    t.integer('max_views');            // NULL = unbegrenzt (bis zum Ablauf)
    t.integer('views').notNullable().defaultTo(0);
    // Vertraulichkeits-Bestätigung des Empfängers (Nachweis statt Unterschrift)
    t.timestamp('acked_at', { useTz: true });
    t.text('acked_name');
    t.text('acked_ip');
    t.timestamp('last_viewed_at', { useTz: true });
    t.timestamp('revoked_at', { useTz: true });
    t.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index('tenant_id'); t.index('project_id'); t.index('contact_id'); t.index('token');
  });

  await knex.raw(`ALTER TABLE share_links ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`ALTER TABLE share_links FORCE ROW LEVEL SECURITY`);
  await knex.raw(`
    CREATE POLICY tenant_isolation_share_links ON share_links
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::int)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`);
};

exports.down = async function (knex) {
  await knex.raw(`DROP POLICY IF EXISTS tenant_isolation_share_links ON share_links`);
  await knex.schema.dropTableIfExists('share_links');
};
