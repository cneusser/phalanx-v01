/** Changelog v0.380 (Willkommensmail + Newsletter-Filter neue Kontakte). */
const ENTRY = {
  version: 'v0.380', released_on: '2026-07-21',
  title: 'Willkommensmail und Re-Invite neuer Kontakte',
  items: [
    'Nach der Registrierung geht automatisch eine Willkommensmail raus, die in vier Schritten erklärt, wie es weitergeht (Marktplatz, NDA zeichnen, Unterlagen und Datenraum, Gespräch), mit Button in den Marktplatz',
    'Newsletter kann jetzt auf neue Kontakte der letzten 6 Wochen eingegrenzt werden, um frische Leads gezielt erneut auf die offenen Projekte hinzuweisen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
