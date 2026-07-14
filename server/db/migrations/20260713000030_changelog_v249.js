/** Changelog-Eintrag v0.249 (Sprint 20: Deal-Funnel, Kontakt-Import, DSGVO-Einladung, Teaser). */
const ENTRY = {
  version: 'v0.249', released_on: '2026-07-13',
  title: 'Deal-Funnel, Kontakt-Import & DSGVO-Einladung',
  items: [
    'Neutraler Teaser als One-Pager (PDF): für angemeldete Nutzer herunterladbar',
    'Sell-Side-Funnel je Mandat: Longlist → Angesprochen → NDA → IM → Gespräch → LOI → Abschluss (Kanban mit Drag & Drop)',
    'Verweildauer je Stufe und automatische Warnung bei stagnierenden Vorgängen',
    'Erster Schwung echter Kontakte importiert (Unternehmen, Ansprechpartner, Funnel-Stand)',
    'Einladung von Kontakten auf die Plattform streng DSGVO-konform: Double-Opt-in, ein Konto entsteht erst nach ausdrücklicher Einwilligung',
    'Widerspruch wird dauerhaft respektiert („nicht kontaktieren")',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
