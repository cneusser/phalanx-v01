// Prüft die Formatierung der Kennzahlen-Kacheln (client/src/utils/kpi.js).
// Hintergrund: Auf dem Cavendish-Inserat stand "STAKE 10" und "POST-MONEY
// 7500000", weil in den Freitext-Feldern nackte Zahlen lagen. Der Helfer fängt
// genau das ab, lässt fertig formatierte Werte aber unangetastet.
const path = require('path');
const { pathToFileURL } = require('url');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

(async () => {
  const mod = await import(pathToFileURL(path.join(__dirname, '..', '..', 'client', 'src', 'utils', 'kpi.js')).href);
  const { kpiWert } = mod;

  // Der gemeldete Fehlerfall
  ok('nackte 10 wird zu "10 %"', kpiWert(10, 'prozent') === '10 %');
  ok('nackte 7500000 wird zu "€ 7,5 Mio."', kpiWert(7500000, 'geld') === '€ 7,5 Mio.');
  ok('nackte 750000 wird zu "€ 750 Tsd."', kpiWert(750000, 'geld') === '€ 750 Tsd.');
  ok('Zahl als Text zählt auch', kpiWert('7500000', 'geld') === '€ 7,5 Mio.');

  // Bereits formatierte Werte bleiben unverändert
  ok('"€ 7,5 Mio." bleibt', kpiWert('€ 7,5 Mio.', 'geld') === '€ 7,5 Mio.');
  ok('"~26 %" bleibt', kpiWert('~26 %', 'prozent') === '~26 %');
  ok('"bis 25 %" bleibt', kpiWert('bis 25 %', 'prozent') === 'bis 25 %');
  ok('Bandbreite bleibt', kpiWert('€ 1 bis 2 Mio.', 'geld') === '€ 1 bis 2 Mio.');

  // Größenordnungen
  ok('Milliarden', kpiWert(2300000000, 'geld') === '€ 2,3 Mrd.');
  ok('kleiner Betrag', kpiWert(800, 'geld') === '€ 800');
  ok('Dezimalzahl mit Komma', kpiWert('7,5', 'prozent') === '7,5 %');

  // Leerwerte
  ok('null bleibt null', kpiWert(null, 'geld') === null);
  ok('Leerstring bleibt null', kpiWert('   ', 'geld') === null);
  ok('ohne Art unverändert', kpiWert('10') === '10');

  console.log(fail ? `\n${fail} Test(s) fehlgeschlagen` : '\nAlle KPI-Formatierungs-Tests grün');
  process.exit(fail ? 1 : 0);
})();
