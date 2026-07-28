/** Changelog v0.323 (Nachfolge-Einladung: Anrede korrigiert). */
const ENTRY = {
  version: 'v0.323', released_on: '2026-07-21',
  title: 'Nachfolge-Einladung: saubere Anrede',
  items: [
    'Die Nachfolge-Einladung begrüßte doppelt und nannte den Namen zweimal. Jetzt steht die Anrede genau einmal, der Mailrahmen setzt Begrüßung und Unterschrift, die Vorlage nur den Text',
    'Aus einer eingefügten E-Mail wird nach Möglichkeit ein echter Name gebildet (z. B. michael.philipp wird zu Michael Philipp), sonst grüßen wir neutral',
    'Die Zeile „Ihre Anfrage haben wir über ... erhalten" erscheint nicht mehr bei selbst erzeugten Quellen wie Einladung, Recherche, Netzwerk oder Empfehlung',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
