/** Changelog v0.336 (Sprint 29: Sicherheit und Datenschutz härten). */
const ENTRY = {
  version: 'v0.336', released_on: '2026-07-21',
  title: 'Sicherheit und Datenschutz härten (Sprint 29)',
  items: [
    'JWT-Schlüssel aus einer zentralen Quelle, in Produktion bricht der Start bei schwachem Schlüssel ab (fail-closed, Notausgang ALLOW_WEAK_JWT=1)',
    'Sicherheits-Header ergänzt: Content-Security-Policy und HSTS (bei Bedarf abschaltbar über CSP_DISABLED=1). CORS spiegelt keine fremde Origin mehr',
    'Sitzungen werden bei Passwort-Reset ungültig (Token-Version), ein zuvor gestohlenes Token gilt danach nicht mehr',
    'Nutzereingaben werden in Benachrichtigungs-Mails escaped (Schutz vor Content-Injection), E-Mail der Gegenseite erst nach angenommener Verbindung',
    'Inbound-Webhook mit zeitsicherem Vergleich und bevorzugtem Header statt Query-Parameter',
    'Neue Sicherheits-Testsuite, plus ein Datenschutz-, Aufbewahrungs- und Löschkonzept als Dokument',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
