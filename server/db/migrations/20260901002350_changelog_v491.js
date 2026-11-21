/** Changelog v0.491 (beide Unterschriften unter derselben Urkunde). */
const ENTRY = {
  version: 'v0.491', released_on: '2026-11-21',
  title: 'Die Phalanx GmbH zeichnet gegen, und zwar sofort',
  items: [
    '§ 8 der Vereinbarung sagt, sie tritt mit Unterzeichnung durch beide Parteien in Kraft. Bisher trug die Urkunde nur die Unterschrift des Interessenten, die Zeile der Beratung blieb leer. Wer das Dokument später hervorholte, sah einen Vertrag, der nach seinem eigenen Wortlaut noch nicht galt',
    'Jetzt zeichnet die Phalanx GmbH im selben Vorgang gegen, in Textform mit Name, Funktion, Ort und Zeitpunkt. Das ist dieselbe Form, in der auch der Interessent zeichnet, und § 10 Absatz 1 lässt sie ausdrücklich genügen. Das PDF geht erst danach hinaus, an den Unterzeichner wie an die Beratung',
    'Die Gegenzeichnung hängt an keiner Freigabe und an keinem Postfach. Ein Vertrag, der auf einen Klick wartet, wäre genau der zweite Schritt, den v0.489 entfernt hat. Der Datenraum öffnet sich unverändert mit der Unterschrift des Interessenten',
    'Wer gegengezeichnet hat und wann, steht im Nachweis des Dokuments und in der Datenbank. Der Unterzeichner der Beratung ist in der Vorlage hinterlegt und dort änderbar; fehlt er, bleibt die Zeile leer, statt einen Namen zu erfinden',
    'Bereits unterzeichnete Vereinbarungen bekommen keine nachträgliche Gegenzeichnung. Eine Unterschrift, die damals nicht geleistet wurde, wird nicht rückwirkend eingetragen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
