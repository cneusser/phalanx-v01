/** Changelog v0.424 (Abstürze kommen jetzt an). */
const ENTRY = {
  version: 'v0.424', released_on: '2026-09-28',
  title: 'Abstürze kommen jetzt an',
  items: [
    'Wenn eine Seite abstürzt, wird die Meldung an die Plattform übermittelt und erscheint im Verwaltungsbereich unter Berichte. Bisher stand sie nur in der Browserkonsole des Betroffenen, wo sie niemand sieht',
    'Die Fehlerseite nennt jetzt die Fassung. Ohne sie sagt ein Bildschirmfoto nicht, welcher Stand abgestürzt ist',
    'Dieselbe Meldung auf derselben Seite wird gezählt statt wiederholt, und lässt sich abhaken oder wieder öffnen',
    'Gespeichert wird nur, was zur Eingrenzung nötig ist: Meldung, Komponentenpfad, Seitenpfad, Fassung, Browser. Keine Parameter aus der Adresse, keine Seiteninhalte, keine Formulardaten',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
