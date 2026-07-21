/** Changelog v0.306 (Unterlagen-Link ohne Registrierung). */
const ENTRY = {
  version: 'v0.306', released_on: '2026-07-21',
  title: 'Unterlagen-Link ohne Registrierung',
  items: [
    'Persönlicher Link auf genau eine Unterlage, ohne Konto und ohne NDA',
    'Vor dem Öffnen bestätigt der Empfänger die Vertraulichkeit mit seinem Namen, das wird mit Zeit und IP protokolliert',
    'Ablaufdatum frei wählbar, optional eine Höchstzahl an Abrufen, jederzeitiger Widerruf',
    'Die Datei trägt ein Wasserzeichen mit dem Namen des Empfängers, jeder Abruf steht im Protokoll',
    'Im Kontakt sichtbar: welche Links vergeben sind, wie oft sie geöffnet wurden und von wem sie bestätigt wurden',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
