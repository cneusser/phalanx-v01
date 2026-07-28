/** Changelog v0.326 (Nachfolge-Matching und Admin-Liste). */
const ENTRY = {
  version: 'v0.326', released_on: '2026-07-21',
  title: 'Nachfolge-Matching und Interessenten-Liste',
  items: [
    'Nachfolge-Interessierte sehen auf ihrer Profilseite jetzt passende Nachfolge-Mandate mit einem Richtwert in Prozent (nach Branche, Region und Umsatz) und einer kurzen Begründung',
    'Je vollständiger das Profil, desto genauer die Übereinstimmung. Die Liste aktualisiert sich nach dem Speichern',
    'Neuer Admin-Reiter „Nachfolge": alle Nachfolge-Interessierten mit Interesse, Branchenfokus, Region, Umsatz und Profilstatus, filterbar nach Umsatz, Szenario und Freitext',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
