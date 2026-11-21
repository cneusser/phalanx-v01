/** Changelog v0.492 (die Urkunde noch einmal zustellen). */
const ENTRY = {
  version: 'v0.492', released_on: '2026-11-21',
  title: 'Eine unterzeichnete Vereinbarung lässt sich noch einmal zustellen',
  items: [
    'In der Verwaltung steht neben jeder unterzeichneten Vereinbarung eine Schaltfläche, die dieselbe Urkunde noch einmal als Mail verschickt. Mails gehen verloren, landen im Spam oder werden gelöscht; bisher blieb dann nur, das PDF herunterzuladen und von Hand zu versenden, und der Vorgang fehlte im Protokoll',
    'Vorbelegt ist der Versand allein an die Beratung. An den Unterzeichner geht die Urkunde nur, wenn es ausdrücklich verlangt wird, damit eine Prüfung niemanden versehentlich anschreibt',
    'Zugestellt wird die abgelegte Urkunde selbst. Unterzeichnet wird nichts Neues, Stand, Unterschrift und Fingerabdruck bleiben unverändert, und die Zustellung steht danach im Protokoll',
    'Behoben: Ein Nachdruck einer älteren Vereinbarung zeigte die Gegenzeichnung der Phalanx GmbH, obwohl damals niemand gegengezeichnet hatte. Der Nachdruck griff auf den Unterschriftszeitpunkt zurück, wenn kein Zeitpunkt der Gegenzeichnung hinterlegt war. Jetzt erscheint sie nur dort, wo sie auch stattgefunden hat',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
