/** Changelog v0.427 (Klarnamen aufspüren, Rücksprung im Exposé, Kennzahl repariert). */
const ENTRY = {
  version: 'v0.427', released_on: '2026-09-29',
  title: 'Klarnamen aufspüren, Rücksprung im Exposé, Kennzahl repariert',
  items: [
    'Neue Prüfung im Verwaltungsbereich: Sie sucht Personennamen in allem, was ein Interessent zu sehen bekommt, also Exposé, Mandatsangaben, Dateinamen im Datenraum und Q&A. Abgeglichen wird gegen die Namen, die zum Mandat bekannt sind, dazu Anreden, Titel, E-Mail-Adressen und Telefonnummern',
    'Sie meldet nur und ändert nichts. Manches ist gewollt, etwa der Name des Beraters, und Unterlagen automatisch zu schwärzen wäre gefährlicher als das Problem',
    'Wenn Teile nicht gelesen werden können, steht das im Bericht. Ein leeres Ergebnis darf bei einer Prüfung auf Personendaten nicht wie "alles sauber" aussehen',
    'Der Rücksprung aus dem Exposé-Editor führt zum Mandat statt in die Verwaltungsübersicht',
    'Die Kennzahl "Bewertungs-Leads" auf der Übersicht war immer leer: Sie fragte eine Tabelle ab, die es nicht gibt. Ein Prüflauf vergleicht Abfragen jetzt gegen das tatsächliche Schema',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
