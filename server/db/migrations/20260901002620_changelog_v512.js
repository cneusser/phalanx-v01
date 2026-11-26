/** Changelog v0.512 (ein leeres Ergebnis sagt jetzt, warum es leer ist). */
const ENTRY = {
  version: 'v0.512', released_on: '2026-11-26',
  title: 'Die Vorschläge sagen jetzt auch, wenn sie nichts zu sagen haben',
  items: [
    'Bei einer Firma endete die Anfrage mit „Die Antwort war kein lesbares JSON". Der wahre Grund stand in der Antwort selbst: Sie war abgeschnitten. Das Modell weiß über bekannte Unternehmen viel, schreibt lange Begründungen und läuft in die Obergrenze. Die Obergrenze ist verdoppelt, die Begründung auf fünfzehn Wörter begrenzt, und ein Abbruch wird als solcher gemeldet',
    'Eine leere Liste konnte zweierlei heißen: Das Modell wusste nichts, oder seine Antwort wurde verworfen. Beides sah gleich aus. Jetzt steht dabei, was geantwortet und was verworfen wurde, mit Grund',
    'Zwei Prüfungen waren zu streng. „unter 5 Mio. EUR" und „ca. 12 Mio. EUR" wurden verworfen, also genau die vorsichtigen Formulierungen, die bei einer Größenordnung die ehrlichsten sind. Und eine Webadresse ohne „https" wird jetzt ergänzt statt weggeworfen',
    'Erste Ergebnisse aus der Teststufe: Für Beiersdorf kamen Hamburg, die Webadresse und eine Umsatzspanne von 5 bis 10 Mrd. EUR, für Goldbeck Nordrhein-Westfalen und die Webadresse. Für einen Datensatz namens „Privatinvestor" kam nichts, und das ist die richtige Antwort',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
