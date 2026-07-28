/** Changelog v0.324 (Nachfolge-Profil). */
const ENTRY = {
  version: 'v0.324', released_on: '2026-07-21',
  title: 'Nachfolge-Profil zum Selbstpflegen',
  items: [
    'Nachfolge-Interessierte haben jetzt ein eigenes Profil (angelehnt an den Fragebogen CH-NF-03): berufliche Erfahrung, Erfahrung in Sondersituationen, gesuchte Region und Branche, Umsatzgröße, MBI-Szenario, Eigenkapital und Verfügbarkeit',
    'Erreichbar über den Menüpunkt „Nachfolge-Profil" (nur für Nachfolge-Interessierte), jederzeit änderbar, vertraulich',
    'Das Profil ist die Grundlage für das kommende Matching gegen Nachfolge-Mandate',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
