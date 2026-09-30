/** Changelog v0.440 (Zugang entziehen, und Rückmeldungen werden sichtbar). */
const ENTRY = {
  version: 'v0.440', released_on: '2026-09-30',
  title: 'Zugang entziehen, und Rückmeldungen werden sichtbar',
  items: [
    'Der wichtigste Punkt betrifft nicht nur einen Knopf: Rückmeldungen aus der Kontaktansicht wurden an die Seite darunter gereicht und von der Kontaktansicht selbst verdeckt. Jede Bestätigung und jede Fehlermeldung von dort war unsichtbar. Es sah aus, als passiere nichts, während in Wahrheit etwas gemeldet wurde',
    'Die Kontaktansicht hat jetzt eine eigene Meldungszeile, die über ihr liegt',
    '"Zugang entziehen" scheiterte an einer Prüfung, die für das Freigeben gedacht war. Freigeben ohne Nutzerkonto geht nicht, entziehen sehr wohl, und es ist die Richtung, die im Zweifel sofort funktionieren muss',
    'Gesucht wurde außerdem nur das über die E-Mail gefundene Konto. Die Freigabe selbst hängt an der Nutzerkennung des Kontakts. Weicht die Adresse ab, war der Zugang da und das Konto scheinbar nicht',
    'Die Rückfrage nennt jetzt die Person und sagt, was endet. Bestand gar kein Zugang, sagt der Server das, statt einen Erfolg zu melden, der nichts bewirkt hat',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
