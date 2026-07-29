// Standard-Ordnerstruktur im Safe für alle bestehenden Mandate nachziehen (leer).
// Idempotent: vorhandene gleichnamige Top-Ordner werden nicht doppelt angelegt.
const FOLDERS = [
  'Teaser und Investment Memorandum',
  'Rechtliche Situation im Unternehmen',
  'Entwicklung und Übersicht des Unternehmens',
  'Mitarbeiter und Management',
  'Finanzierung',
  'Wirtschaftliche Entwicklung (GuV, Bilanz, Cash Flow)',
  'Leistungswirtschaftliche Entwicklung (Produkte, Kunden, Markt, Wettbewerb, Fertigung)',
  'Organisation und Steuerung',
  'Finanz- und Rechnungswesen, IT',
];

exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable('safe_items').catch(() => false);
  if (!hasTable) return;
  const projects = await knex('projects').select('id', 'tenant_id').catch(() => []);
  for (const p of projects) {
    for (const name of FOLDERS) {
      const exists = await knex('safe_items')
        .where({ project_id: p.id, is_folder: 1, name })
        .whereNull('parent_id').whereNull('deleted_at').first().catch(() => null);
      if (exists) continue;
      const posRow = await knex('safe_items')
        .where({ project_id: p.id }).whereNull('parent_id').whereNull('deleted_at')
        .max('position as m').first().catch(() => null);
      const pos = (posRow && posRow.m ? Number(posRow.m) : 0) + 1;
      await knex('safe_items').insert({
        tenant_id: p.tenant_id || 1, project_id: p.id, parent_id: null,
        name, is_folder: 1, position: pos, uploaded_by: null,
      }).catch(() => {});
    }
  }
};

exports.down = async function () { /* Ordnerstruktur bleibt erhalten */ };
