/** Changelog v0.445 (Suche nach Wörtern, Verlauf je Firma). */
const ENTRY = {
  version: 'v0.445', released_on: '2026-10-03',
  title: 'Suche nach Wörtern, Verlauf je Firma',
  items: [
    'Die Suche nach "Bauer Daniel" fand nichts, die nach "Daniel Bauer" schon. Die ganze Eingabe wurde gegen jede Spalte einzeln gehalten, und kein Feld enthält beide Namen. Das ist der unangenehmste Fehlertyp in einer Kartei: Die Suche sagt nicht "weiß nicht", sondern "gibt es nicht"',
    'Jetzt wird die Eingabe in Wörter zerlegt, und jedes Wort muss irgendwo vorkommen, egal in welcher Spalte und Reihenfolge. "Bauer Daniel", "Daniel Bauer" und "bauer googlemail" finden dieselbe Person. Gilt für Kontakte, Firmen und die Kontensuche',
    'Platzhalterzeichen aus der Eingabe wirken nicht mehr als solche. Eine Suche nach einem Prozentzeichen lieferte vorher alles',
    'Der Verlauf eines Kontakts zeigt die Nachrichten aus der Plattform jetzt auch dann, wenn der CRM-Kontakt nicht mit dem Konto verknüpft ist. Die Verknüpfung wird über die Adresse hergestellt. Vorher blieb der Verlauf leer, obwohl im Nachrichtenfenster ein ganzes Gespräch stand',
    'Neu bei der Firma: ein gemeinsamer Verlauf über alle Ansprechpartner, auf Anforderung und auf eine Person eingrenzbar. Zu jedem Eintrag steht, von wem er stammt, sonst entstünde der Eindruck, die Firma selbst habe geschrieben',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
