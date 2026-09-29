// ─────────────────────────────────────────────────────────────────────────────
// Klarnamen in Unterlagen finden.
//
// Anlass: Ein Interessent hat Christian im Gespräch auf einzelne Mitarbeiter
// beim Namen angesprochen. In einem anonymen Verkaufsprozess ist das der
// schlimmste Durchstich, den es gibt.
//
// Eine solche Prüfung hat zwei Arten zu versagen. Sie übersieht einen Namen,
// dann nützt sie nichts. Oder sie schlägt bei jedem zweiten Satz an, dann
// schaut sie nach einer Woche niemand mehr an, und das ist genauso schlimm.
// Beides wird hier geprüft.
// ─────────────────────────────────────────────────────────────────────────────
const k = require('../utils/klarnamen');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };
const trifft = (text, bekannt = []) => k.pruefeText(text, bekannt).length > 0;

// ── Was gefunden werden MUSS ──────────────────────────────────────────────
const MUSS = [
  ['Ansprechpartner ist Herr Bergmann aus der Technik.', []],
  ['Die Buchhaltung führt Frau Schneider.', []],
  ['Unterzeichnet: Dipl.-Ing. Wolfgang Reuter', []],
  ['Rückfragen an Dr. Sabine Kraft', []],
  ['Kontakt: m.bergmann@faraday-technik.de', []],
  ['Telefon 0911 123456789 für Rückfragen', []],
  ['gez. Hoffmann', []],
  ['Die Übergabe begleitet i. V. Lehmann.', []],
];
const uebersehen = MUSS.filter(([t, b]) => !trifft(t, b)).map(([t]) => t);
ok(`alle ${MUSS.length} klaren Fälle werden gefunden`
  + (uebersehen.length ? `\n     übersehen: ${uebersehen.join(' | ')}` : ''), uebersehen.length === 0);

// ── Abgleich mit bekannten Namen ──────────────────────────────────────────
const bekannt = ['Wolfgang Reuter', 'Sabine Kraft', 'Michael Bergmann'];
ok('ein bekannter Nachname im Fließtext wird erkannt',
  trifft('Die Fertigung verantwortet Bergmann seit 2011.', bekannt));
ok('ein bekannter Vorname allein reicht auch',
  trifft('Wolfgang hat den Bereich aufgebaut.', bekannt));
ok('Umlaute und Schreibweise stören nicht',
  k.namensteile(['Jürgen Müller']).some((x) => /Müller|Jürgen/.test(x)));

// ── Was NICHT anschlagen darf ─────────────────────────────────────────────
const RUHIG = [
  'Das Unternehmen betreibt einen Standort in Bayern.',
  'Der Inhaber begleitet die Übergabe bis zu sechs Monate.',
  'Die Gesellschaft wurde 1998 gegründet, GmbH seit 2010.',
  'EBIT 237k bei 14,4 Prozent Marge im Jahr 2025.',
  'Elektrotechnik, Energieabrechnung und E-Mobility-Infrastruktur.',
  'Ein Share Deal, cash- und debt-free.',
  'Die Metropolregion Nürnberg ist der Hauptmarkt.',
  'Herr und Frau des Verfahrens sind die Gesellschafter.',
  'Frau Muster und Herr Mustermann stehen nur im Beispiel.',
];
const laut = RUHIG.filter((t) => trifft(t, bekannt));
ok(`keiner der ${RUHIG.length} harmlosen Sätze schlägt an`
  + (laut.length ? `\n     Fehlalarm: ${laut.join(' | ')}` : ''), laut.length === 0);

// Ein kurzer Nachname darf nicht jedes Wort treffen.
ok('ein kurzer Name wird nicht als Teilwort gesucht',
  !trifft('Das Sortiment umfasst Ottomotoren und Schrottpressen.', ['Hans Ott']));

// ── Der Fund ist brauchbar beschrieben ────────────────────────────────────
const fund = k.pruefeText('Für den Vertrieb ist Herr Bergmann zuständig, erreichbar unter 0911 5551234.', []);
ok('mehrere Funde in einem Satz', fund.length >= 2);
ok('jeder Fund nennt die Art', fund.every((f) => f.art));
ok('jeder Fund nennt einen Hinweis', fund.every((f) => f.hinweis && f.hinweis.length > 5));
// Die Umgebung muss den Treffer enthalten, nicht den Satzanfang: Bei einem
// Fund am Ende eines langen Textes stünde der sonst gar nicht drin.
ok('jeder Fund zeigt seine Umgebung', fund.every((f) => f.umgebung && f.umgebung.includes(f.treffer)));

// ── Ein ganzes Mandat ─────────────────────────────────────────────────────
const felder = [
  { bereich: 'Exposé', feld: 'Team', text: 'Die Leitung liegt bei Michael Bergmann.' },
  { bereich: 'Mandat', feld: 'Kurzbeschreibung', text: 'Etabliertes Elektrotechnikunternehmen in Bayern.' },
  { bereich: 'Datenraum', feld: 'Dateiname', text: 'Arbeitsvertrag Bergmann 2019.pdf' },
];
const mandat = k.pruefeMandat(felder, bekannt);
ok('Funde tragen ihren Bereich', mandat.every((f) => f.bereich && f.feld));
ok('die harmlose Kurzbeschreibung erzeugt keinen Fund',
  !mandat.some((f) => f.feld === 'Kurzbeschreibung'));
ok('ein Name im Dateinamen wird gefunden',
  mandat.some((f) => f.feld === 'Dateiname'));

// ── Unsinnige Eingaben ────────────────────────────────────────────────────
ok('leerer Text ist kein Absturz', k.pruefeText('', bekannt).length === 0);
ok('kein Text ist kein Absturz', k.pruefeText(null, bekannt).length === 0);
ok('keine bekannten Namen ist kein Absturz', k.pruefeText('Irgendetwas', null).length === 0);
ok('ein Name mit Sonderzeichen sprengt die Suche nicht',
  k.pruefeText('Text', ['Müller (Prokurist)']).length === 0);

process.exit(fail ? 1 : 0);
