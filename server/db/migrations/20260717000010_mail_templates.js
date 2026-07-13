/**
 * Sprint 22 — Prozess-Mailvorlagen für die Käuferansprache.
 *
 *   mail_templates   Je Prozessschritt (Funnel-Stufe) eine professionelle, sofort
 *                    versendbare Vorlage: Betreff, Text mit Platzhaltern, CTA-Ziel.
 *                    Vollständig im Admin einsehbar und änderbar; Systemvorlagen
 *                    können angepasst, aber nicht gelöscht werden (Reset möglich).
 *
 * Platzhalter (werden beim Versand gefüllt):
 *   {{anrede}} {{vorname}} {{nachname}} {{unternehmen}} {{position}}
 *   {{mandat}} {{branche}} {{region}} {{umsatz}} {{ebitda}} {{transaktionsart}}
 *   {{berater}} {{berater_mail}} {{berater_tel}} {{frist}} {{datum}}
 *
 * CTA-Ziele: project (Mandatsseite) · consent (Einwilligung/Double-Opt-in) ·
 *            profile (Selbstpflege) · none (kein Button)
 */

const T = (key, name, stage, subject, body, cta_label, cta_target, sort) => ({
  key, name, stage, subject, body, cta_label, cta_target, sort,
  is_system: 1, is_active: 1, tenant_id: 1,
});

const TEMPLATES = [
  T('reengage', 'Wiederaufnahme der Kommunikation', 2,
    '[Vertraulich] {{mandat}} — wir nehmen den Faden wieder auf',
    'wir hatten uns zum Mandat {{mandat}} bereits ausgetauscht, danach ist der Kontakt auf beiden Seiten eingeschlafen — dafür bitte ich um Nachsicht.\n\n' +
    'Der Prozess läuft weiter, und Ihr Profil passt aus unserer Sicht unverändert gut zu diesem Vorhaben: {{branche}}, {{region}}, Umsatz {{umsatz}}, {{transaktionsart}}.\n\n' +
    'Bevor wir die Liste der Gesprächspartner enger ziehen, möchte ich Ihnen die Gelegenheit geben, wieder einzusteigen. Ein Klick genügt — oder eine kurze Nachricht, wenn das Thema für Sie erledigt ist. Beides ist völlig in Ordnung.',
    'Mandat ansehen', 'project', 10),

  T('first_approach', 'Erstansprache (Longlist)', 1,
    '[Vertraulich] {{mandat}} — vertrauliche Vorabinformation',
    'im Auftrag unseres Mandanten begleiten wir eine Transaktion, die Ihrem uns bekannten Suchprofil entspricht: {{branche}}, {{region}}, Umsatz {{umsatz}}, {{transaktionsart}}.\n\n' +
    'Wir stellen Ihnen das Vorhaben zunächst anonymisiert vor. Die Identität des Unternehmens geben wir erst nach Unterzeichnung einer Vertraulichkeitsvereinbarung preis.\n\n' +
    'Wenn das für Sie relevant klingt, stelle ich Ihnen den anonymen Teaser gerne unmittelbar zur Verfügung.',
    'Kurzprofil ansehen', 'consent', 20),

  T('follow_up', 'Nachfassen ohne Rückmeldung', 1,
    '[Vertraulich] {{mandat}} — kurze Nachfrage',
    'ich komme kurz auf meine Ansprache zum Mandat {{mandat}} zurück. Erfahrungsgemäß gehen solche Nachrichten in einer vollen Woche unter — deshalb diese eine Erinnerung.\n\n' +
    'Der Prozess läuft; ein Einstieg ist derzeit noch ohne Nachteil möglich. Falls das Vorhaben nicht in Ihr Raster passt, genügt eine kurze Absage — dann nehme ich Sie aus dem Verteiler.',
    'Kurzprofil ansehen', 'project', 30),

  T('nda_request', 'NDA anfordern', 3,
    '[Vertraulich] {{mandat}} — Vertraulichkeitsvereinbarung',
    'vielen Dank für Ihr Interesse an {{mandat}}. Für den nächsten Schritt benötigen wir eine unterzeichnete Vertraulichkeitsvereinbarung.\n\n' +
    'Sie können die NDA direkt auf der Plattform digital gegenzeichnen — ohne Medienbruch, ohne Ausdruck. Unmittelbar danach werden das Information Memorandum und die weiteren Unterlagen für Sie freigeschaltet.',
    'NDA digital zeichnen', 'project', 40),

  T('nda_reminder', 'NDA ausstehend — Erinnerung', 3,
    '[Vertraulich] {{mandat}} — NDA noch offen',
    'die Vertraulichkeitsvereinbarung zu {{mandat}} liegt noch unterzeichnet bei Ihnen. Solange sie nicht vorliegt, können wir die Unterlagen leider nicht freigeben — das ist eine Auflage unseres Mandanten, keine Formalie unsererseits.\n\n' +
    'Die Zeichnung dauert auf der Plattform weniger als zwei Minuten. Bei inhaltlichen Anmerkungen zur NDA rufen Sie mich gerne direkt an.',
    'NDA digital zeichnen', 'project', 50),

  T('im_release', 'IM / Unterlagen freigegeben', 4,
    '[Vertraulich] {{mandat}} — Information Memorandum freigeschaltet',
    'vielen Dank für die unterzeichnete Vertraulichkeitsvereinbarung. Das Information Memorandum zu {{mandat}} sowie die weiteren Unterlagen sind ab sofort für Sie freigeschaltet.\n\n' +
    'Das Dokument enthält Geschäftsmodell, Marktposition, Organisation, die Finanzhistorie und den Planungsrahmen. Fragen zum Unternehmen stellen Sie am besten direkt über die Plattform — so sind Antwort und Historie für beide Seiten dokumentiert.\n\n' +
    'Für eine erste Einschätzung nehme ich mir gerne 20 Minuten am Telefon.',
    'Unterlagen öffnen', 'project', 60),

  T('meeting_invite', 'Management-Gespräch anbieten', 5,
    '[Vertraulich] {{mandat}} — Management-Gespräch',
    'nachdem Sie die Unterlagen zu {{mandat}} gesichtet haben, ist der nächste Schritt das Gespräch mit dem Management.\n\n' +
    'Der Inhaber steht für ein persönliches oder virtuelles Treffen zur Verfügung. Erfahrungsgemäß entscheidet dieses Gespräch mehr über den Deal als jede weitere Unterlage — es geht um Betrieb, Team, Kunden und die Übergabe.\n\n' +
    'Nennen Sie mir zwei bis drei Zeitfenster in den kommenden zwei Wochen; ich stimme sie mit dem Mandanten ab.',
    'Mandat ansehen', 'project', 70),

  T('loi_request', 'Indikatives Angebot anfordern', 6,
    '[Vertraulich] {{mandat}} — indikatives Angebot bis {{frist}}',
    'nach den bisherigen Gesprächen zu {{mandat}} treten wir in die nächste Phase ein: Wir bitten die verbliebenen Interessenten um ein unverbindliches, indikatives Angebot bis zum {{frist}}.\n\n' +
    'Wir erwarten keine Präzision auf den Euro, sondern eine belastbare Bandbreite mit den tragenden Annahmen: Bewertungsansatz und Multiple, Struktur (Share Deal, cash- und debt-free), Finanzierung, Zeitplan, Umgang mit Team und Standort sowie die vorgesehene Rolle des Inhabers nach Closing.\n\n' +
    'Auf dieser Basis entscheidet der Mandant, mit wem er in die Due Diligence geht. Für Rückfragen zu den Annahmen stehe ich Ihnen jederzeit zur Verfügung.',
    'Unterlagen öffnen', 'project', 80),

  T('dd_start', 'Due Diligence startet', 7,
    '[Vertraulich] {{mandat}} — Freigabe zur Due Diligence',
    'unser Mandant hat auf Basis Ihres indikativen Angebots entschieden, mit Ihnen in die Due Diligence zu gehen. Herzlichen Glückwunsch — und vielen Dank für die bisherige Professionalität im Prozess.\n\n' +
    'Der Datenraum ist für Ihr Team freigeschaltet. Bitte senden Sie uns Ihre Q&A-Liste gebündelt über die Plattform; wir beantworten sie in festen Zyklen, damit der Betrieb des Unternehmens nicht leidet.\n\n' +
    'Den Zeitplan bis Signing stimmen wir in einem kurzen Call zu Beginn ab.',
    'Datenraum öffnen', 'project', 90),

  T('rejection', 'Absage im Prozess (höflich)', 8,
    '[Vertraulich] {{mandat}} — Entscheidung unseres Mandanten',
    'vielen Dank für Ihr Interesse an {{mandat}} und für die Zeit, die Sie in den Prozess investiert haben.\n\n' +
    'Unser Mandant hat sich entschieden, die Gespräche mit einer anderen Partei fortzuführen. Das ist keine Bewertung Ihres Hauses — in diesem Fall gaben Struktur und Zeitplan den Ausschlag.\n\n' +
    'Ich halte Ihr Suchprofil gerne aktiv und melde mich, sobald ein passendes Mandat in die Ansprache geht. Sollte der laufende Prozess wider Erwarten nicht zum Abschluss kommen, komme ich auf Sie zurück.',
    'Suchprofil aktualisieren', 'profile', 100),

  T('dormant_close', 'Kontakt schließen (kein Interesse)', 0,
    '[Vertraulich] {{mandat}} — wir nehmen Sie heraus',
    'Sie haben zu {{mandat}} keine Rückmeldung gegeben — das werte ich als Desinteresse und nehme Sie aus diesem Prozess heraus. Weitere Nachrichten zu diesem Mandat erhalten Sie nicht.\n\n' +
    'Damit unsere künftige Ansprache besser trifft: Über den Link unten können Sie in einer Minute hinterlegen, welche Branchen, Regionen und Ticketgrößen für Sie überhaupt relevant sind — oder sich vollständig abmelden.',
    'Suchprofil pflegen oder abmelden', 'profile', 110),
];

exports.up = async function (knex) {
  await knex.schema.createTable('mail_templates', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.text('key').notNullable();
    t.text('name').notNullable();
    t.integer('stage');                 // zugehörige Funnel-Stufe (0–8), optional
    t.text('subject').notNullable();
    t.text('body').notNullable();       // Fließtext mit Platzhaltern, Absätze durch Leerzeile
    t.text('cta_label');
    t.text('cta_target').notNullable().defaultTo('project');  // project | consent | profile | none
    t.integer('is_active').notNullable().defaultTo(1);
    t.integer('is_system').notNullable().defaultTo(0);
    t.integer('sort').notNullable().defaultTo(500);
    t.integer('updated_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['tenant_id', 'key']);
    t.index('tenant_id'); t.index('stage');
  });

  await knex.raw('ALTER TABLE mail_templates ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE mail_templates FORCE ROW LEVEL SECURITY');
  await knex.raw(`
    CREATE POLICY tenant_isolation_mail_templates ON mail_templates
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::int)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`);

  for (const tpl of TEMPLATES) {
    const exists = await knex('mail_templates').where({ tenant_id: 1, key: tpl.key }).first().catch(() => null);
    if (!exists) await knex('mail_templates').insert(tpl);
  }

  // Kampagnen dürfen künftig auf eine Vorlage verweisen
  const has = await knex.schema.hasColumn('crm_campaigns', 'template_key');
  if (!has) {
    await knex.schema.alterTable('crm_campaigns', (t) => { t.text('template_key'); });
  }
};

exports.down = async function (knex) {
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_mail_templates ON mail_templates');
  await knex.schema.dropTableIfExists('mail_templates');
  await knex.schema.alterTable('crm_campaigns', (t) => { t.dropColumn('template_key'); }).catch(() => {});
};

exports.TEMPLATES = TEMPLATES;
