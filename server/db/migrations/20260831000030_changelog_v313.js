/** Changelog v0.313 (Käufertypen erweitert und vereinheitlicht). */
const ENTRY = {
  version: 'v0.313', released_on: '2026-07-21',
  title: 'Käufertypen erweitert und vereinheitlicht',
  items: [
    'Neue Käufertypen: Business Angel und Venture Capital, getrennt vom allgemeinen Finanzinvestor',
    'Fehler behoben: Registrierung und CRM nutzten unterschiedliche Wertelisten, dadurch griff die Käufergruppen-Zielsteuerung bei Family Office, Nachfolger und Berater nicht',
    'Kanonische Liste jetzt überall gleich: strategisch, Finanzinvestor, Business Angel, Venture Capital, Family Office, Nachfolger, Privatperson, M&A-Berater mit Suchmandat',
    'Bestandsdaten mit dem Altwert „advisor" wurden auf „M&A-Berater mit Suchmandat" umgeschlüsselt',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
