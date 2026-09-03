/** Changelog v0.379 (Anmeldung entstört, Onboarding und NDA-Führung klarer). */
const ENTRY = {
  version: 'v0.379', released_on: '2026-07-21',
  title: 'Anmeldung, Onboarding und NDA-Führung',
  items: [
    'Anmeldefehler behoben: Der Sicherheitscheck (Cloudflare) wird nach einem Fehlversuch jetzt zurückgesetzt, sodass die Anmeldung nicht mehr mit „Bitte bestätigen Sie den Sicherheitscheck" hängen bleibt, obwohl das Kästchen „Erfolg" zeigt',
    'Neue jederzeit sichtbare Anleitung „So funktioniert es in 4 Schritten" auf dem Käufer-Dashboard, mit direktem Weg in den Marktplatz',
    'NDA-Führung klarer: Wer den Zugang angefordert hat, wird jetzt aktiv zum digitalen Zeichnen geführt (Button „NDA jetzt digital zeichnen") statt nur auf eine Prüfung zu warten',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
