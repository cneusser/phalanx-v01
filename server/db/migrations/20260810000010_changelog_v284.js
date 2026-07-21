/** Changelog v0.284 (Cloudflare Turnstile Bot-Test). */
const ENTRY = {
  version: 'v0.284', released_on: '2026-07-21',
  title: 'Roboter-Test (Cloudflare Turnstile) bei Login und Registrierung',
  items: [
    'Login und Registrierung prüfen optional einen Cloudflare-Turnstile-Test (kostenlos), gegen Bots und automatisiertes Passwort-Durchprobieren',
    'Aktiv, sobald TURNSTILE_SITE_KEY und TURNSTILE_SECRET gesetzt sind; ohne Konfiguration unverändert',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
