/**
 * Sprint 15: Connect & Interaktion.
 * Erweitert messages um Mandatsbezug (project_id) und einen Nachrichtentyp
 * ('user' | 'system'), damit Prozess-Ereignisse (Intro, NDA, DD, LOI, Closing)
 * als Systemnachrichten in der Deal-Timeline des Chats erscheinen können.
 * RLS/tenant bleiben unverändert (Spalten erben die bestehende Policy).
 */
exports.up = async function (knex) {
  const hasProject = await knex.schema.hasColumn('messages', 'project_id');
  const hasType = await knex.schema.hasColumn('messages', 'type');
  await knex.schema.alterTable('messages', (t) => {
    if (!hasProject) t.integer('project_id').references('id').inTable('projects').onDelete('SET NULL');
    if (!hasType) t.text('type').notNullable().defaultTo('user'); // 'user' | 'system'
  });
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_messages_project_id ON messages (project_id)');
};

exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS idx_messages_project_id');
  const hasProject = await knex.schema.hasColumn('messages', 'project_id');
  const hasType = await knex.schema.hasColumn('messages', 'type');
  await knex.schema.alterTable('messages', (t) => {
    if (hasProject) t.dropColumn('project_id');
    if (hasType) t.dropColumn('type');
  });
};
