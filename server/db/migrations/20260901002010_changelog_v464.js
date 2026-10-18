/** Changelog v0.464 (Rollenwahl und persoenliche Begruessung). */
const ENTRY = {
  version: 'v0.464', released_on: '2026-10-18',
  title: 'Rollenwahl bei der Anmeldung, und eine persönliche Begrüßung',
  items: [
    'Ein Verkäufer hatte sich als Verkäufer angemeldet und war als Käufer im Bestand. Er sah Marktplatz, Vertraulichkeitsvereinbarung und "Mandat auswählen" statt seines eigenen Unternehmens',
    'Es war kein Fehler beim Speichern, sondern zwei Vorgaben, die in dieselbe Richtung zeigten: In der Maske war "Käufer" vorausgewählt, und der Server machte aus einer fehlenden Rolle stillschweigend ebenfalls "buyer". Wer die Umschaltung übersah, war Käufer',
    'Jetzt ist nichts vorausgewählt. Statt zweier Schalter stehen dort zwei Karten mit je einem Satz, was danach passiert, und das Formular erscheint erst nach der Wahl. Der Server weist eine fehlende Rolle ab, statt sie zu raten: Eine abgewiesene Anmeldung kostet einen Klick, ein Konto mit der falschen Rolle kostet Vertrauen',
    'Die Umstellung einer falschen Rolle meldet jetzt, was vom alten Leben übrig bleibt: ein ausgefülltes Suchprofil und bestehende Interessentenakten, die weiterhin Zugang geben. Gelöscht wird davon nichts; entfernt wird nur der Käufertyp, den ein Verkäufer nicht hat',
    'Im eigenen Bereich steht jetzt eine Begrüßung mit Anrede und Nachnamen statt "Willkommen, Vorname", dazu genau ein nächster Schritt. Wer drei gleichwertige Vorschläge sieht, macht keinen davon',
    'Der Verkäuferbereich hieß "Verkäufer-Dashboard". Das war eine Überschrift für den Bauplan und nicht für den Menschen, der sein Unternehmen verkauft',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
