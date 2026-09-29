/** Changelog v0.428 (Uploads sagen, warum sie scheitern). */
const ENTRY = {
  version: 'v0.428', released_on: '2026-09-29',
  title: 'Uploads sagen, warum sie scheitern',
  items: [
    '"Upload-Fehler: Load failed" war keine Meldung der Plattform, sondern die Art, wie der Browser sagt, dass die Verbindung abgerissen ist. Der Grund stand nirgends',
    'Ursache: Die Prüfung von Dateityp und Größe läuft, während der Browser noch sendet. Passte etwas nicht, wurde die Verbindung geschlossen, bevor eine Antwort ankam',
    'Jetzt wird die Anfrage zu Ende gelesen und dann im Klartext geantwortet, etwa "Die Datei ist zu groß. Erlaubt sind bis zu 50 MB." Das gilt für alle Uploadwege, auch im Datenraum und beim Import',
    'Dateityp und Größe werden außerdem schon im Browser geprüft. Eine falsche Datei kostet damit keine Minuten Wartezeit mehr',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
