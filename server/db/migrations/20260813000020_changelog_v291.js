/** Changelog v0.291 (Stufe A DUB-Benchmark: Käufertyp + Funnel bis Closing). */
const ENTRY = {
  version: 'v0.291', released_on: '2026-08-13',
  title: 'Käufertyp am Kontakt, Funnel bis Closing',
  items: [
    'Neuer Käufertyp am Kontakt: strategisch, Finanzinvestor, Privatperson, M&A-Berater mit Suchmandat, als Filter und Badge im CRM',
    'Deal-Funnel um transaktionsnahe Stufen erweitert: Match, LOI eingereicht, LOI unterschrieben, Namensnennung, Signing, Closing',
    'Bestandsdaten und Automatik auf die neue Stufenleiter angehoben',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
