/** Changelog-Eintrag v0.255 (Prozess-Mailvorlagen für die Käuferansprache). */
const ENTRY = {
  version: 'v0.255', released_on: '2026-07-17',
  title: 'Mailvorlagen für jeden Schritt im M&A-Prozess',
  items: [
    '11 fertige Vorlagen: Wiederaufnahme der Kommunikation, Erstansprache, Nachfassen, NDA, IM-Freigabe, Management-Gespräch, indikatives Angebot, Due Diligence, Absage, Prozessabschluss',
    'Versand an einen einzelnen Kontakt oder an eine Auswahl im Funnel, mit Live-Vorschau der echten Mail',
    'Platzhalter für Anrede, Mandat, Branche, Region, Umsatz, Frist; Eckdaten, Unterschrift und Rechtshinweis werden automatisch ergänzt',
    'Text pro Versand einmalig anpassbar, ohne die Vorlage zu ändern; Funnel-Stufe zieht auf Wunsch automatisch nach',
    'Neuer Admin-Tab „Mailvorlagen": alle Vorlagen einsehen, ändern, deaktivieren oder eigene ergänzen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
