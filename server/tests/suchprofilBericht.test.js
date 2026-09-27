// ─────────────────────────────────────────────────────────────────────────────
// Suchprofil-Bericht: rechnet er richtig?
//
// Der Bericht behauptet, wer vorher keine Hinweise bekam. Wenn er sich irrt,
// schreibt Christian Leute an, bei denen nie etwas kaputt war, oder er
// übersieht die, bei denen es kaputt war. Deshalb steht hier ein Fall mit
// bekanntem Ergebnis statt einer Stichprobe aus der Datenbank.
// ─────────────────────────────────────────────────────────────────────────────
const { auswerten, altBrancheTrifft, liste } = require('../scripts/suchprofil-bericht');

let fail = 0;
const ok = (name, cond) => { console.log((cond ? '✓' : '✗ FEHLER') + ' ' + name); if (!cond) fail++; };

const MANDATE = [
  { id: 1, codename: 'ALPHA', industry: 'J62 – Software-Entwicklung & IT-Dienstleistungen', region: 'Bayern', deal_type: 'Nachfolge' },
  { id: 2, codename: 'BETA', industry: 'C28 – Maschinenbau', region: 'Hessen', deal_type: 'Nachfolge' },
  { id: 3, codename: 'GAMMA', industry: 'G47 – Einzelhandel & E-Commerce', region: 'NRW', deal_type: 'MBI' },
];

// ── Die alte Logik traf bei diesen Werten wirklich nichts ──────────────────
ok('alt: "IT & Software" traf kein IT-Mandat', !altBrancheTrifft('IT & Software', MANDATE[0].industry));
ok('alt: "Handel & Konsumgüter" traf kein Handelsmandat', !altBrancheTrifft('Handel & Konsumgüter', MANDATE[2].industry));
ok('alt: "Maschinenbau" traf sehr wohl', altBrancheTrifft('Maschinenbau', MANDATE[1].industry));

// ── Ein Profil, das vorher leer ausging ────────────────────────────────────
const stumm = { id: 11, email: 'a@example.com', branchenfokus: '["IT & Software"]', ziel_regionen: '[]', ziel_laender: '[]' };
const { betroffen } = auswerten([stumm], MANDATE);
ok('das stumme Profil taucht im Bericht auf', betroffen.length === 1);
ok('vorher null Treffer', betroffen[0] && betroffen[0].alt === 0);
ok('jetzt ein Treffer', betroffen[0] && betroffen[0].neu === 1);

// ── Ein Profil, bei dem sich nichts ändert, darf nicht auftauchen ──────────
const heil = { id: 12, branchenfokus: '["Maschinenbau"]', ziel_regionen: '[]', ziel_laender: '[]' };
ok('unveränderte Profile bleiben draußen', auswerten([heil], MANDATE).betroffen.length === 0);

// ── Wer gar nichts gesetzt hat, bekommt ohnehin alles ─────────────────────
const ohne = { id: 13, branchenfokus: '[]', ziel_regionen: '[]', ziel_laender: '[]' };
ok('Profile ohne Filter werden übersprungen', auswerten([ohne], MANDATE).betroffen.length === 0);

// ── Region allein hat auch vorher funktioniert ────────────────────────────
const nurRegion = { id: 14, branchenfokus: '[]', ziel_regionen: '["Bayern"]', ziel_laender: '[]' };
ok('reine Regionsprofile waren nie betroffen', auswerten([nurRegion], MANDATE).betroffen.length === 0);

// ── Unbekannte Werte werden gemeldet, nicht geraten ───────────────────────
const fremd = { id: 15, branchenfokus: '["Raumfahrt & Weltall"]', ziel_regionen: '[]', ziel_laender: '[]' };
const { unbekannt } = auswerten([fremd], MANDATE);
ok('unbekannter Wert wird gemeldet', unbekannt.get('Raumfahrt & Weltall') === 1);

// ── Kaputtes JSON legt den Bericht nicht lahm ─────────────────────────────
ok('kaputtes JSON ergibt eine leere Liste', liste('{nicht json') .length === 0);
ok('bereits entpackte Listen gehen durch', liste(['a', 'b']).length === 2);

process.exit(fail ? 1 : 0);
