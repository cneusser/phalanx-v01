/** Changelog v0.513 (aus den Berichten heraus handeln). */
const ENTRY = {
  version: 'v0.513', released_on: '2026-11-28',
  title: 'Die Berichte sind keine Sackgassen mehr',
  items: [
    'Erster Sprint aus dem Marktplatzplan: das Fundament. Zwei Berichte nennen seit v0.506 und v0.509 ihre Fälle und liessen den Leser damit allein. Wer handeln wollte, musste den Kontakt suchen, das Mandat finden und dort weitersehen. Ein Bericht, aus dem man nicht handeln kann, wird nach dem zweiten Mal nicht mehr geöffnet',
    'Unter „Zugang ohne Nachweis" steht jetzt an jeder Zeile, was zu tun ist: Vereinbarung anfordern, Dokument hochlegen, Zugang entziehen. Das Anfordern legt den Vorgang an, wenn es noch keinen gibt, und genau das war bei drei von vier Fällen so. Ein zweiter Lauf legt keinen zweiten Vorgang an, und wer bereits unterschrieben hat, wird nicht mehr aufgefordert',
    'Unter „Wo Angaben fehlen" lassen sich mehrere Zeilen auswählen und ein Feld in einem Zug setzen. Für Kontakte die Art des Interessenten, Ort, Land und Funktion, für Firmen Sektor, Region, Umsatzgrößenordnung, Ort und Land',
    'Gesetzt wird ausschliesslich, was leer ist. Was ein Mensch gepflegt hat, bleibt stehen, auch wenn der Stapel etwas anderes sagt, und die Zahl der übersprungenen Zeilen wird gemeldet. Die Sicherung steht in der Abfrage selbst und nicht in einer Schleife, damit sie sich nicht versehentlich umgehen lässt',
    'Höchstens 500 Zeilen auf einmal, nur die vorgesehenen Felder, kein Leeren über den Stapel. Jeder Lauf steht mit Feld, Wert und Trefferzahl im Protokoll',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
