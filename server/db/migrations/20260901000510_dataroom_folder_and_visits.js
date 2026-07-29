// Käufer-Datenraum: (a) Ordnerpfad bestehender Dokumente aus der Safe-Struktur
// nachziehen, (b) Besuchstabelle für die „neu seit letztem Besuch"-Markierung.
exports.up = async function (knex) {
  // (a) folder-Spalte sicherstellen (Altbestände) und aus safe_items befüllen.
  const hasFolder = await knex.schema.hasColumn('documents', 'folder').catch(() => false);
  if (!hasFolder) await knex.schema.alterTable('documents', (t) => { t.text('folder'); });

  const hasSafe = await knex.schema.hasTable('safe_items').catch(() => false);
  if (hasSafe) {
    // Elternkette je Ordner einmalig auflösen (id -> {name, parent_id}).
    const folders = await knex('safe_items').select('id', 'name', 'parent_id')
      .where('is_folder', 1).whereNull('deleted_at').catch(() => []);
    const byId = new Map(folders.map((f) => [f.id, f]));
    const pathOf = (parentId) => {
      const parts = []; let cur = parentId; let g = 0;
      while (cur && g++ < 50) { const f = byId.get(cur); if (!f) break; parts.unshift(f.name); cur = f.parent_id; }
      return parts.join('/');
    };
    // Für jede Datei im Safe den Pfad bestimmen und gleichnamige Dokumente ohne folder setzen.
    const files = await knex('safe_items').select('project_id', 'name', 'parent_id')
      .where('is_folder', 0).whereNull('deleted_at').catch(() => []);
    for (const f of files) {
      const folder = pathOf(f.parent_id);
      if (!folder) continue;
      await knex('documents')
        .where({ project_id: f.project_id, filename: f.name })
        .andWhere(function () { this.whereNull('folder').orWhere('folder', ''); })
        .update({ folder }).catch(() => {});
    }
  }

  // (b) Besuchstabelle je Nutzer und Mandat.
  const hasVisits = await knex.schema.hasTable('dataroom_visits').catch(() => false);
  if (!hasVisits) {
    await knex.schema.createTable('dataroom_visits', (t) => {
      t.increments('id').primary();
      t.integer('tenant_id').notNullable().defaultTo(1);
      t.integer('user_id').notNullable();
      t.integer('project_id').notNullable();
      t.timestamp('last_seen_at', { useTz: true }).defaultTo(knex.fn.now());
      t.unique(['user_id', 'project_id']);
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('dataroom_visits').catch(() => {});
};
