/** Changelog v0.376 (Fehler beim DSGVO-Löschen eines Kontakts behoben). */
const ENTRY = {
  version: 'v0.376', released_on: '2026-07-21',
  title: 'DSGVO-Löschung eines Kontakts wieder möglich',
  items: [
    'Das Anonymisieren eines Kontakts (Recht auf Vergessenwerden, Art. 17) brach mit „Interner Serverfehler" ab, weil zwei Pflichtfelder (Suchbranchen und Suchregionen) auf leer statt auf einen gültigen Leerwert gesetzt wurden',
    'Diese Felder werden jetzt korrekt geleert, die Löschung läuft wieder durch; die Prozesshistorie bleibt als Nachweis erhalten',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
