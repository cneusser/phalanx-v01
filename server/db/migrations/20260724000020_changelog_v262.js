/** Changelog-Eintrag v0.262 (Sprint 13 — CRM V: Rollen, 2FA, DSGVO). */
const ENTRY = {
  version: 'v0.262', released_on: '2026-07-24',
  title: 'Rollen, Zwei-Faktor-Schutz und DSGVO-Rechte',
  items: [
    'Zwei-Faktor-Authentifizierung (TOTP) mit Authenticator-App und einmaligen Backup-Codes',
    'Fünf interne Rollen mit klaren Rechten: Administrator, Mandanten-Eigentümer, Berater, Assistenz (pflegt, versendet nicht), Analyst (liest nur)',
    'Berater und Assistenz sehen nur ihre eigenen Mandate — nicht mehr alles',
    'Neuer Admin-Bereich „Rollen & Rechte": die Matrix ist offen einsehbar; Rollen werden im Nutzer-Tab zugewiesen',
    'DSGVO: vollständige Datenauskunft je Kontakt (Art. 15) und Recht auf Vergessenwerden (Art. 17) — Nachweise bleiben erhalten',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
