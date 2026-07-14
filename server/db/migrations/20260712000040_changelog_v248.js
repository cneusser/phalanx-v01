/** Changelog-Eintrag v0.248 (Sprint 19: CRM I: Unternehmen & Kontakte). */
const ENTRY = {
  version: 'v0.248', released_on: '2026-07-12',
  title: 'CRM: Unternehmen & Kontakte (Fundament des Sell-Side-CRM)',
  items: [
    'Zentrale Unternehmensdatenbank mit Stammdaten, Investitionskriterien, Käuferkategorie und Notizen',
    'Kontakte mit Entscheider-Kennzeichnung, Verantwortungsbereich und DSGVO-Einwilligung/Kontaktstatus',
    'Ein Kontakt kann mehreren Unternehmen zugeordnet sein, inkl. Historie früherer Positionen und Unternehmenswechsel',
    'Konzernverknüpfung (Mutter-, Tochter- und Beteiligungsgesellschaften)',
    'Dubletten-Erkennung (erkennt Rechtsform-, Schreib- und Umlaut-Varianten)',
    'CSV-Import und -Export für Unternehmen und Kontakte',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
