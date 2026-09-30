/** Changelog v0.431 (Fehlermeldungen beim Upload kommen an). */
const ENTRY = {
  version: 'v0.431', released_on: '2026-09-30',
  title: 'Fehlermeldungen beim Upload kommen an',
  items: [
    'Der Exposé-Editor lädt jetzt wie der Datenraum, mit Fortschritt in Prozent. Bisher meldete er nur "Load failed", ohne den Status des Servers zu zeigen, und genau der fehlte zur Ursachensuche',
    'Antworten auf einen noch laufenden Upload werden zurückgehalten, bis der Browser zu Ende gesendet hat. Wer vorher antwortet, etwa weil die Sitzung abgelaufen ist, bringt die Verbindung zum Abriss: der Server sagt "Sitzung abgelaufen", und beim Nutzer kommt "Load failed" an',
    'Bleibt der Upload erfolglos, nennt die Meldung jetzt den HTTP-Status und die Antwort des Servers statt einer Vermutung',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
