/** Changelog-Eintrag v0.254 (Mandat FARADAY live + Kontakt-360°-Ansicht). */
const ENTRY = {
  version: 'v0.254', released_on: '2026-07-16',
  title: 'Mandat FARADAY ist live — und Kontakte auf einen Blick',
  items: [
    'FARADAY online: Elektro-/Energiedienstleister aus Bayern mit Pflichtnehmer-Stellung, 260+ Ladepunkten und 14 % EBIT-Marge — Eckdaten, Detailseite und vollständiges Exposé',
    'Kontakt-360°-Ansicht: Klick auf einen Namen im Funnel oder in der Kontaktliste öffnet Stammdaten, Mandate und die vollständige Historie',
    'Aktivitäten-Timeline: Einladung, Mailing, Erinnerung, Pflege-Link — und was zurückkam (geöffnet, eingewilligt, registriert, selbst gepflegt, widersprochen)',
    'Neuer Tab „Kontakte" im Admin-Dashboard mit Suche über Name, E-Mail und Unternehmen',
    'Funnel-Stufe und Beteiligten-Status direkt aus der Kontaktansicht änderbar',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
