/**
 * Sprint 4: Sicherer Datenraum + Admin-CRM.
 *
 * - qa_threads: Q&A-Modul je Deal (Frage des Interessenten, Antwort des Beraters)
 * - tasks: Aufgaben je Deal (due_date, owner) für das CRM
 * (permissions-Tabelle existiert seit Sprint 2 und wird jetzt scharf genutzt)
 */

exports.up = async function (knex) {
  await knex.schema.createTable('qa_threads', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    t.integer('buyer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('question').notNullable();
    t.text('answer');
    t.text('status').notNullable().defaultTo('open'); // open | answered
    t.timestamp('asked_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('answered_at', { useTz: true });
    t.integer('answered_by').references('id').inTable('users').onDelete('SET NULL');
    t.index(['project_id', 'buyer_id']);
    t.index('tenant_id');
  });
  await knex.raw(`ALTER TABLE qa_threads ADD CONSTRAINT qa_threads_status_check CHECK (status IN ('open','answered'))`);

  await knex.schema.createTable('tasks', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('project_id').references('id').inTable('projects').onDelete('CASCADE');
    t.text('title').notNullable();
    t.date('due_date');
    t.integer('owner_id').references('id').inTable('users').onDelete('SET NULL');
    t.text('status').notNullable().defaultTo('open'); // open | done
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('done_at', { useTz: true });
    t.index('tenant_id');
    t.index(['status', 'due_date']);
  });
  await knex.raw(`ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('open','done'))`);
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('tasks');
  await knex.schema.dropTableIfExists('qa_threads');
};
