/** Changelog v0.301 (Exposé in der Dokumentenliste). */
const ENTRY = {
  version: 'v0.301', released_on: '2026-07-21',
  title: 'Exposé erscheint in der Unterlagen-Liste',
  items: [
    'Das Exposé steht jetzt bei den vertraulichen Unterlagen, mit „Ansehen" für die Web-Ansicht und „PDF" für den Export',
    'Es bleibt in seiner eigenen, gesicherten Ablage: keine Doppelspeicherung, dieselbe NDA-Sperre wie beim Informationsmemorandum',
    'Sichtbar erst nach unterzeichneter NDA und nur, wenn das Exposé veröffentlicht ist. Das Team sieht es immer',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
