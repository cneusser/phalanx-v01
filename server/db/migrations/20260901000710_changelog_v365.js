/** Changelog v0.365 (Abgleich: unverknüpfte Kontakte einzeln einsehen und verknüpfen). */
const ENTRY = {
  version: 'v0.365', released_on: '2026-07-21',
  title: 'CRM-Abgleich: Kontakte vor dem Verknüpfen einsehen',
  items: [
    'Im Abgleich werden die noch nicht verknüpften Kontakte jetzt einzeln aufgelistet, mit Name, E-Mail und dem zugehörigen Konto',
    'Jeder Eintrag lässt sich einzeln öffnen (zur Prüfung) oder einzeln verknüpfen, neben dem Sammel-Button „Alle verknüpfen"',
    'Gibt es zu einer E-Mail mehrere Konten, wird auf manuelle Zuordnung im Kontakt hingewiesen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
