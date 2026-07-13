/**
 * Mail-Ausgangsbuch (Outbox) + zwei neue Systemvorlagen.
 *
 *   email_log   Jede versendete Mail mit Empfänger, Betreff, Typ, Bezug (Kontakt,
 *               Nutzer, Mandat) und dem tatsächlich versendeten HTML. Damit ist im
 *               Admin nachvollziehbar, WAS wann an WEN rausging — und der
 *               Audit-Trail nennt die Mail-Art (MAIL_SENT).
 *
 *   Vorlagen    'profile_link'  Aufforderung zur Selbstpflege (der „Pflege-Link")
 *               'crm_invite'    DSGVO-Einladung auf die Plattform (Double-Opt-in)
 *               → ab sofort im Admin unter „Mailvorlagen" änderbar.
 */
const TEMPLATES = [
  {
    tenant_id: 1, key: 'profile_link', name: 'Pflege-Link (Selbstpflege der Kontaktdaten)',
    stage: null, is_system: 1, is_active: 1, sort: 200,
    subject: 'Ihre Angaben bei der Phalanx GmbH — bitte kurz prüfen',
    body:
      'damit wir Sie nur mit wirklich passenden Transaktionen ansprechen, bitten wir Sie um eine kurze Prüfung Ihrer bei uns ' +
      'gespeicherten Angaben — Kontaktdaten, Position, Branchen- und Regionenfokus sowie Ticketgröße.\n\n' +
      'Über den Button sehen Sie genau, was wir gespeichert haben, und können es selbst korrigieren. Der Link ist persönlich ' +
      'und 60 Tage gültig.\n\n' +
      'Dort legen Sie auch fest, wie (oder ob) wir Sie künftig kontaktieren dürfen — bis hin zur vollständigen Abmeldung.',
    cta_label: 'Angaben prüfen', cta_target: 'profile',
  },
  {
    tenant_id: 1, key: 'crm_invite', name: 'Plattform-Einladung mit Einwilligung (DSGVO)',
    stage: 1, is_system: 1, is_active: 1, sort: 210,
    subject: 'Einladung zu CapitalMatch — Ihre Bestätigung erforderlich',
    body:
      '{{berater}} (Phalanx GmbH) lädt Sie zu CapitalMatch ein — der Plattform, über die wir unsere M&A-Mandate strukturiert ' +
      'und vertraulich bereitstellen: Kurzprofile, Unterlagen nach NDA, Datenraum und direkte Kommunikation an einem Ort.\n\n' +
      'Wichtig (DSGVO): Wir legen kein Konto für Sie an und senden Ihnen keine weiteren Informationen, solange Sie nicht ' +
      'ausdrücklich zustimmen. Bitte bestätigen Sie Ihre Einwilligung über den Button. Sie können sie jederzeit mit Wirkung ' +
      'für die Zukunft widerrufen.\n\n' +
      'Möchten Sie nicht kontaktiert werden, ignorieren Sie diese E-Mail einfach — oder klicken Sie auf der Bestätigungsseite ' +
      'auf „Nicht kontaktieren".',
    cta_label: 'Einwilligung bestätigen', cta_target: 'consent',
  },
];

exports.up = async function (knex) {
  await knex.schema.createTable('email_log', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.text('to_email').notNullable();
    t.text('subject');
    // invite | profile_link | campaign | template | process | qa | system …
    t.text('mail_type').notNullable().defaultTo('system');
    t.text('template_key');
    t.integer('contact_id').references('id').inTable('crm_contacts').onDelete('SET NULL');
    t.integer('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.integer('project_id').references('id').inTable('projects').onDelete('SET NULL');
    t.text('body_html');
    // sent | failed
    t.text('status').notNullable().defaultTo('sent');
    t.text('error');
    t.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index('tenant_id'); t.index('mail_type'); t.index('contact_id'); t.index('created_at');
  });

  await knex.raw('ALTER TABLE email_log ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE email_log FORCE ROW LEVEL SECURITY');
  await knex.raw(`
    CREATE POLICY tenant_isolation_email_log ON email_log
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::int)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`);

  for (const tpl of TEMPLATES) {
    const exists = await knex('mail_templates').where({ tenant_id: 1, key: tpl.key }).first().catch(() => null);
    if (!exists) await knex('mail_templates').insert(tpl).catch(() => {});
  }
};

exports.down = async function (knex) {
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_email_log ON email_log');
  await knex.schema.dropTableIfExists('email_log');
  for (const tpl of TEMPLATES) {
    await knex('mail_templates').where({ tenant_id: 1, key: tpl.key }).del().catch(() => {});
  }
};
