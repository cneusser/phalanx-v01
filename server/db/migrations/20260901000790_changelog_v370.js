/** Changelog v0.370 (Login-freier Nachfolge-Fragebogen über den Pflege-Link). */
const ENTRY = {
  version: 'v0.370', released_on: '2026-07-21',
  title: 'Login-freier Nachfolge-Fragebogen über den Pflege-Link',
  items: [
    'Eingeladene können ihren Nachfolge-Fragebogen jetzt ohne Konto ausfüllen, direkt über den persönlichen Pflege-Link (Erfahrung, Zielbranchen, Region, Umsatzgröße, Eigenkapital, Szenario mit oder ohne Beteiligung)',
    'Die Angaben werden bei einer späteren Registrierung automatisch ins Nachfolge-Profil übernommen, und der Kontakt wird als Nachfolge-Interessent geführt',
    'So lässt sich der Fragebogen mit einem Klick teilen, ohne dass sich die Person erst anmelden muss',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
