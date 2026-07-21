/** Changelog v0.304 (Freie Nachricht aus der Plattform, Antworten an den Absender). */
const ENTRY = {
  version: 'v0.304', released_on: '2026-07-21',
  title: 'Nachricht aus der Plattform schreiben',
  items: [
    'Neuer Knopf „Nachricht schreiben" am Kontakt: freier Text, ohne Vorlage, wahlweise mit Mandatsbezug',
    'Antworten gehen per Antwort-Adresse direkt an den Absender, nicht an die Plattform',
    'Jede Nachricht steht sofort in der Kontakt-Historie unter „Aktivitäten" und im Mail-Ausgang',
    'Damit lässt sich der Schriftverkehr auch mit Gegenübern dokumentieren, die nie ein Konto anlegen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
