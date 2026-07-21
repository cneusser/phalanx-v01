/** Changelog v0.300 (Mailmerge je Empfänger, Vorlagen-Stufen korrigiert). */
const ENTRY = {
  version: 'v0.300', released_on: '2026-07-21',
  title: 'Individuelle Begründung je Empfänger, Vorlagen-Stufen korrigiert',
  items: [
    'Neuer Platzhalter „warum": im Versand-Dialog schreiben Sie je Empfänger eine eigene Begründung, die in die Mail einfließt',
    'Die Vorschau zeigt die Begründung des ersten Empfängers direkt mit',
    'Fehler behoben: der Vorlagen-Versand stufte Kontakte auf „Freigabe Verkäufer" statt auf „Angesprochen"',
    'Fehler behoben: die in den Vorlagen hinterlegten Zielstufen stammten noch von der alten Funnel-Leiter und wurden nachgezogen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
