// ─────────────────────────────────────────────────────────────────────────────
// tenant_id kommt aus der Sitzung, nicht aus einer festen Eins (v0.496)
//
// Die Spalte tenant_id trug bisher überall die Vorbelegung 1. Zusammen mit
// hunderten Einfügungen, die sie gar nicht angeben, heisst das: Wer in einem
// anderen Mandanten arbeitet, schreibt entweder in den falschen (ohne die
// Richtlinie) oder scheitert an ihr (mit `WITH CHECK`).
//
// Die Vorbelegung richtet sich jetzt nach derselben Sitzungsvariable, auf die
// auch die Richtlinie schaut. Damit landet eine Einfügung ohne ausdrückliche
// Angabe im Mandanten der Anfrage, und zwar genau dort, wo sie auch wieder
// gelesen werden darf.
//
// Für den Plattformmandanten ändert sich nichts: Ohne gesetzte Variable und
// bei Mandant 1 bleibt es bei 1. Deshalb das COALESCE, es ist die Sicherung
// gegen eine fehlende Variable (zum Beispiel in Migrationen und Wartung).
// ─────────────────────────────────────────────────────────────────────────────

const VORBELEGUNG = `COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::int, 1)`;

async function tabellenMitMandant(knex) {
  const r = await knex.raw(`
    SELECT c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_name = c.table_name AND t.table_schema = c.table_schema
     WHERE c.table_schema = 'public'
       AND c.column_name = 'tenant_id'
       AND t.table_type = 'BASE TABLE'
     ORDER BY c.table_name`);
  return r.rows.map((x) => x.table_name);
}

exports.up = async function (knex) {
  const tabellen = await tabellenMitMandant(knex);
  for (const t of tabellen) {
    await knex.raw(`ALTER TABLE "${t}" ALTER COLUMN tenant_id SET DEFAULT ${VORBELEGUNG}`).catch((e) => {
      console.warn(`tenant_id-Vorbelegung für ${t} nicht gesetzt: ${e.message}`);
    });
  }
  console.log(`🏛  tenant_id-Vorbelegung aus der Sitzung gesetzt: ${tabellen.length} Tabellen.`);
};

exports.down = async function (knex) {
  const tabellen = await tabellenMitMandant(knex);
  for (const t of tabellen) {
    await knex.raw(`ALTER TABLE "${t}" ALTER COLUMN tenant_id SET DEFAULT 1`).catch(() => {});
  }
};
