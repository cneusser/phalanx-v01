/** Changelog v0.405 (Stammdaten getrennt, Nutzer pflegen selbst). */
const ENTRY = {
  version: 'v0.405', released_on: '2026-09-24',
  title: 'Stammdaten sauber getrennt, Pflege ohne Anmeldung',
  items: [
    'Die alte Firmenart ist in drei Angaben aufgeteilt: Sektor (Pflicht, wortgleich zu Phalanx OS), Schwerpunkt (freiwillig, hängt am Sektor) und Rolle in der Transaktion (mehrfach möglich)',
    'Die Bestandsdaten wurden nach acht abgestimmten Regeln übernommen, je Regel mit Anzahl im Migrationsbericht. Die alte Firmenart bleibt als Feld erhalten',
    'Die Firmenakte zeigt, was fehlt, als Liste der Feldnamen statt als Prozentzahl',
    'Neue Seite „Datenpflege": Filter je fehlendem Feld, Mehrfachauswahl und Stapelbearbeitung für Sektor, Schwerpunkt, Region und Land',
    'Aktualisierungsmailing: je Ansprechperson eine Mail, die genau die fehlenden Felder nennt, mit einem Link, der ohne Anmeldung auf eine Seite mit genau diesen Feldern führt',
    'Wer nichts ändern will, bestätigt mit einem Klick. Auch das wird als Ergebnis festgehalten',
    'Der Link gilt genau einmal, gespeichert wird nur sein Hashwert. Angeschrieben wird niemand ohne Einwilligung',
    'Versand in Rationen, innerhalb eines Zeitfensters, von Hand angestoßen und gegen Doppelversand gesichert. Unzustellbare Adressen werden mit Klartextgrund gesperrt',
    'Je Mailing eine Übersicht: versendet, geöffnet, ausgefüllt, bestätigt, unzustellbar, abgemeldet',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
