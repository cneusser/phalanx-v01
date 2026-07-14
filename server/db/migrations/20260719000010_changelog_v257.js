/** Changelog-Eintrag v0.257 (Dashboard-Korrekturen, Funnel-Archiv, mehr Englisch). */
const ENTRY = {
  version: 'v0.257', released_on: '2026-07-19',
  title: 'Dashboard korrigiert, Funnel aufgeräumt, mehr Englisch',
  items: [
    'Q&A-Kachel führt jetzt in einen echten Q&A-Bereich: offene Fragen sehen und direkt beantworten',
    'Offene Wiedervorlagen sind anklickbar und zählen die echten CRM-Aufgaben (überfällige rot)',
    'Datenraum-Zugriffe zählen jetzt die tatsächlich protokollierten Zugriffe (Downloads, Exposé-Aufrufe, Dokumentenlisten)',
    'Deal-Funnel: laufende Mandate als Reiter, abgeschlossene und Entwürfe im Archiv-Klappmenü',
    'Englisch erweitert: Navigation, Marktplatz, Anmeldung und Fußzeile, inklusive Sprachwahl im Mobilmenü',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
