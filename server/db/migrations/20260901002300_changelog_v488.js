/** Changelog v0.488 (weniger fragen, frueher fuehren, und der Datenraum beruhigt sich). */
const ENTRY = {
  version: 'v0.488', released_on: '2026-11-21',
  title: 'Vier Angaben statt neun, und der Datenraum zeigt Interessenten keine Werkzeuge mehr',
  items: [
    'Bisher mussten neun Felder gepflegt sein, bevor jemand ein Mandat auch nur im Detail ansehen durfte: Anrede, Vorname, Nachname, Unternehmen, Position, Mobilnummer, Straße, PLZ und Ort. Das war die früheste Stelle des Prozesses und zugleich die härteste, und sie stand dort, wo ein Interessent noch gar nicht weiß, ob ihn das Mandat interessiert',
    'Jetzt genügen vier Angaben, um ein Mandat anzusehen: Anrede, Vorname, Nachname, Unternehmen. Die übrigen fünf verlangt erst die Vertraulichkeitsvereinbarung, und dort sind sie begründet, weil der Interessent damit Vertragspartei wird. Die E-Mail stand in keiner der Listen, sie ist die Anmeldung selbst',
    'Fehlt etwas, erscheint nicht mehr nur eine Fehlermeldung. Die Plattform führt auf die Profilseite, nennt oben die fehlenden Angaben beim Namen, sagt wozu sie gebraucht werden, springt zum ersten leeren Feld und bringt nach dem Speichern dorthin zurück, wo der Nutzer war',
    'Im Datenraum sah ein Interessent bisher die vollständige Verwaltungsleiste: vierzehn Schaltflächen von „Neuer Ordner" bis „Papierkorb", dazu je Zeile acht Symbole, darunter Umbenennen, Verschieben und Löschen. Der Server hat jede dieser Handlungen abgewiesen, die Oberfläche hat sie trotzdem angeboten. Für einen Investor, der auf den Unterlagen des Verkäufers einen Papierkorb sieht, ist das mehr als unübersichtlich',
    'Das Kennzeichen dafür schickte der Server seit v0.392 mit, benutzt wurde es nie. Jetzt wird es benutzt: Interessenten sehen Liste, Suche, Vorschau und Download, dazu einen Satz, der erklärt, was sie sehen. Gesperrte Bereiche stehen als gesperrt da statt mit Werkzeugen daneben. Die Oberfläche beginnt dabei vorsichtig, zeigt also erst nach der Antwort des Servers Pflegewerkzeuge und nie vorher',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
