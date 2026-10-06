/** Changelog v0.447 (Adressfelder nach deutschem Standard). */
const ENTRY = {
  version: 'v0.447', released_on: '2026-10-06',
  title: 'Adressfelder nach deutschem Standard',
  items: [
    'Firmenanschriften stehen jetzt in getrennten Feldern: Straße, Hausnummer, Adresszusatz, Postleitzahl, Ort, Land. Die Feldnamen sind dieselben wie in Phalanx OS und Expert Network, sonst ließen sich die Bestände nicht vergleichen',
    'Postleitzahl und Hausnummer sind Text, nicht Zahl. 01067 wäre als Zahl 1067, und "28a" ist keine Zahl',
    'Die Anzeigezeile wird berechnet und nirgends gespeichert. Eine gespeicherte Zeile veraltet, sobald jemand ein Feld ändert, und niemand bemerkt es',
    'Vorhandene einzeilige Adressen werden nicht automatisch zerlegt. Im Verwaltungsbereich gibt es einen Trockenlauf, der sichere Fälle vorschlägt und unsichere nur meldet: ohne Hausnummer, Postfach, mehrere Zahlen, ausländisches Format, zwei Adressen in einem Feld. Übernommen wird auf ausdrückliche Anforderung, und das alte Feld bleibt als Rückweg stehen',
    'Phalanx OS führt den Bestand. Eine Anschrift kommt von dort herein und wird nie zurückgeschrieben. Wer hier etwas korrigiert, erscheint in einer Liste zum Nachtragen; eine von Hand gepflegte Anschrift wird nicht überschrieben, sondern die Abweichung gemeldet',
    'Codename und Anschrift verlassen das Haus nie zusammen. Gegenüber Käufern ist der Codename die Anonymisierung, und eine Straße mit Hausnummer führt in einer Minute zum Handelsregister',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
