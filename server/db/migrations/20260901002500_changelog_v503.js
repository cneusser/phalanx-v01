/** Changelog v0.503 (zählen statt raten, und der Klarnamenbericht hält wieder). */
const ENTRY = {
  version: 'v0.503', released_on: '2026-11-24',
  title: 'Der Verwaltungsbereich zählt mit, und der Klarnamenbericht stürzt nicht mehr ab',
  items: [
    'Vorbereitung der Vereinfachung: Der Verwaltungsbereich hat einundzwanzig Reiter, und welche fünf täglich gebraucht werden, wusste niemand. Ab jetzt wird mitgezählt, welcher Reiter geöffnet wird, von wem und an welchem Tag. Keine Suchbegriffe, keine Mandate, keine Inhalte, eine Zeile je Person, Reiter und Tag',
    'Unter Berichte steht die Auswertung: Aufrufe, Tage mit Nutzung, Personen, letzter Aufruf, und gesondert die Reiter, die im Zeitraum nie geöffnet wurden. Nach einer Woche ist die Entscheidung, was oben bleibt, eine Rechnung statt eines Gefühls',
    'Der Klarnamenbericht antwortete für zwei von sechs Mandaten mit einem Serverfehler. Ursache war eine Maskierung, die nichts maskierte: eine Ebene Umschreibung zu viel. Ein Kontakt mit einer einzelnen Klammer im Namen ergab einen ungültigen Suchausdruck und riss die Prüfung des ganzen Mandats mit',
    'Dieselbe Ursache erzeugte die Falschmeldungen: Ein Punkt im Namen blieb der Platzhalter „ein beliebiges Zeichen", und „Dr. Ing" traf damit auch „Dr: Ing". Jetzt ist ein Punkt ein Punkt',
    'Scheitert die Prüfung eines Mandats künftig doch, steht das unter „Probleme" und die übrigen Mandate werden fertig geprüft. Ein leerer Bericht wäre bei einer Prüfung auf Personendaten die gefährlichste Antwort',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
