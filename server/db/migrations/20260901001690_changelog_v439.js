/** Changelog v0.439 (Investoren-Anschreiben einlesen). */
const ENTRY = {
  version: 'v0.439', released_on: '2026-09-30',
  title: 'Investoren-Anschreiben einlesen',
  items: [
    'Vorstellungsmails von Beteiligungsgesellschaften bringen ihr Akquisitionsprofil meist gleich mit: Sektor, Region, Zielgröße. Bisher blieb das im Postfach, und beim nächsten Mandat wusste niemand mehr, wer wonach sucht',
    'Im CRM gibt es jetzt "Anschreiben einlesen". Sie fügen die Mail ein, die Plattform zeigt jedes erkannte Feld zusammen mit der Zeile, aus der es stammt. Übernommen wird nichts, bevor Sie es bestätigt haben',
    'Was nicht sicher erkennbar ist, bleibt leer und wird benannt. Geraten wird nichts, denn ein falscher Wert im Bestand ist teurer als ein leeres Feld: ihn hinterfragt niemand mehr',
    'Mögliche Dubletten werden gemeldet, nicht zusammengeführt',
    'Bittet die Mail um Aufnahme in einen Verteiler, wird der Wortlaut mit Datum als Beleg gespeichert. Aufgenommen wird ausschließlich die Adresse, die in dieser Bitte genannt ist. Wer um Aufnahme einer bestimmten Adresse bittet, hat nicht in jede eingewilligt',
    'Zu jedem Mandat lassen sich passende Investoren vorschlagen, mit Begründung je Treffer und je Ausschluss. Angeschrieben wird niemand automatisch',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
