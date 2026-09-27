/** Changelog v0.416 (Suchprofile treffen wieder, Kundenwege komplett zweisprachig). */
const ENTRY = {
  version: 'v0.416', released_on: '2026-09-27',
  title: 'Suchprofile treffen wieder, Kundenwege komplett zweisprachig',
  items: [
    'Wichtigster Punkt: wer im Käufer-Suchprofil eine Branche angekreuzt hatte, bekam dadurch gar keine Benachrichtigungen mehr. Das Profil führte "Maschinenbau", das Mandat "C28 – Maschinenbau", und der Abgleich verlangte Zeichengleichheit. Das ist behoben',
    'Branchen und Regionen stehen jetzt an einer Stelle statt in vier Listen mit vier Schreibweisen. Gespeichert wird ein Code, angezeigt die Beschriftung in Ihrer Sprache',
    'Alle 47 bisherigen Schreibweisen bleiben gültig und werden automatisch erkannt. Ein Filter, der schon gesetzt war, geht nicht verloren, und ein unbekannter Wert wird nicht geraten, sondern unverändert angezeigt',
    'Selbstauskunft, Einladungen, Einwilligung, Mitmachen, Stammdatenpflege, NDA-Dialog, Inserats-Assistent und Exposé-Ansicht sind jetzt zweisprachig',
    'Datenschutz, AGB, Cookie-Richtlinie, Impressum und die Vertraulichkeitsvereinbarung bleiben bewusst deutsch, weil die deutsche Fassung die verbindliche ist. Englische Leser bekommen dort einen Hinweis und eine Zusammenfassung der Kernpunkte',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
