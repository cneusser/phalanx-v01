/** Changelog v0.437 (Q&A im Nachrichtenfenster, mit Verweis ins Dokument). */
const ENTRY = {
  version: 'v0.437', released_on: '2026-09-30',
  title: 'Q&A im Nachrichtenfenster, mit Verweis ins Dokument',
  items: [
    'Offene Q&A-Fragen erscheinen jetzt im Gespräch mit dem Fragesteller. Bisher kam die Frage im Mandat an, geschrieben wurde aber im Nachrichtenfenster. Zwei Orte für dasselbe Gespräch heißen, dass an einem von beiden etwas fehlt',
    'Eine Antwort von dort geht als Nachricht hinaus und wird zugleich als Antwort im Q&A des Mandats geführt, mit Zeitpunkt und Urheber. Eine Handlung, zwei Orte, kein Abschreiben',
    'Neu ist der Verweis auf ein Dokument: Sie wählen es aus dem Datenraum, der Link landet im Text. Wer ihn öffnet, kommt in den Datenraum an die Stelle des Dokuments, das dort hervorgehoben ist',
    'Ein Verweis ist keine Freigabe. Wer das Dokument nicht sehen darf, bekommt es auch nicht genannt, denn schon ein Dateiname kann eine Auskunft sein. Statt einer leeren Liste steht dort der Grund',
    'Jeder Aufruf über einen solchen Verweis erscheint im Zugriffsprotokoll des Mandats, wie eine Ansicht im Datenraum',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
