/** Changelog v0.305 (Fundraising-Gate: Unterlagen nach Freigabe statt nach NDA). */
const ENTRY = {
  version: 'v0.305', released_on: '2026-08-25',
  title: 'Startup-Finanzierung: Unterlagen nach Freigabe statt nach NDA',
  items: [
    'Bei Mandaten vom Typ Startup-Finanzierung ersetzt eine ausdrückliche Freigabe durch die Beratung das unterzeichnete NDA',
    'Der Investor fragt die Unterlagen an, die Freigabe entscheidet die Beratung je Einzelfall: so bleiben Wettbewerber draußen',
    'Nach der Freigabe sind Pitch Deck und Kurzprofil sichtbar, der Datenraum bleibt gesperrt und wird gesondert freigegeben',
    'Freigabe lässt sich jederzeit wieder entziehen; der Investor wird über die Freigabe per Mail informiert',
    'Bei M&A bleibt alles unverändert: dort gilt weiterhin das unterzeichnete NDA',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
