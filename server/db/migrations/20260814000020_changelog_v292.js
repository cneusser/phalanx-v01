/** Changelog v0.292 (Stufe B DUB-Benchmark: Inserat-Wizard + Moderation). */
const ENTRY = {
  version: 'v0.292', released_on: '2026-07-21',
  title: 'Inserat-Wizard, Moderation und Lebenszyklus',
  items: [
    'Verkäufer erstellen ihr Inserat jetzt geführt in mehreren Schritten, mit Autosave als Entwurf und Vorschau vor dem Einreichen',
    'Neuer Prüf-Schritt: eingereichte Inserate stehen auf „in Prüfung" und gehen erst nach Freigabe live',
    'Lebenszyklus: Verkäufer können ihr aktives Inserat pausieren, wieder aktivieren oder schließen',
    'Admin-Prüf-Queue: eingereichte Inserate freigeben oder mit Notiz zurückweisen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
