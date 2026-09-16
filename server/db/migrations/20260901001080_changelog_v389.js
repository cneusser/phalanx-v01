/** Changelog v0.389 (Kennzahlen-Kacheln sauber formatiert). */
const ENTRY = {
  version: 'v0.389', released_on: '2026-07-25',
  title: 'Kennzahlen-Kacheln sauber formatiert',
  items: [
    'Cavendish: Die Kacheln zeigten „STAKE 10" und „POST-MONEY 7500000", weil die Werte als nackte Zahlen hinterlegt waren. Jetzt stehen dort „10 %", „€ 7,5 Mio." und „€ 0,75 Mio."',
    'Sicherheitsnetz: Steht in einem Kennzahlen-Feld versehentlich eine reine Zahl, wird sie in der Anzeige automatisch als Prozentwert oder Eurobetrag formatiert; Bandbreiten und Zusätze wie „~26 %" oder „€ 1 bis 2 Mio." bleiben unverändert',
    'Cavendish: Der Ortsbezug „Baltic coast" ist aus dem Inserat entfernt, der Sitz wird nur noch als „Germany" genannt',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
