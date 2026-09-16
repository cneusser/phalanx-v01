/**
 * Cavendish: Kennzahlen-Kacheln korrekt formatieren.
 *
 * Beim Anlegen (20260901000890) wurden drei Felder als rohe Zahlen gespeichert,
 * obwohl die Kacheln formatierten Freitext erwarten ("€ 3,5 Mio.", "~26 %").
 * Auf dem Inserat stand dadurch "STAKE 10" und "POST-MONEY 7500000".
 *
 * Zusätzlich der bei der Feedback-Einarbeitung (20260901000970) übersehene
 * Ortsbezug: "Baltic coast" sollte nach Rückmeldung des Mandanten raus, der Sitz
 * wird nur noch als "Germany" genannt.
 * Idempotent: greift nur, wenn das Mandat existiert.
 */
const WERTE = {
  investment_needed: '€ 0,75 Mio.',
  equity_stake: '10 %',
  post_money_valuation: '€ 7,5 Mio.',
  region: 'Germany, DACH core market',
  location_city: 'Germany',
};

exports.up = async function (knex) {
  const p = await knex('projects').where({ codename: 'Cavendish' }).first().catch(() => null);
  if (!p) return;
  await knex('projects').where({ id: p.id }).update(WERTE).catch(() => {});
};

exports.down = async function (knex) {
  const p = await knex('projects').where({ codename: 'Cavendish' }).first().catch(() => null);
  if (!p) return;
  await knex('projects').where({ id: p.id }).update({
    investment_needed: '750000', equity_stake: '10', post_money_valuation: '7500000',
    region: 'Germany (Baltic coast), DACH core market', location_city: 'Northern Germany',
  }).catch(() => {});
};
