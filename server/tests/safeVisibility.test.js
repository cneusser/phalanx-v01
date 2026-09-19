// Sichtbarkeit im Datenraum (Safe) für Käufer: Baum frei, Vertrauliches nur mit
// Einzelfreigabe. Sicherheitskritisch, daher ausführlich geprüft.
const { bewerteBaum, sichtbareItems, ladbareDateienUnter, giltFuer } = require('../utils/safeVisibility');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

// Baum:
//  1 Finanzen (offen)
//    2 BWA.pdf
//  3 Clean Team (vertraulich)
//    4 Gehaelter.xlsx
//    5 Unterordner
//      6 Tantieme.pdf
//  7 Organigramm.pdf (offen, Wurzel)
const ITEMS = [
  { id: 1, parent_id: null, is_folder: 1, confidential: 0 },
  { id: 2, parent_id: 1, is_folder: 0, confidential: 0 },
  { id: 3, parent_id: null, is_folder: 1, confidential: 1 },
  { id: 4, parent_id: 3, is_folder: 0, confidential: 0 },
  { id: 5, parent_id: 3, is_folder: 1, confidential: 0 },
  { id: 6, parent_id: 5, is_folder: 0, confidential: 0 },
  { id: 7, parent_id: null, is_folder: 0, confidential: 0 },
];
const KAEUFER = { userId: 42, buyerType: 'financial', groupIds: [9] };

// ── Ohne jede Freigabe ──────────────────────────────────────────────────────
{
  const b = bewerteBaum({ items: ITEMS, grants: [], ...KAEUFER });
  ok('offener Ordner sichtbar', b.get(1).sichtbar && !b.get(1).gesperrt);
  ok('offene Datei ladbar', b.get(2).darf_download !== false && b.get(2).download === true);
  ok('Wurzeldatei ladbar', b.get(7).download === true);
  ok('vertraulicher Ordner erscheint, aber gesperrt', b.get(3).sichtbar && b.get(3).gesperrt === true);
  ok('Inhalt des gesperrten Ordners wird gar nicht aufgelistet', !b.has(4) && !b.has(5) && !b.has(6));
  const sichtbar = sichtbareItems(ITEMS, b).map((i) => i.id);
  ok('Liste enthaelt 1, 2, 3, 7', JSON.stringify(sichtbar) === JSON.stringify([1, 2, 3, 7]));
}

// ── Einzelfreigabe auf die Person, nur Ansicht ──────────────────────────────
{
  const b = bewerteBaum({ items: ITEMS, grants: [{ item_id: 3, subject_type: 'user', subject_ref: 42, level: 'read' }], ...KAEUFER });
  ok('mit Lese-Freigabe: Ordner offen', b.get(3).gesperrt === false);
  ok('mit Lese-Freigabe: Inhalt sichtbar', b.has(4) && b.has(6));
  ok('Lese-Freigabe erlaubt KEINEN Download', b.get(4).download === false && b.get(6).download === false);
  ok('Vertraulichkeit bleibt vermerkt', b.get(4).vertraulich === true);
  ok('offene Bereiche bleiben ladbar', b.get(2).download === true);
}

// ── Einzelfreigabe mit Download, vererbt in den Teilbaum ────────────────────
{
  const b = bewerteBaum({ items: ITEMS, grants: [{ item_id: 3, subject_type: 'user', subject_ref: 42, level: 'download' }], ...KAEUFER });
  ok('Download-Freigabe wirkt auf direkte Datei', b.get(4).download === true);
  ok('Download-Freigabe wirkt in die Tiefe', b.get(6).download === true);
  const dateien = ladbareDateienUnter(ITEMS, b, 3).map((i) => i.id);
  ok('Sammel-Download unter dem Ordner liefert 4 und 6', JSON.stringify(dateien.sort()) === JSON.stringify([4, 6]));
}

// ── Freigabe nur auf eine einzelne Datei im vertraulichen Zweig ─────────────
// Der Weg dorthin muss sich oeffnen, der Rest des Zweigs bleibt verborgen.
{
  const b = bewerteBaum({ items: ITEMS, grants: [{ item_id: 4, subject_type: 'user', subject_ref: 42, level: 'download' }], ...KAEUFER });
  ok('Ordner oeffnet sich fuer die freigegebene Datei', b.get(3).gesperrt === false);
  ok('die freigegebene Datei ist sichtbar und ladbar', b.has(4) && b.get(4).download === true);
  ok('der Ordner selbst bleibt als vertraulich vermerkt', b.get(3).vertraulich === true);
  ok('nicht freigegebene Geschwister bleiben verborgen', !b.has(5) && !b.has(6));
  const dateien = ladbareDateienUnter(ITEMS, b, 3).map((i) => i.id);
  ok('Sammel-Download liefert nur die freigegebene Datei', JSON.stringify(dateien) === JSON.stringify([4]));
}

// ── Freigabe tief im Zweig: Zwischenordner wird durchlaessig ───────────────
{
  const b = bewerteBaum({ items: ITEMS, grants: [{ item_id: 6, subject_type: 'user', subject_ref: 42, level: 'read' }], ...KAEUFER });
  ok('oberster vertraulicher Ordner wird durchlaessig', b.get(3).gesperrt === false);
  ok('Zwischenordner auf dem Weg ist sichtbar', b.has(5) && b.get(5).gesperrt === false);
  ok('Zielobjekt sichtbar, aber nur lesend', b.has(6) && b.get(6).download === false);
  ok('Geschwister abseits des Weges bleiben verborgen', !b.has(4));
}

// ── Freigaben an andere Subjekte ────────────────────────────────────────────
{
  const perTyp = bewerteBaum({ items: ITEMS, grants: [{ item_id: 3, subject_type: 'buyer_group', subject_ref: 'financial', level: 'download' }], ...KAEUFER });
  ok('Freigabe je Kaeufertyp greift', perTyp.get(3).gesperrt === false);
  const falscherTyp = bewerteBaum({ items: ITEMS, grants: [{ item_id: 3, subject_type: 'buyer_group', subject_ref: 'strategic', level: 'download' }], ...KAEUFER });
  ok('anderer Kaeufertyp bleibt draussen', falscherTyp.get(3).gesperrt === true);
  const perGruppe = bewerteBaum({ items: ITEMS, grants: [{ item_id: 3, subject_type: 'group', subject_ref: 9, level: 'read' }], ...KAEUFER });
  ok('Gruppen-Freigabe greift', perGruppe.get(3).gesperrt === false);
  const fremdeGruppe = bewerteBaum({ items: ITEMS, grants: [{ item_id: 3, subject_type: 'group', subject_ref: 99, level: 'read' }], ...KAEUFER });
  ok('fremde Gruppe bleibt draussen', fremdeGruppe.get(3).gesperrt === true);
  const alle = bewerteBaum({ items: ITEMS, grants: [{ item_id: 3, subject_type: 'party_all', subject_ref: null, level: 'read' }], ...KAEUFER });
  ok('Freigabe an alle Beteiligten greift', alle.get(3).gesperrt === false);
  const fremderNutzer = bewerteBaum({ items: ITEMS, grants: [{ item_id: 3, subject_type: 'user', subject_ref: 77, level: 'download' }], ...KAEUFER });
  ok('Freigabe fuer eine andere Person wirkt nicht', fremderNutzer.get(3).gesperrt === true);
}

// ── Sammel-Download respektiert Sperren ─────────────────────────────────────
{
  const b = bewerteBaum({ items: ITEMS, grants: [], ...KAEUFER });
  const alleDateien = ladbareDateienUnter(ITEMS, b, 1).map((i) => i.id);
  ok('offener Ordner liefert seine Datei', JSON.stringify(alleDateien) === JSON.stringify([2]));
  const ausGesperrt = ladbareDateienUnter(ITEMS, b, 3);
  ok('gesperrter Ordner liefert nichts', ausGesperrt.length === 0);
}

// ── giltFuer ────────────────────────────────────────────────────────────────
ok('giltFuer: unbekannter Subjekttyp wird abgelehnt',
  giltFuer({ subject_type: 'quatsch', subject_ref: 42 }, KAEUFER) === false);
ok('giltFuer: user vergleicht typsicher (String gegen Zahl)',
  giltFuer({ subject_type: 'user', subject_ref: '42' }, KAEUFER) === true);

// ── Randfaelle ──────────────────────────────────────────────────────────────
{
  const leer = bewerteBaum({ items: [], grants: [], ...KAEUFER });
  ok('leerer Baum bricht nicht', leer.size === 0);
  const verwaist = bewerteBaum({ items: [{ id: 5, parent_id: 999, is_folder: 0, confidential: 0 }], grants: [], ...KAEUFER });
  ok('verwaister Knoten wird als Wurzel behandelt', verwaist.get(5) && verwaist.get(5).sichtbar === true);
}

console.log(fail ? `\n${fail} Test(s) fehlgeschlagen` : '\nAlle Sichtbarkeits-Tests grün');
process.exit(fail ? 1 : 0);
