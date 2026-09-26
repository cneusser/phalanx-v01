/** Changelog v0.412 (Die öffentlichen Seiten sprechen beide Sprachen). */
const ENTRY = {
  version: 'v0.412', released_on: '2026-09-26',
  title: 'Die öffentlichen Seiten sprechen beide Sprachen',
  items: [
    'Marktplatz, Nachfolge-Netzwerk und Kontakt sind jetzt zweisprachig, zusammen mit Startseite, Anmelden und Registrieren',
    'Sechs öffentliche Seiten mit einem englischen Browser geprüft: kein deutsches Wort auf der englischen Oberfläche, kein englisches auf der deutschen',
    'Der Stand einer Anfrage heißt nicht mehr fest "NDA angefordert", sondern wird übersetzt und ausgeschrieben: Vertraulichkeitsvereinbarung angefordert',
    '156 Schlüssel im Einsatz, alle mit englischer Fassung. Die Prüfung läuft bei jedem Testlauf mit',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
