/**
 * Changelog v0.416.
 *
 * Die erste Fassung dieses Eintrags war zu weit gegriffen: sie behauptete, ein
 * gesetzter Branchenfilter im Käufer-Suchprofil habe jede Benachrichtigung
 * verhindert. Das stimmt nicht. Die Suchprofile aus dem Marktplatz bauen ihre
 * Branchenliste aus den Mandaten selbst und treffen deshalb. Betroffen war das
 * Nachfolge-Matching. Der Eintrag wird auch dann korrigiert, wenn er schon in
 * der Datenbank steht.
 */
const ENTRY = {
  version: 'v0.416', released_on: '2026-09-27',
  title: 'Nachfolge-Treffer, Kundenwege zweisprachig, Rechtstexte mit Hinweis',
  items: [
    'Im Nachfolge-Matching trafen 7 der 12 Branchen aus der Selbstauskunft auf kein einziges Mandat, darunter "IT & Software", "Handel & Konsumgüter" und "Energie & Umwelt". Wer nur eine Branche und keine Region angegeben hatte, bekam dadurch keine Hinweise auf passende Mandate. Das ist behoben',
    'Branchen und Regionen stehen jetzt an einer Stelle statt in sieben Listen mit unterschiedlichen Schreibweisen. Gespeichert wird ein Code, angezeigt die Beschriftung in Ihrer Sprache',
    'Alle 47 bisherigen Schreibweisen bleiben gültig und werden automatisch erkannt. Ein Filter, der schon gesetzt war, geht nicht verloren, und ein unbekannter Wert wird nicht geraten, sondern unverändert angezeigt',
    'Selbstauskunft, Einladungen, Einwilligung, Mitmachen, Stammdatenpflege, NDA-Dialog, Inserats-Assistent und Exposé-Ansicht sind jetzt zweisprachig',
    'Datenschutz, AGB, Cookie-Richtlinie, Impressum und die Vertraulichkeitsvereinbarung bleiben bewusst deutsch, weil die deutsche Fassung die verbindliche ist. Englische Leser bekommen dort einen Hinweis und eine Zusammenfassung der Kernpunkte',
  ],
};
exports.up = async function (knex) {
  const felder = {
    released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items),
  };
  const vorhanden = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (vorhanden) await knex('changelog').where({ version: ENTRY.version }).update(felder);
  else await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, ...felder });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
