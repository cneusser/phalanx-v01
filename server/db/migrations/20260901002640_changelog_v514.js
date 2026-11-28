/** Changelog v0.514 (Bewegung wird gemessen). */
const ENTRY = {
  version: 'v0.514', released_on: '2026-11-28',
  title: 'Was hängt, steht jetzt oben',
  items: [
    'Zweiter Sprint aus dem Marktplatzplan. Die unbequemste Zahl der Plattform war bisher nur als graue Nebenbemerkung auf einer Karte zu sehen: Bei FARADAY stehen 201 von 240 Kontakten auf der Stufe Ansprache, der älteste seit 162 Tagen. Das ist kein Mangel an Reichweite, sondern einer an Bewegung',
    'Neuer Bericht „Was hängt", über alle Mandate, nach Dauer sortiert. Je Fall steht daneben, was zuletzt geschah, und ein Weg in die Kontaktakte. Als Bewegung zählt alles, was an einem Vorgang geschehen ist: ein Stufenwechsel, eine Ansprache, eine Antwort, eine Unterschrift, ein Blick in den Datenraum',
    'Wer abgesagt hat, hängt nicht, und wer noch auf die Freigabe des Inhabers wartet, steht in einer anderen Liste. Beides bleibt draussen. Die Schwelle ist einstellbar, weil 21 Tage für ein Erstgespräch viel und für eine Due Diligence wenig sind',
    'Am Kontakt steht die Reaktionsquote über alle Mandate: Auf wie viele der letzten zwanzig Ansprachen kam binnen sieben Tagen etwas zurück. Als Reaktion zählt nur, was von der Gegenseite kommt. Unser eigenes Nachfassen senkt die Quote, es hebt sie nicht',
    'Eine Zahl, keine Note und keine Ampel. Wer selten antwortet, kann der richtige Käufer sein, und wer schnell antwortet, der falsche. Ohne Ansprachen steht dort auch keine Quote, denn null Prozent wäre in diesem Fall falsch',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
