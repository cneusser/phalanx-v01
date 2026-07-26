/** Changelog v0.319 (Konsolidierung: Prüfschleifen, Sicherheits-Härtung). */
const ENTRY = {
  version: 'v0.319', released_on: '2026-07-21',
  title: 'Prüfschleifen und Sicherheits-Härtung',
  items: [
    'Neue gebündelte Prüfschleife: „npm run check" prüft Texte und alle Testsuites in einem Lauf, „npm run check:full" zusätzlich den Client-Build. Ein roter Test bricht den Lauf jetzt ab',
    'Sicherheit: Die versehentlich mitgeführte server/.env wird nicht mehr im Repository verfolgt, eine sichere .env.example dokumentiert die Variablen',
    'Der Start-Sicherheitscheck erkennt jetzt auch den alten Beispiel-Wert und zu kurze JWT-Schlüssel und weist auf die nötige Rotation hin',
    'Hinweis zur Investoren-Kennzahl: „21+" zählt bewusst nur freigegebene, aktive Investoren, nicht alle Konten',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
