/** Changelog v0.283 (E-Mail- und Chat-Verlauf am Kontakt). */
const ENTRY = {
  version: 'v0.283', released_on: '2026-08-09',
  title: 'Kompletter E-Mail- und Chat-Verlauf am Kontakt',
  items: [
    'Die Kontakt-Historie zeigt jetzt jede an den Kontakt versendete Mail (Ansprache, Prozess, Einladung, NDA, System) mit Betreff, Art und Status',
    'Alle Plattform-Chat-Nachrichten des Kontakts erscheinen ebenfalls am Kontakt',
    'Kein Doppeleintrag: Kampagnen-Erstversand kommt aus dem Ausgangsbuch, die Kampagne liefert nur Reminder und Reaktionen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
