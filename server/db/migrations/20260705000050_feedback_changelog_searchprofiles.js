/**
 * Feedback (Änderungswünsche von Käufern/Verkäufern), Changelog (Versionshistorie
 * im Admin) und Suchprofile (gespeicherte Suchen der Käufer, Sprint 10).
 * Alle mit tenant_id + RLS (Sprint-5-Muster, fail closed).
 */
const CHANGELOG_SEED = [
  ['v0.234', '2026-07-05', 'Kommunikation & Sicherheit', [
    'Alle Kunden-E-Mails im Phalanx-Design mit Impressum-Footer',
    'Q&A: Direkt-Antwort für Berater, Antwort geht automatisch an den Fragenden',
    'Teaser- & Exposé-PDF mit sichtbarem Audit-Stempel (erstellt am / heruntergeladen von)',
    'Mobilnummer im Profil verpflichtend (Grundlage 2-Faktor-Authentifizierung)',
  ]],
  ['v0.231', '2026-07-05', 'Exposé-Builder', [
    'Strukturiertes Verkaufs-Exposé je Mandat (DUB-Eckdaten, Sektionen, Bildergalerie)',
    'Web-Exposé hinter dem NDA-Gate, PDF-Export mit Empfänger-Wasserzeichen',
    'Kaufpreisvorstellung automatisch aus der geprüften Bewertung',
  ]],
  ['v0.229', '2026-07-05', 'Container-Safe', [
    'Sichere Ablage ganzer Ordner, Bilder und beliebiger Dateien je Mandat',
    'Papierkorb, Versionierung, Prüfsummen; Speicher wahlweise Volume oder Cloudflare R2',
  ]],
  ['v0.228', '2026-07-05', 'Ausführliche Unternehmensbewertung', [
    'Geführte mehrstufige Bewertung mit Qualitäts-Scorecard und Kapitaldienst-Check',
    'Mehrseitiger PDF-Report; Admin-Review mit Mandatszuordnung',
  ]],
  ['v0.226', '2026-07-04', 'Bewertungsrechner', [
    'Öffentlicher, anonymer Unternehmenswert-Rechner als Lead-Magnet',
    'Werte-Korridor + PDF-Report; Branchen-Multiples im Admin pflegbar',
  ]],
  ['v0.224', '2026-07-04', 'Pipeline & Dokumente', [
    'Deal-Pipeline mit Drag & Drop; Dokument-Zugriffslevel nachträglich änderbar',
    'Signiertes NDA als Admin herunterladbar',
  ]],
];

exports.up = async function (knex) {
  // ── feedback ──────────────────────────────────────────────────────────────
  await knex.schema.createTable('feedback', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.text('role');
    t.text('category').notNullable().defaultTo('idea'); // idea | bug | change | other
    t.text('message').notNullable();
    t.text('status').notNullable().defaultTo('open');    // open | planned | done | declined
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index('tenant_id'); t.index('status');
  });

  // ── changelog ─────────────────────────────────────────────────────────────
  await knex.schema.createTable('changelog', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.text('version').notNullable();
    t.date('released_on');
    t.text('title').notNullable();
    t.text('items_json').notNullable().defaultTo('[]');
    t.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index('tenant_id');
  });

  // ── search_profiles (Käufer, Sprint 10) ────────────────────────────────────
  await knex.schema.createTable('search_profiles', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('name').notNullable();
    t.text('criteria_json').notNullable().defaultTo('{}'); // {industry, region, deal_type, mandate_type, search}
    t.text('notify_frequency').notNullable().defaultTo('instant'); // instant | daily | weekly | off
    t.timestamp('last_notified_at', { useTz: true });
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index('tenant_id'); t.index('user_id');
  });

  for (const table of ['feedback', 'changelog', 'search_profiles']) {
    await knex.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    await knex.raw(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    await knex.raw(`
      CREATE POLICY tenant_isolation_${table} ON ${table}
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true)::int)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`);
  }

  // Ältester zuerst einfügen → neuester bekommt die höchste id (Sortierung
  // released_on DESC, id DESC zeigt dann den neuesten Eintrag oben).
  for (const [version, date, title, items] of [...CHANGELOG_SEED].reverse()) {
    await knex('changelog').insert({ tenant_id: 1, version, released_on: date, title, items_json: JSON.stringify(items) });
  }
};

exports.down = async function (knex) {
  for (const table of ['search_profiles', 'changelog', 'feedback']) {
    await knex.raw(`DROP POLICY IF EXISTS tenant_isolation_${table} ON ${table}`);
    await knex.schema.dropTableIfExists(table);
  }
};
