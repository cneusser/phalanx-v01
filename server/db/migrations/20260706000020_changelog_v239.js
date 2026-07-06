/** Changelog-Eintrag v0.239 (öffentliche Roadmap aktualisiert, CRM aufgenommen). */
const ENTRY = {
  version: 'v0.239', released_on: '2026-07-06',
  title: 'Roadmap aktualisiert – Beziehungs- & Deal-Management (CRM) geplant',
  items: [
    'Öffentliche Roadmap aktualisiert: Käufer-Cockpit, Nachrichten & Mobil-Optimierung als „Verfügbar" markiert',
    'Neuer geplanter Punkt: Beziehungs- & Deal-Management (CRM) für transparente Deal-Verfolgung',
    'Changelog und Roadmap werden ab sofort bei jeder Änderung automatisch mitgeführt',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
