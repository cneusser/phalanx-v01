/** Changelog-Eintrag v0.258 (Q&A-Optionen, Nutzer direkt ansprechen). */
const ENTRY = {
  version: 'v0.258', released_on: '2026-07-20',
  title: 'Q&A mit Optionen: und Nutzer direkt ansprechen',
  items: [
    'Q&A: Antwort wahlweise per E-Mail zustellen oder still speichern',
    'Häufige Fragen für alle Interessenten im Mandat sichtbar schalten (FAQ), der Fragesteller bleibt anonym',
    'Fragen löschen (z. B. Test- oder Dublettenfragen), Sichtbarkeit jederzeit wieder zurücknehmen',
    'Nutzerliste: Name öffnet die Kontaktansicht (Kontakt wird bei Bedarf automatisch angelegt)',
    'Nutzer direkt per E-Mail oder Plattform-Chat ansprechen, ohne Umweg',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
