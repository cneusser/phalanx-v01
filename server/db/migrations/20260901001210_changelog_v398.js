/** Changelog v0.398 (Eigenes Symbol im Browser-Tab). */
const ENTRY = {
  version: 'v0.398', released_on: '2026-08-03',
  title: 'Eigenes Symbol im Browser-Tab',
  items: [
    'Das Monogramm „CM" in den Markenfarben erscheint jetzt im Browser-Tab, im Lesezeichen und auf dem Homescreen',
    'Alle gängigen Größen sind hinterlegt: 16, 32, 180, 192 und 512 Bildpunkte sowie eine ICO-Datei für ältere Browser',
    'Ein Web-Manifest kam dazu, damit die Seite auf dem Handy wie eine App abgelegt werden kann',
    'Phalanx-OS-Anbindung: die Adresse der Phalanx-OS-Instanz ist fest hinterlegt und muss nicht mehr als Variable gesetzt werden',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
