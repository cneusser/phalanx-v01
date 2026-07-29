/** Changelog v0.348 (Safe-Freigabe-Ampel, Standardstruktur, Teaser/IM, Funnel-Abgleich). */
const ENTRY = {
  version: 'v0.348', released_on: '2026-07-21',
  title: 'Safe-Freigabe-Ampel, Standardstruktur, personalisierter Teaser/IM, Funnel-Rechteabgleich',
  items: [
    'Freigabe-Ampel im Safe: je Datei zeigt ein grüner oder roter Punkt, ob und mit welcher Zugriffsebene sie im Datenraum liegt (Teaser, IM, Datenraum)',
    'Standard-Ordnerstruktur wird in jedem neuen Mandat automatisch angelegt und in bestehende Mandate nachgezogen (leer, inkl. Ordner „Teaser und Investment Memorandum")',
    'Teaser und Investment Memorandum als PDF: hochgeladenes Master-PDF bevorzugt, sonst wird eines aus den Mandatsdaten erzeugt, beides landet im Datenraum',
    'Personalisierung: jede heruntergeladene Datenraum-PDF trägt jetzt Name, E-Mail und Datum des Empfängers als Wasserzeichen, jeder erhält also sein eigenes Exemplar',
    'Rechte-Abgleich im Funnel: neuer Button gleicht alle Beteiligten mit ihrer echten Freigabe ab, setzt das Zugang-Kennzeichen korrekt und meldet Diskrepanzen',
    'Fehler behoben: eine erteilte Datenraum-Freigabe hob den Kontakt im Funnel nicht immer auf die Datenraum-Stufe (jetzt zählt eine freigegebene NDA wie eine unterschriebene)',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
