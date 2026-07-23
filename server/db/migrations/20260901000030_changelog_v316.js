/** Changelog v0.316 (Bot-Test sperrt legitime Nutzer nicht mehr aus). */
const ENTRY = {
  version: 'v0.316', released_on: '2026-07-21',
  title: 'Anmeldung: Bot-Test sperrt niemanden mehr aus',
  items: [
    'Ein Kunde konnte sich nicht anmelden, weil der Cloudflare-Roboter-Test (Turnstile) bei ihm nicht lud und der Server die leere Antwort abwies',
    'Kann das Widget nicht laden oder abschließen (blockiertes Netzwerk, Cloudflare-Störung, Browser-Erweiterung), erscheint jetzt ein Hinweis und die Anmeldung ist trotzdem möglich',
    'Der Server lässt solche Fälle durch und protokolliert sie, statt zu blockieren. Der echte Roboter-Test bleibt für alle aktiv, deren Widget normal funktioniert',
    'Schutz vor Bots bleibt erhalten: Anmeldung braucht gültige Zugangsdaten, Registrierung braucht Bestätigung und Freigabe, beide sind zusätzlich raten-limitiert',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
