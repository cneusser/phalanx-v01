/** Changelog-Eintrag v0.247 (Sprint 19a: Mandats-Einladungen mit Rollen & Funnel). */
const ENTRY = {
  version: 'v0.247', released_on: '2026-07-12',
  title: 'Kontakte zu Mandaten einladen: als Betrachter oder Pflegender',
  items: [
    'Pflegende können per E-Mail neue Kontakte zu einem Mandat einladen',
    'Zwei Rollen: „Betrachter" (nur lesen) und „Pflegender" (bearbeiten, Exposé, Unterlagen)',
    'Einladungs-Funnel: eingeladen → geöffnet → angenommen; Erinnerung und Widerruf möglich',
    'Eingeladene ohne Konto legen direkt eines an und sind sofort startklar (keine Wartezeit auf Freigabe)',
    'Rollen jederzeit änderbar (Betrachter ↔ Pflegender), Zugriff jederzeit entziehbar',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
