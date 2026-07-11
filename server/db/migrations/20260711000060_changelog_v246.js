/** Changelog-Eintrag v0.246 (Sprint 18 — Engagement-Mailings). */
const ENTRY = {
  version: 'v0.246', released_on: '2026-07-11',
  title: 'Newsletter, Folgen & Hinweise auf ähnliche Mandate',
  items: [
    'Newsletter zu neuen Mandaten — jederzeit im Profil abbestellbar',
    'Mandaten folgen: automatisch bei Interesse, zusätzlich manuell per Stern',
    'Updates zu gefolgten Mandaten per E-Mail (Änderungen, Exposé, Due Diligence, LOI, Abschluss)',
    'Hinweise auf ähnliche Mandate auf Basis Ihres bisherigen Interesses',
    'Neuer Bereich „Benachrichtigungen" im Profil — granular an-/abwählbar',
    '„Ähnliche Mandate" direkt auf der Mandatsseite',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
