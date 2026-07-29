/**
 * Automatische, strukturbasierte Nummerierung im Safe (analog 5.1.8).
 * Jede Datei/jeder Ordner bekommt eine Position 1..N innerhalb seines Ordners.
 * Die angezeigte Nummer ergibt sich aus den Positionen entlang der Ordnerkette.
 * Umsortieren ändert die Positionen, die Nummern werden automatisch neu berechnet.
 *
 * Backfill: bestehende Objekte je Ordner natürlich nach Name sortieren (damit
 * vorhandene, manuell vergebene Nummern wie 5.1.1 die Reihenfolge bestimmen).
 */
exports.up = async function (knex) {
  const has = await knex.schema.hasColumn('safe_items', 'position').catch(() => false);
  if (!has) await knex.schema.alterTable('safe_items', (t) => { t.integer('position').notNullable().defaultTo(0); });

  const rows = await knex('safe_items').select('id', 'project_id', 'parent_id', 'name').whereNull('deleted_at').catch(() => []);
  const groups = new Map();
  for (const r of rows) {
    const key = `${r.project_id}|${r.parent_id == null ? 'root' : r.parent_id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => String(a.name).localeCompare(String(b.name), 'de', { numeric: true, sensitivity: 'base' }));
    let pos = 1;
    for (const r of list) { await knex('safe_items').where({ id: r.id }).update({ position: pos++ }).catch(() => {}); }
  }
};

exports.down = async function (knex) {
  const has = await knex.schema.hasColumn('safe_items', 'position').catch(() => false);
  if (has) await knex.schema.alterTable('safe_items', (t) => { t.dropColumn('position'); }).catch(() => {});
};
