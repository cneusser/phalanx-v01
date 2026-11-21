/** Changelog v0.483 (Fassungen wieder markiert, Ablauf je Release festgelegt). */
const ENTRY = {
  version: 'v0.483', released_on: '2026-11-21',
  title: 'Die Fassungsnummern stehen wieder in der Historie',
  items: [
    'Gemeldet war, dass GitHub Desktop seit einiger Zeit keine Version mehr neben den Commits anzeigt. Die Anzeige dort hängt am Git-Tag, nicht an der package.json, und nach v0.473 war neun Fassungen lang kein Tag mehr gesetzt worden. Nachgeholt: v0.474 bis v0.482 sitzen jetzt auf ihren Commits',
    'Damit es nicht wieder liegen bleibt, gibt es scripts/fassung-markieren.sh. Es nimmt die Nummer aus der package.json und setzt das Tag auf den aktuellen Commit. Es weigert sich, wenn der Commit nicht zu dieser Nummer gehört, denn ein Tag auf dem falschen Commit ist schlechter als keines: Man glaubt ihm',
    'Beim Push gehört von jetzt an --follow-tags dazu, sonst bleibt das Tag im lokalen Verzeichnis liegen und die Anzeige bleibt leer',
    'Dazu steht der Ablauf je Release jetzt schriftlich fest, mit der Zuordnung, wer welchen Schritt tut: bauen und prüfen, Commit und Tag, Push auf die Teststufe, Prüfstand, Drehbuch von Hand, Bericht, Freigabe, und erst dann die Produktion. Ohne die Freigabe geht nichts weiter',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
