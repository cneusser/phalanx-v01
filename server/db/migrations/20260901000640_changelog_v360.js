/** Changelog v0.360 (Deploy-Fix: optionale native Abhängigkeit canvas ausschließen). */
const ENTRY = {
  version: 'v0.360', released_on: '2026-07-21',
  title: 'Deploy-Fix: Build der Volltextsuche stabilisiert',
  items: [
    'Der Docker-Build ist fehlgeschlagen, weil die PDF-Bibliothek pdfjs-dist die optionale native Komponente „canvas" mitzog, die auf dem alpine-Image nicht kompiliert werden konnte',
    'Der Server-Install schließt jetzt optionale Abhängigkeiten aus (canvas wird für die reine Textextraktion nicht benötigt). Der Client-Build bleibt unverändert',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
