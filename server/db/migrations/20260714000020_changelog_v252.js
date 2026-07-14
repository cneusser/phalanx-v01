/** Changelog-Eintrag v0.252 (CRM IV: Kontakt-Selbstpflege-Portal). */
const ENTRY = {
  version: 'v0.252', released_on: '2026-07-14',
  title: 'Kontakte pflegen ihre Daten selbst',
  items: [
    'Persönlicher, befristeter Link: Kontakte sehen, was gespeichert ist, und korrigieren es selbst',
    'Pflegbar sind Kontaktdaten, Position, Brancheninteressen, geografischer Fokus, Ticketgröße und Investitionsschwerpunkt',
    'Kommunikationswunsch wählbar, bis hin zur vollständigen Abmeldung (DSGVO)',
    'Jede Änderung wird protokolliert (Vorher/Nachher); wahlweise direkte Übernahme oder interne Freigabe',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
