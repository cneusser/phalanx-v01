/** Changelog v0.385 (Vorschaubild fuer geteilte Links). */
const ENTRY = {
  version: 'v0.385', released_on: '2026-07-22',
  title: 'Vorschaubild fuer geteilte Links (LinkedIn, WhatsApp und Co.)',
  items: [
    'Wird ein CapitalMatch-Link auf LinkedIn, in WhatsApp, per Mail oder auf X geteilt, erscheint jetzt eine gebrandete Vorschaugrafik mit Logo und der Einladung zur kostenlosen Registrierung',
    'Dafuer wurden Open-Graph- und Twitter-Metadaten hinterlegt, die auch ohne JavaScript von den Vorschau-Robots gelesen werden',
    'Hinweis: LinkedIn speichert Vorschauen zwischen; ueber den LinkedIn Post Inspector laesst sich die Vorschau fuer eine URL neu einlesen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
