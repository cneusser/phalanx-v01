/**
 * Sprint 22: Prozess-Mailvorlagen für die Käuferansprache.
 *
 * Die Texte selbst stehen in server/db/mailTemplateSeed.js (eine Quelle für alle
 * Migrationen). Hier bleibt nur das Schema.
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

const { TEMPLATES } = require('../mailTemplateSeed');

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
