// ─────────────────────────────────────────────────────────────────────────────
// DUB-Multiples Q3/2026 und die Umstellung auf EBITDA (v0.448).
//
// Der Anlass war ein Fehler, der lange unbemerkt blieb, weil er nach Vorsicht
// aussah: Die DUB KMU-Multiples sind EBITDA-Multiples, beide Engines
// multiplizierten aber den EBIT. Das ergibt systematisch zu niedrige
// Unternehmenswerte, und zwar umso deutlicher, je anlagenintensiver ein
// Betrieb ist. Bei einem Betrieb mit 237 TEUR EBIT und 60 TEUR Abschreibungen
// sind das rund 25 Prozent.
//
// Zwei Zusagen werden hier gemessen:
//   · Gerechnet wird mit dem EBITDA, sobald er bekannt ist.
//   · Fehlt er, wird trotzdem gerechnet, aber das Ergebnis sagt, dass es zu
//     niedrig ist. Eine geschätzte Abschreibungsquote wäre bequemer und
//     falsch: Sie sähe aus wie eine Angabe des Unternehmens.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { basisFuerMultiple } = require('../valuation/multipleBasis');
const { evaluate } = require('../valuation/valuationEngine');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

// Elektrotechnik, Q3/2026, Micro-Cap: 4,2 bis 6,0
const M = {
  micro_ebit_min: 4.2, micro_ebit_max: 6.0,
  small_ebit_min: 5.7, small_ebit_max: 7.6,
  mid_ebit_min: 6.8, mid_ebit_max: 8.5,
  revenue_multiple_min: 0.5, revenue_multiple_max: 1.1,
};

// ── Die Basis ──────────────────────────────────────────────────────────────
{
  const ausEbitda = basisFuerMultiple({ ebits: [200000, 240000, 250000], ebitdas: [260000, 300000, 310000] }, 237000);
  ok('EBITDA aus den Angaben wird genommen', ausEbitda.kennzahl === 'ebitda');
  ok('die Bereinigung wirkt auf beide Kennzahlen', ausEbitda.basis === 297000);
  ok('die Abschreibungen werden ausgewiesen', ausEbitda.afa === 60000);
  ok('und es gibt nichts zu bemängeln', ausEbitda.hinweis === null);

  const ausAfa = basisFuerMultiple({ ebits: [237000], depreciation: 60000 }, 237000);
  ok('EBIT plus Abschreibungen ergibt denselben EBITDA', ausAfa.basis === 297000 && ausAfa.kennzahl === 'ebitda');
  ok('die Herkunft wird benannt', /zuzüglich Abschreibungen/.test(ausAfa.herkunft));

  const ohne = basisFuerMultiple({ ebits: [237000] }, 237000);
  ok('ohne Abschreibungen wird mit dem EBIT gerechnet', ohne.basis === 237000 && ohne.kennzahl === 'ebit');
  ok('und das Ergebnis sagt es', /zu niedrig/.test(ohne.hinweis || ''));
  ok('der Hinweis sagt auch, was zu tun ist', /nachtragen/.test(ohne.hinweis || ''));
  ok('nichts wird geschätzt', ohne.afa === null);
}

// ── Die Wirkung auf den Unternehmenswert ───────────────────────────────────
{
  const ohne = evaluate({ revenues: [1650000], ebits: [237000] }, M);
  const mit = evaluate({ revenues: [1650000], ebits: [237000], depreciation: 60000 }, M);
  ok('mit Abschreibungen fällt der Wert höher aus', mit.corridor.base > ohne.corridor.base);
  const abweichung = (mit.corridor.base - ohne.corridor.base) / ohne.corridor.base;
  ok(`und zwar um rund ein Viertel (${Math.round(abweichung * 100)} Prozent)`,
    abweichung > 0.2 && abweichung < 0.3);
  ok('das Verhältnis entspricht genau EBITDA zu EBIT',
    Math.abs(mit.corridor.base / ohne.corridor.base - 297000 / 237000) < 0.001);
  ok('die Kennzahl steht im Ergebnis', mit.methods.multiple.basisKennzahl === 'ebitda');
  ok('die Basis auch', mit.methods.multiple.basis === 297000);
  ok('ohne Angabe trägt das Ergebnis den Hinweis', !!ohne.methods.multiple.basisHinweis);

  // Ein negatives Ergebnis bleibt ein negatives Ergebnis.
  const rot = evaluate({ revenues: [1650000], ebits: [-50000] }, M);
  ok('bei negativem Ergebnis kein Korridor', rot.corridor.base === 0);
  // Aber: Abschreibungen können einen negativen EBIT in einen positiven
  // EBITDA drehen, und dann ist ein Wert sehr wohl sinnvoll.
  const gedreht = evaluate({ revenues: [1650000], ebits: [-50000], depreciation: 120000 }, M);
  ok('ein positiver EBITDA bei negativem EBIT ergibt einen Wert', gedreht.corridor.base > 0);
}

// ── Die anderen Verfahren bleiben beim EBIT ────────────────────────────────
{
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'valuation', 'detailedEngine.js'), 'utf8');
  ok('das Ertragswertverfahren rechnet weiter mit dem EBIT', /bewgValue = positive \? adjustedEbit \* KAP_FAKTOR_BEWG/.test(quelle));
  ok('und es steht dabei, warum', /NACH\s*\n?\s*\/\/\s*Abschreibungen|nach\s+Abschreibungen/i.test(quelle));
  ok('das Multiplikatorverfahren nicht mehr', !/const evMultiple = positive \? adjustedEbit \* chosen/.test(quelle));
  ok('die Sensitivität folgt derselben Basis', /evMultipleLow = basis\.basis > 0/.test(quelle));
  ok('und die Basis steht in der Zusammenfassung', /multipleKennzahl: basis\.kennzahl/.test(quelle));
}

// ── Die neuen Werte ────────────────────────────────────────────────────────
{
  const w = fs.readFileSync(path.join(__dirname, '..', 'db', 'migrations', '20260901001810_multiples_q3_2026.js'), 'utf8');
  ok('es gibt zwanzig Branchen', (w.match(/^\s{2}\['\w+',\s+[\d.]/gm) || []).length === 20);
  // Stichproben gegen die veröffentlichte Tabelle.
  ok('Elektrotechnik Micro 4,2 bis 6,0', /\['elektrotechnik', *4\.2, *6\.0, *5\.7, *7\.6, *6\.8, *8\.5\]/.test(w));
  ok('Software Mid 8,3 bis 10,6', /\['software', *5\.6, *7\.6, *7\.2, *9\.0, *8\.3, *10\.6\]/.test(w));
  ok('Gesundheitswesen Mid 8,6 bis 10,1', /\['gesundheit', *4\.0, *5\.9, *6\.0, *8\.1, *8\.6, *10\.1\]/.test(w));
  ok('Konsumgüter Micro 2,5 bis 4,0', /\['konsum', *2\.5, *4\.0/.test(w));

  ok('beide Stände sind als EBITDA gekennzeichnet',
    /STAND_ALT, kennzahl: 'ebitda'/.test(w) && /kennzahl: 'ebitda',\n\s+aktiv: true/.test(w));
  ok('die Umsatz-Multiples werden übernommen, nicht erfunden',
    /revenue_multiple_min: alt\.revenue_multiple_min/.test(w));
  ok('und das steht auch so dabei', /statt erfunden/.test(w));
  ok('der alte Stand bleibt erhalten', !/\.where\(\{ stand: STAND_ALT \}\)\.del\(\)/.test(w.split('exports.down')[0]));
  ok('nur ein Stand ist aktiv', /WHERE aktiv = true/.test(w));
  ok('die Auffangbranche ist nicht als DUB-Wert ausgegeben', /nicht Teil der DUB-Tabelle/.test(w));
}

// ── Gerechnet wird nur mit dem aktiven Stand ───────────────────────────────
{
  for (const datei of ['valuation.js', 'detailedValuation.js']) {
    const q = fs.readFileSync(path.join(__dirname, '..', 'routes', datei), 'utf8');
    // Zeilenweise zaehlen: ein Muster ueber mehrere Zeilen wuerde zwei
    // Abfragen zu einer zusammenfassen und damit gerade das uebersehen, was
    // hier geprueft werden soll.
    const zeilen = q.split('\n').filter((z) => /FROM valuation_multiples WHERE industry_key/.test(z));
    const stellen = zeilen.length;
    const aktiv = zeilen.filter((z) => /aktiv = true/.test(z)).length;
    ok(`${datei}: jede Abfrage nimmt den aktiven Stand`, stellen > 0 && stellen === aktiv);
  }
  const admin = fs.readFileSync(path.join(__dirname, '..', 'routes', 'admin.js'), 'utf8');
  ok('die Pflegemaske zeigt den aktiven Stand', /FROM valuation_multiples WHERE aktiv = true/.test(admin));
  ok('es gibt einen Bericht über alle Stände', /'\/berichte\/multiples'/.test(admin));
  ok('mit der Veränderung zum vorigen Stand', /veraenderung/.test(admin));
  ok('ein Stand lässt sich bewusst aktiv schalten', /'\/berichte\/multiples\/aktivieren'/.test(admin));
  ok('und bestehende Bewertungen bleiben, wie sie sind', /Bestehende Bewertungen bleiben/.test(admin));
}

process.exit(fail ? 1 : 0);
