/** Changelog v0.377 (Neues Fundraising-Mandat Cavendish als Entwurf). */
const ENTRY = {
  version: 'v0.377', released_on: '2026-07-21',
  title: 'Neues Mandat: Cavendish (Green-Hydrogen Seed)',
  items: [
    'Neues Fundraising-Mandat „Cavendish" angelegt (anonymisiert): Deep-Tech-Seed für neuartige PEM-Elektrolyse-Stacks, Seed I (0,75 Mio. € bei 7,5 Mio. € Post-Money) plus Seed II (10 Mio. € bei 30 Mio. €)',
    'Als Entwurf angelegt zur Prüfung; Teaser (öffentlich) und Investment Memorandum (hinter Zugang) sind als Dokumente vorgesehen und werden in den Datenraum geladen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
