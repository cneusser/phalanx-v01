/**
 * Phalanx-OS-Anbindung (SSO + Datenpool-Sync).
 *
 * Fügt idempotent hinzu:
 *   users.phalanx_os_sub        stabile Verknüpfung des SSO-Kontos (OIDC 'sub')
 *   crm_contacts.pool_contact_id  Herkunfts-ID im Phalanx-OS-Datenpool
 *   crm_contacts.pool_email       nicht werbeeinwilligungs-Adresse aus dem Pool
 *                                 (nur Einzelkorrespondenz, nie Kampagnen; darum
 *                                  bewusst getrennt von der Spalte email)
 *   phalanx_sync_log            Protokoll je Sync-Lauf (Verwaltung)
 *   phalanx_pool_review         Warteliste „Zuordnung prüfen" (mehrdeutige Namen)
 *   phalanx_pool_outbox         Rückmeldungs-Warteschlange mit Wiederholung
 *
 * Diese Betriebstabellen tragen keine RLS-Policy: Sie sind Tenant-1-Systemdaten
 * und werden ausschließlich serverseitig gelesen und geschrieben.
 */
exports.up = async function (knex) {
  const addColumn = async (table, name, build) => {
    const has = await knex.schema.hasColumn(table, name).catch(() => false);
    if (!has) await knex.schema.alterTable(table, build);
  };

  await addColumn('users', 'phalanx_os_sub', (t) => t.text('phalanx_os_sub'));
  await addColumn('crm_contacts', 'pool_contact_id', (t) => t.text('pool_contact_id'));
  await addColumn('crm_contacts', 'pool_email', (t) => t.text('pool_email'));

  // Eindeutigkeit der SSO-Verknüpfung (mehrere NULL erlaubt).
  await knex.raw(
    `CREATE UNIQUE INDEX IF NOT EXISTS users_phalanx_os_sub_uq ON users (phalanx_os_sub) WHERE phalanx_os_sub IS NOT NULL`
  ).catch(() => {});
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS crm_contacts_pool_contact_id_idx ON crm_contacts (pool_contact_id) WHERE pool_contact_id IS NOT NULL`
  ).catch(() => {});

  if (!(await knex.schema.hasTable('phalanx_sync_log'))) {
    await knex.schema.createTable('phalanx_sync_log', (t) => {
      t.increments('id').primary();
      t.integer('tenant_id').notNullable().defaultTo(1);
      t.text('trigger').notNullable().defaultTo('auto');   // auto | manual
      t.text('status').notNullable().defaultTo('running');  // running | ok | error
      t.integer('read_count').notNullable().defaultTo(0);
      t.integer('new_count').notNullable().defaultTo(0);
      t.integer('enriched_count').notNullable().defaultTo(0);
      t.integer('ambiguous_count').notNullable().defaultTo(0);
      t.integer('error_count').notNullable().defaultTo(0);
      t.text('error_text');
      t.timestamp('started_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      t.timestamp('finished_at', { useTz: true });
      t.index('started_at');
    });
  }

  if (!(await knex.schema.hasTable('phalanx_pool_review'))) {
    await knex.schema.createTable('phalanx_pool_review', (t) => {
      t.increments('id').primary();
      t.integer('tenant_id').notNullable().defaultTo(1);
      t.text('pool_contact_id').notNullable();
      t.text('display_name');
      t.text('email');
      t.text('linkedin_url');
      t.text('reason').notNullable().defaultTo('ambiguous_name'); // ambiguous_name
      t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      t.timestamp('resolved_at', { useTz: true });
      t.integer('resolved_by').references('id').inTable('users').onDelete('SET NULL');
      t.unique(['tenant_id', 'pool_contact_id']);
    });
  }

  if (!(await knex.schema.hasTable('phalanx_pool_outbox'))) {
    await knex.schema.createTable('phalanx_pool_outbox', (t) => {
      t.increments('id').primary();
      t.integer('tenant_id').notNullable().defaultTo(1);
      t.integer('contact_id').notNullable().references('id').inTable('crm_contacts').onDelete('CASCADE');
      t.text('source_id').notNullable();                  // crm-<id>
      t.text('status').notNullable().defaultTo('pending'); // pending | done | error
      t.integer('attempts').notNullable().defaultTo(0);
      t.text('last_error');
      t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      t.unique(['tenant_id', 'contact_id']);
      t.index('status');
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('phalanx_pool_outbox');
  await knex.schema.dropTableIfExists('phalanx_pool_review');
  await knex.schema.dropTableIfExists('phalanx_sync_log');
  await knex.raw(`DROP INDEX IF EXISTS crm_contacts_pool_contact_id_idx`).catch(() => {});
  await knex.raw(`DROP INDEX IF EXISTS users_phalanx_os_sub_uq`).catch(() => {});
  const dropColumn = async (table, name) => {
    const has = await knex.schema.hasColumn(table, name).catch(() => false);
    if (has) await knex.schema.alterTable(table, (t) => t.dropColumn(name));
  };
  await dropColumn('crm_contacts', 'pool_email');
  await dropColumn('crm_contacts', 'pool_contact_id');
  await dropColumn('users', 'phalanx_os_sub');
};
