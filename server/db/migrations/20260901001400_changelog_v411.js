/** Changelog v0.411 (Eine Palette, eine Schrift, zwei Sprachen). */
const ENTRY = {
  version: 'v0.411', released_on: '2026-09-26',
  title: 'Eine Palette, eine Schrift, zwei Sprachen',
  items: [
    'Die Farben der ganzen Plattform stehen jetzt auf der Phalanx-Palette. 188 Farbwerte in 58 Dateien wurden umgestellt, das Neon-Hellblau kommt nur noch im Logo vor',
    'Überschriften laufen überall in Georgia, Bedienelemente in Arial. Beide Schriften sind auf jedem System vorhanden, es wird nichts von einem fremden Server nachgeladen',
    'Startseite, Anmelden und Registrieren sind vollständig zweisprachig. Auf Englisch steht kein deutsches Wort mehr, geprüft mit einem englischen Browser',
    'Die Texte der Startseite stehen deutsch und englisch nebeneinander in einer Datei. Wer die eine Fassung ändert, sieht die andere daneben',
    'Neue Prüfung sprachpflege.test.js: Sie findet Schlüssel ohne englische Fassung und Dateien, die die Übersetzung benutzen, ohne sie eingebunden zu haben. Letzteres wäre ein Absturz der Seite gewesen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
