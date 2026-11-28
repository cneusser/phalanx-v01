/** Changelog v0.515 (abgelaufene Sitzung). */
const ENTRY = {
  version: 'v0.515', released_on: '2026-11-28',
  title: 'Eine abgelaufene Sitzung sagt es jetzt',
  items: [
    'Beim Freigeben eines NDA erschien „Fehler: Ungültiges Token", darunter lagen die Kennzahlen einer Sitzung, die es nicht mehr gab. Ein Fenster bleibt tagelang offen, die Anmeldung läuft nach sieben Tagen ab, und von da an scheitert jeder Klick mit einem Satz, der nichts erklärt und nichts anbietet',
    'Der Server unterscheidet jetzt drei Fälle: abgelaufen, nicht prüfbar, Konto nicht aktiv. Abgelaufen ist der Normalfall und sagt genau das, ohne das Wort Token',
    'Die Oberfläche führt bei einer beendeten Sitzung zur Anmeldung und erklärt dort, was geschehen ist. Stehengebliebene Zahlen, die aussehen wie der aktuelle Stand, waren der gefährlichere Teil des alten Verhaltens',
    'Drei Dinge bleiben bewusst unberührt: Wer ohne Anmeldung den Marktplatz ansieht, merkt nichts davon. Die Prüfung beim Laden der Seite arbeitet weiter wie seit v0.465. Und scheitert ein Birdview-Token, wird das eigene Konto wiederhergestellt statt abgemeldet',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
