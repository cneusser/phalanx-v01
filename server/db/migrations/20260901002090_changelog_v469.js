/** Changelog v0.469 (Suchkriterien aus dem Schwerpunkt). */
const ENTRY = {
  version: 'v0.469', released_on: '2026-11-14',
  title: 'Aus dem Satz wird ein Kriterium',
  items: [
    'Der Abgleich im Deal-Funnel vergleicht Branchen und Regionen als Kennung. Recherchierte Kontakte tragen stattdessen einen Satz wie "Bau, Infrastruktur, Immobilien, Technologie". Damit griff der Abgleich bei genau der Gruppe nicht, für die er gedacht war',
    'In der Datenpflege lässt sich dieser Satz jetzt in Kennungen übersetzen. Der Trockenlauf zeigt je Kontakt, was entstünde; geschrieben wird erst auf ausdrücklichen Wunsch',
    'Bestehende Kriterien bleiben unangetastet. Wer Branchen gepflegt hat und keine Regionen, bekommt nur die Regionen ergänzt',
    'Was sich nicht eindeutig zuordnen lässt, wird genannt und nicht geraten. "Infrastruktur" hat in unserer Branchenliste keine Entsprechung und bekommt auch keine',
    'Deutsch und Englisch werden gelesen, Mehrzahl stört nicht, und ein Bruchstück darf Branche und Region zugleich nennen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
