/** Changelog v0.423 (Die Serverfassung wird wieder angezeigt). */
const ENTRY = {
  version: 'v0.423', released_on: '2026-09-28',
  title: 'Die Serverfassung wird wieder angezeigt',
  items: [
    'Unter "Auf dem Server" stand ein Fragezeichen. Die Versionsangabe wurde aus einer Datei gelesen, die gar nicht im ausgelieferten Paket liegt. Der Commit war deshalb sichtbar, die Version nicht',
    'Sie kommt jetzt aus einer Datei, die immer mitgeliefert wird. Alle drei Stellen, die eine Versionsnummer führen, müssen dieselbe nennen, sonst schlägt der Prüflauf an',
    'Ein Prüflauf sucht außerdem alle Dateien, die der Server im Betrieb außerhalb seines eigenen Verzeichnisses liest, und verlangt, dass sie mitgeliefert werden. Dieselbe Ursache hatte schon den Bau von v0.421 gebrochen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
