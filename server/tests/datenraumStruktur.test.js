// Einheitliche Datenraum-Struktur (v0.404).
//
// Die Zuordnung entscheidet, in welchem Ordner ein Dokument landet, und der
// Ordner entscheidet über die Freigabe. Ein falsch einsortiertes Gehaltsblatt
// wäre damit für alle freigegebenen Käufer sichtbar. Deshalb wird hier eng
// geprüft, besonders an den Stellen, wo Wörter einander ähneln.
const st = require('../utils/datenraumStruktur');
const umbau = require('../utils/datenraumUmbau');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };
const ziel = (name, erwartet, eltern = '') => {
  const r = st.zuordnen(name, eltern);
  ok(`${name} → ${erwartet}${r.pfad === erwartet ? '' : `  (war: ${r.pfad})`}`, r.pfad === erwartet);
};

// ── Die Struktur selbst ─────────────────────────────────────────────────────
ok('sieben Bereiche auf der ersten Ebene', st.STRUKTUR.length === 7);
ok('kein Bereich hat mehr als fünf Unterordner', st.STRUKTUR.every(([, u]) => u.length <= 5));
ok('nicht tiefer als zwei Ebenen', st.allePfade().every((p) => p.split('/').length <= 2));
ok('Clean Team bleibt ohne Unterordner', (st.STRUKTUR.find(([b]) => b === 'Clean Team') || [])[1].length === 0);
ok('alle Namen sind kurz genug zum Lesen', st.STRUKTUR.every(([b]) => b.length <= 24));

// ── Wörter, die einander ähneln ─────────────────────────────────────────────
ziel('Organisation und Steuerung', 'Unternehmen und Recht');
ziel('Steuerbescheid 2024.pdf', 'Finanzen und Steuern/Steuern');
ziel('Steuerungskennzahlen.xlsx', 'Unternehmen und Recht/Gesellschafter und Beteiligungen');
ziel('Rechtliche Situation im Unternehmen', 'Unternehmen und Recht');
ziel('Finanz- und Rechnungswesen, IT', 'Finanzen und Steuern');
ziel('IT-Systemlandschaft.pptx', 'Betrieb und IT/IT und Systeme');

// ── Typische Dokumente ──────────────────────────────────────────────────────
ziel('Jahresabschluss 2023.pdf', 'Finanzen und Steuern/Jahresabschlüsse');
ziel('JA 2022.pdf', 'Finanzen und Steuern/Jahresabschlüsse');
ziel('BWA 08-2026.pdf', 'Finanzen und Steuern/Laufendes Jahr');
ziel('Liquiditaetsplanung.xlsx', 'Finanzen und Steuern/Planung');
ziel('Darlehensvertrag Sparkasse.pdf', 'Finanzen und Steuern/Banken und Finanzierung');
ziel('Handelsregisterauszug.pdf', 'Unternehmen und Recht/Gesellschaftsvertrag und Register');
ziel('Gesellschaftsvertrag.pdf', 'Unternehmen und Recht/Gesellschaftsvertrag und Register');
ziel('Rechtsstreit Mueller.pdf', 'Unternehmen und Recht/Genehmigungen, Umwelt, Rechtsstreitigkeiten');
ziel('Kundenliste Top 20.xlsx', 'Markt und Geschäft/Kunden und Umsatz');
ziel('Lieferantenrahmenvertrag.pdf', 'Markt und Geschäft/Lieferanten und Einkauf');
ziel('Marktstudie 2025.pdf', 'Markt und Geschäft/Markt und Wettbewerb');
ziel('Preisliste 2026.pdf', 'Markt und Geschäft/Produkte und Leistungen');
ziel('Mietvertrag Halle 2.pdf', 'Betrieb und IT/Standorte und Immobilien');
ziel('Maschinenliste.xlsx', 'Betrieb und IT/Anlagen und Technik');
ziel('Versicherungspolicen.pdf', 'Betrieb und IT/Versicherungen');
ziel('Teaser anonymisiert.pdf', 'Transaktion/Teaser und Informationsmemorandum');
ziel('Informationsmemorandum.pdf', 'Transaktion/Teaser und Informationsmemorandum');
ziel('Prozessbrief.pdf', 'Transaktion/Prozess und Zeitplan');

// ── Heikles gehört ins Clean Team oder zumindest zu Personal ────────────────
ziel('Clean Team Unterlagen', 'Clean Team');
ziel('Gehaltsliste 2026.xlsx', 'Personal/Vergütung und Altersversorgung');
ziel('bAV Zusagen.pdf', 'Personal/Vergütung und Altersversorgung');
ziel('Betriebsvereinbarung Gleitzeit.pdf', 'Personal/Mitbestimmung');
ziel('Arbeitsvertrag Muster.docx', 'Personal/Belegschaft und Verträge');

// ── Der übergeordnete Ordner hilft, wenn der Dateiname nichts sagt ──────────
ziel('Anlage 3.pdf', 'Finanzen und Steuern/Jahresabschlüsse', 'Jahresabschluss 2023');
ok('ohne Anhaltspunkt bleibt es offen', st.zuordnen('Dokument.pdf').pfad === null);
ok('leerer Name bleibt offen', st.zuordnen('').pfad === null);

// ── Eingefügte Listen lesen ─────────────────────────────────────────────────
const eingerueckt = st.leseListe('1. Finanzen\n  1.1 Jahresabschluss\n  1.2 BWA\n2. Personal');
ok('eingerückte Liste erkennt vier Zeilen', eingerueckt.length === 4);
ok('Nummerierung wird entfernt', eingerueckt[0].name === 'Finanzen');
ok('Einrückung ergibt die Ebene', eingerueckt[1].ebene === 1 && eingerueckt[0].ebene === 0);

const mitPfaden = st.leseListe('Finanzen/Jahresabschluss/2023.pdf');
ok('Pfadangabe wird zerlegt', mitPfaden.length === 3 && mitPfaden[2].name === '2023.pdf');

const mitStrichen = st.leseListe('- Personal\n  - Gehaltsliste');
ok('Aufzählungszeichen stören nicht', mitStrichen[0].name === 'Personal');

const plan = st.planAusListe('1. Finanzen\n  1.1 Jahresabschluss 2023\n  1.2 Gehaltsliste');
ok('Plan ordnet jede Zeile zu', plan.length === 3 && plan.every((z) => z.ziel));
ok('die Gehaltsliste landet bei Personal', plan[2].ziel === 'Personal/Vergütung und Altersversorgung');

// ── Umbau planen, ohne Datenbank ────────────────────────────────────────────
const bestand = [
  { id: 1, parent_id: null, name: 'Alte Ablage', is_folder: 1 },
  { id: 2, parent_id: 1, name: 'Jahresabschluss 2023.pdf', is_folder: 0 },
  { id: 3, parent_id: 1, name: 'Gehaltsliste.xlsx', is_folder: 0 },
  { id: 4, parent_id: null, name: 'Dokument ohne Hinweis.pdf', is_folder: 0 },
];
const p = umbau.planen(bestand);
ok('alle Standardordner fehlen noch und werden angelegt', p.anzulegen.length === st.allePfade().length);
ok('zwei Dateien werden einsortiert', p.verschiebungen.length === 2);
ok('der Jahresabschluss geht zu den Jahresabschlüssen',
  p.verschiebungen.some((v) => v.name.startsWith('Jahresabschluss') && v.nach === 'Finanzen und Steuern/Jahresabschlüsse'));
ok('die Gehaltsliste geht zu Personal',
  p.verschiebungen.some((v) => v.name.startsWith('Gehaltsliste') && v.nach === 'Personal/Vergütung und Altersversorgung'));
ok('das unklare Dokument bleibt liegen und wird gemeldet', p.offen.length === 1);
ok('der leere Altordner wird zum Entfernen vorgeschlagen', p.leer.some((l) => l.name === 'Alte Ablage'));

// Nichts kaputt machen: Ein Bestand, der bereits richtig liegt, erzeugt keine Bewegung.
const schon = [
  { id: 10, parent_id: null, name: 'Finanzen und Steuern', is_folder: 1 },
  { id: 11, parent_id: 10, name: 'Jahresabschlüsse', is_folder: 1 },
  { id: 12, parent_id: 11, name: 'Jahresabschluss 2023.pdf', is_folder: 0 },
];
const p2 = umbau.planen(schon);
ok('was richtig liegt, wird nicht bewegt', p2.verschiebungen.length === 0);
ok('vorhandene Standardordner werden nicht doppelt angelegt', !p2.anzulegen.includes('Finanzen und Steuern'));

console.log(fail ? `\n${fail} Fehler` : '\nAlle Prüfungen bestanden');
process.exit(fail ? 1 : 0);
