/** Changelog v0.362 (Nachfolge-Matches prominenter + Erklärung, Erinnerungs-Vorlage). */
const ENTRY = {
  version: 'v0.362', released_on: '2026-07-21',
  title: 'Nachfolge: Matches prominenter, mit Erklärung, plus Erinnerungs-Vorlage',
  items: [
    'Die passenden Nachfolge-Mandate stehen jetzt ganz oben im Profil und sind deutlich hervorgehoben (Match-Wert als große Kachel mit Farbskala)',
    'Neuer Hilfe-Punkt „Wie wird das berechnet?" erklärt die Übereinstimmung (Basis 10, Branche bis 45, Region bis 30, Umsatz bis 15 Prozentpunkte)',
    'Neue Mail-Vorlage „Erinnerung: Nachfolge-Profil ausfüllen" für die freundliche Aufforderung an bereits registrierte Nachfolge-Interessenten',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
