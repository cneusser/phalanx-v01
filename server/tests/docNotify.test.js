// Bündelung der Hinweise auf neue Unterlagen: Rhythmus je Empfänger, und in
// keiner Meldung darf ein Dateiname auftauchen.
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://u:p@localhost:5432/testdb';
const { istFaellig, text, rhythmusOder, RHYTHMEN, STANDARD } = require('../utils/docNotify');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const STUNDE = 3600000;
const JETZT = new Date('2026-09-20T12:00:00Z');
const vorStunden = (h) => new Date(JETZT.getTime() - h * STUNDE);

// ── Rhythmus ────────────────────────────────────────────────────────────────
ok('sofort: sofort faellig', istFaellig({ rhythmus: 'sofort', aelteste: vorStunden(0.01), jetzt: JETZT }) === true);
ok('taeglich: nach 3 Stunden noch nicht', istFaellig({ rhythmus: 'taeglich', aelteste: vorStunden(3), jetzt: JETZT }) === false);
ok('taeglich: nach 25 Stunden faellig', istFaellig({ rhythmus: 'taeglich', aelteste: vorStunden(25), jetzt: JETZT }) === true);
ok('woechentlich: nach 3 Tagen noch nicht', istFaellig({ rhythmus: 'woechentlich', aelteste: vorStunden(72), jetzt: JETZT }) === false);
ok('woechentlich: nach 8 Tagen faellig', istFaellig({ rhythmus: 'woechentlich', aelteste: vorStunden(24 * 8), jetzt: JETZT }) === true);
ok('aus: nie faellig', istFaellig({ rhythmus: 'aus', aelteste: vorStunden(24 * 30), jetzt: JETZT }) === false);
ok('ohne Wartendes nichts zu tun', istFaellig({ rhythmus: 'sofort', aelteste: null, jetzt: JETZT }) === false);

// ── Unbekannte Werte fallen auf den Standard zurueck ────────────────────────
ok('unbekannter Rhythmus wird zu taeglich', rhythmusOder('quatsch') === STANDARD);
ok('leer wird zu taeglich', rhythmusOder('') === STANDARD);
ok('gueltiger Wert bleibt', rhythmusOder('woechentlich') === 'woechentlich');
ok('unbekannter Rhythmus verhaelt sich wie taeglich',
  istFaellig({ rhythmus: 'quatsch', aelteste: vorStunden(25), jetzt: JETZT }) === true
  && istFaellig({ rhythmus: 'quatsch', aelteste: vorStunden(3), jetzt: JETZT }) === false);
ok('alle Rhythmen sind bekannt', JSON.stringify(RHYTHMEN) === JSON.stringify(['sofort', 'taeglich', 'woechentlich', 'aus']));

// ── Text: Mandat und Anzahl, aber niemals ein Dateiname ─────────────────────
const einer = text({ codename: 'FARADAY', anzahl: 1 });
const viele = text({ codename: 'FARADAY', anzahl: 14 });
ok('Einzahl korrekt', /eine neue Unterlage/.test(einer));
ok('Mehrzahl nennt die Anzahl', /14<\/strong> neue Unterlagen/.test(viele));
ok('Mandat wird genannt', /FARADAY/.test(viele));
ok('kein Dateiname im Text', !/\.pdf|\.xlsx|\.docx/i.test(einer + viele));
ok('kein Hinweis auf Gehalt oder Namen', !/Gehalt|Tantieme|Mitarbeiterliste/i.test(einer + viele));

console.log(fail ? `\n${fail} Test(s) fehlgeschlagen` : '\nAlle Bündelungs-Tests grün');
process.exit(fail ? 1 : 0);
