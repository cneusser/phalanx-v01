/** Changelog v0.470 (Branchenliste zweisprachig). */
const ENTRY = {
  version: 'v0.470', released_on: '2026-11-14',
  title: 'Die Branchenliste spricht jetzt auch Englisch',
  items: [
    'Die Branchenliste nach NACE war nur deutsch. Wer die Oberfläche auf Englisch gestellt hatte, stand im Auswahlfeld plötzlich vor deutschen Begriffen, und zwar auf dem Hauptweg beim Anlegen eines Mandats',
    'Alle 48 Zeilen und alle acht Abschnitte haben jetzt eine englische Fassung. Angezeigt wird die gewählte Sprache, gespeichert wird weiterhin der deutsche Wert',
    'Das ist Absicht: Mandate, Suchprofile und die Zuordnung der Synonyme hängen an genau diesen Zeichenketten. Eine Liste, die beim Speichern andere Werte schreibt, hätte den Bestand zerschnitten',
    'Branche und Abschnitt erscheinen übersetzt auf der Startseite, im Marktplatz und im Mandatsdetail',
    'Die übrigen deutschen Texte in Verwaltung, CRM und Datenraum bleiben deutsch. Das sind interne Arbeitsflächen; eine englische Fassung dort kostet Pflege und hilft niemandem',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
