/**
 * Rollen werden pflegbar.
 *
 * Bisher lag die Rechte-Matrix ausschließlich im Code. Das war sicher, aber starr:
 * Ein neues Teammitglied mit einem Zuschnitt zwischen „Assistenz" und „Berater"
 * ließ sich nicht abbilden. Jetzt liegen die Rollen in der Datenbank und sind im
 * Admin per Häkchen änderbar — inklusive eigener Rollen.
 *
 * Sicherheitsanker, die NICHT verhandelbar sind:
 *   · super_admin hat immer alle Rechte und lässt sich nicht beschneiden.
 *   · Systemrollen können geändert, aber nicht gelöscht werden.
 *   · Vergebbar sind nur Rechte aus dem bekannten Katalog (kein Freitext).
 *   · Jede Änderung landet im Audit-Trail.
 */
const DEFAULTS = require('../../middleware/permissions');

exports.up = async function (knex) {
  await knex.schema.createTable('roles', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').notNullable().defaultTo(1).references('id').inTable('tenants');
    t.text('key').notNullable();
    t.text('label').notNullable();
    t.text('description');
    t.text('permissions_json').notNullable().defaultTo('[]');
    t.integer('is_system').notNullable().defaultTo(0);   // nicht löschbar
    t.integer('is_staff').notNullable().defaultTo(1);    // interne Rolle (Admin-Zugang)
    t.integer('sort').notNullable().defaultTo(100);
    t.integer('updated_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['tenant_id', 'key']);
    t.index('tenant_id');
  });

  await knex.raw('ALTER TABLE roles ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE roles FORCE ROW LEVEL SECURITY');
  await knex.raw(`
    CREATE POLICY tenant_isolation_roles ON roles
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::int)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)`);

  // Startbestand: exakt die bisherige Code-Matrix
  const seed = [
    ['super_admin', 'Administrator', 'Vollzugriff auf alles, inklusive Nutzerverwaltung und Birdview.', 1, 10],
    ['tenant_owner', 'Mandanten-Eigentümer', 'Vollzugriff im eigenen Mandanten.', 1, 20],
    ['advisor', 'Berater', 'Eigene Mandate führen, CRM nutzen, Mails versenden.', 1, 30],
    ['assistant', 'Assistenz', 'Pflegen und vorbereiten — ohne Mailversand und ohne Löschrechte.', 1, 40],
    ['analyst', 'Analyst', 'Nur lesen und auswerten.', 1, 50],
    ['buyer', 'Investor / Käufer', 'Externer Nutzer — kein Zugriff auf interne Bereiche.', 0, 60],
    ['seller', 'Verkäufer', 'Externer Nutzer — pflegt eigene Mandate.', 0, 70],
  ];
  for (const [key, label, description, isStaff, sort] of seed) {
    const exists = await knex('roles').where({ tenant_id: 1, key }).first().catch(() => null);
    if (!exists) {
      await knex('roles').insert({
        tenant_id: 1, key, label, description,
        permissions_json: JSON.stringify(DEFAULTS.permissionsFor(key)),
        is_system: 1, is_staff: isStaff, sort,
      });
    }
  }

  // Eigene Rollen brauchen freie Rollen-Namen — der CHECK auf users.role fällt.
  // Validiert wird stattdessen gegen die roles-Tabelle (in der Route).
  await knex.raw('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check').catch(() => {});
};

exports.down = async function (knex) {
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_roles ON roles');
  await knex.schema.dropTableIfExists('roles');
  await knex.raw(`
    ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('super_admin','tenant_owner','advisor','assistant','analyst','buyer','seller'))
  `).catch(() => {});
};
