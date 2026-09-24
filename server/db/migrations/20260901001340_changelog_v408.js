/** Changelog v0.408 (Venture Capital, Stapel setzt Sektor mit). */
const ENTRY = {
  version: 'v0.408', released_on: '2026-09-24',
  title: 'Venture Capital ergänzt, Stapel setzt den Sektor mit',
  items: [
    'Venture Capital steht jetzt neben Private Equity als Schwerpunkt der Finanz- und Beteiligungswirtschaft',
    'Ein Schwerpunkt ohne Sektor ging bisher nicht durch, und die Meldung nannte nur die Namen, nicht den Grund. Jetzt wird der Sektor in derselben Zeile mitgewählt und in einem Zug mitgesetzt',
    'Die Schwerpunktliste zeigt nur noch die Werte des gewählten Sektors, nicht mehr alle',
    'Abgelehnte Firmen kommen mit Grund zurück, zusammengefasst statt zehnmal derselbe Satz',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
