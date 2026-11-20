/** Changelog v0.481 (zwei gemeldete Fehler, und der Pruefstand, der sie gefunden hat). */
const ENTRY = {
  version: 'v0.481', released_on: '2026-11-20',
  title: 'Zwei Fehler behoben, die niemand im Quelltext sehen konnte',
  items: [
    'Gemeldet war: „Wenn ich den NDA über das Chatfenster freigebe, wird der Datenraum nicht freigeschalten." Der Knopf im Chat gab das Mandat frei, das in der Unterhaltung zuletzt genannt worden war. Wer mit einem Interessenten über zwei Mandate schreibt, gab damit das falsche frei. Die Plattform meldete Erfolg, und der angefragte Datenraum blieb zu',
    'Der Chat zeigt jetzt die Mandate dieses Kontakts einzeln mit Codenamen, dazu je Mandat den Stand und, falls eine Freigabe nicht geht, den Grund. Es wird kein Mandat mehr erraten, und vor der Freigabe steht eine Rückfrage, die das Mandat benennt',
    'Derselbe Knopf gab den Datenraum auch frei, wenn die Vertraulichkeitsvereinbarung erst angefordert und nie unterschrieben war. Die Mandatsroute weist das ausdrücklich ab. Es gab also zwei Fassungen derselben Regel, und die lockerere lag im bequemeren Weg. Jetzt gibt es sie einmal, und die Ausnahme für Startup-Finanzierungen bleibt unverändert',
    'Gemeldet war ausserdem: „Kunden können Daten abrufen, die eigentlich geschwärzt sein müssten." Das stimmte. Eine im Datenraum als vertraulich gekennzeichnete Datei antwortete dort richtig mit einer Sperre, wurde aber unter „Unterlagen" ausgeliefert, weil dieser zweite Weg nur sein eigenes Kennzeichen kannte und nicht das des Datenraums',
    'Die Vertraulichkeit des Datenraums gilt jetzt auf allen Wegen: in der Unterlagen-Liste, beim Download, beim ablaufenden Link und in der Volltextsuche. Die Suche war dabei der unangenehmste Fall, denn sie liefert einen Textausschnitt mit, bei einer Gehaltsliste also genau das, was geschützt gehört',
    'Wer eine Datei schwärzt, sperrt mit demselben Griff das Original. Bisher legte die Schwärzung die geschwärzte Kopie neben das Original, und das Original blieb offen im selben Ordner stehen. Gelöscht wird nichts, für das Mandatsteam bleibt es sichtbar',
    'Dazu der Grund, warum beides lange unentdeckt blieb: Alle bisherigen Prüfungen lesen den Quelltext und suchen Muster darin. Das findet eine fehlende Zeile, aber nie einen Fehler, der erst entsteht, wenn zwei für sich richtige Zeilen zusammenarbeiten. Neu ist deshalb ein Prüfstand, der die Anwendung gegen eine eigene Datenbank hochfährt und über dieselbe Schnittstelle mit ihr spricht wie ein Browser. Beide Fehler waren dort in wenigen Minuten nachstellbar',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
