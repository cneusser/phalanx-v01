/**
 * - projects.image_path: optionales Projektbild (Teaser-Ebene, anonymisiert wählen!)
 * - project_members: Nutzer-Zuordnung zu Projekten, zugeordnete Nutzer
 *   (z. B. Verkäufer) dürfen das Mandat über den Marktplatz pflegen.
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('projects', (t) => {
    t.text('image_path');
  });

  await knex.schema.createTable('project_members', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.integer('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('member_role').notNullable().defaultTo('editor'); // editor = darf Mandat pflegen
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['project_id', 'user_id']);
    t.index('tenant_id');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('project_members');
  await knex.schema.alterTable('projects', (t) => { t.dropColumn('image_path'); });
};
