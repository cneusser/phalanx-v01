/**
 * Strukturierte Umsatzklasse am Mandat, damit der Umsatz beim Nachfolge-Matching
 * beidseitig als saubere Auswahl vorliegt (gleiche Bänder wie im Nachfolge-Profil).
 * Die bisherige Freitext-Anzeige revenue_band bleibt unberührt.
 *
 * Bänder: '<1' | '1-3' | '3-10' | '10-30' | '>30' (Mio. Euro) | NULL (unbekannt)
 */
function classify(revenueBand) {
  const nums = String(revenueBand || '').replace(/\./g, '').replace(/,/g, '.').match(/\d+(\.\d+)?/g);
  if (!nums) return null;
  const rv = Math.max(...nums.map(Number));
  if (!isFinite(rv)) return null;
  if (rv < 1) return '<1';
  if (rv < 3) return '1-3';
  if (rv < 10) return '3-10';
  if (rv < 30) return '10-30';
  return '>30';
}

exports.up = async function (knex) {
  const has = await knex.schema.hasColumn('projects', 'revenue_class').catch(() => false);
  if (!has) await knex.schema.alterTable('projects', (t) => { t.text('revenue_class'); });
  // Bestehende Mandate aus dem Freitext-Umsatzband klassifizieren.
  const rows = await knex('projects').select('id', 'revenue_band').catch(() => []);
  for (const r of rows) {
    const cls = classify(r.revenue_band);
    if (cls) await knex('projects').where({ id: r.id }).update({ revenue_class: cls }).catch(() => {});
  }
};

exports.down = async function (knex) {
  const has = await knex.schema.hasColumn('projects', 'revenue_class').catch(() => false);
  if (has) await knex.schema.alterTable('projects', (t) => { t.dropColumn('revenue_class'); }).catch(() => {});
};
