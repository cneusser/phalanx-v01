/** Changelog v0.429 (Datenraum-Upload in Paketen, mit Fortschritt). */
const ENTRY = {
  version: 'v0.429', released_on: '2026-09-30',
  title: 'Datenraum-Upload in Paketen, mit Fortschritt',
  items: [
    'Bisher ging alles in einer einzigen Anfrage hoch. Bei 86 Dateien und fast 100 MB dauert das Minuten, und wenn die Verbindung dabei abreißt, war nichts angekommen',
    'Jetzt werden kleine Pakete nacheinander gesendet. Was durch ist, bleibt oben, auch wenn ein späteres Paket scheitert. Die Meldung sagt dann, wie viele Dateien angekommen sind',
    'Ein Fortschrittsbalken zeigt Prozent und Paket. Ein Balken, der sich bewegt, ist der Unterschied zwischen "es lädt" und "es hängt"',
    '"Load failed" erscheint nicht mehr. Stattdessen steht dort, was passiert ist, etwa dass die Verbindung nach drei Minuten abgerissen ist',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
