// ─────────────────────────────────────────────────────────────────────────────
// Projektabgleich mit Phalanx OS, Schritte 1 und 3 (v0.446).
//
// Die Prüfungen folgen Abschnitt 8 des Auftrags. Zwei davon sind die
// eigentlichen Zusagen, und sie werden hier gemessen statt behauptet:
//
//   · Kein eingehender Satz verändert einen Codenamen. Der Codename ist die
//     Anonymisierung gegenüber Käufern. Ein Klarname von aussen hebelte sie
//     aus, und zwar still: Niemand sähe, dass die Anonymität weg ist.
//   · Die ausgehende Schnittstelle enthält keinen Klarnamen. Diese Zusage
//     steht nicht nur im Kommentar. verbotenesGefunden() prüft jede Antwort,
//     bevor sie hinausgeht, denn ein Kommentar wird beim nächsten ergänzten
//     Feld gebrochen, ohne dass es jemand merkt.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const pp = require('../utils/phalanxProjekt');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

// ── Die Nummer ─────────────────────────────────────────────────────────────
ok('30342 ist gültig und gehört zu Beratung',
  pp.nummerLesen('30342').nummer === '30342' && pp.nummerLesen('30342').kategorie === 'Beratung');
ok('10001 gehört zu Kapitalisierung', pp.nummerLesen('10001').kategorie === 'Kapitalisierung');
ok('Leerzeichen stören nicht', pp.nummerLesen('  30342  ').nummer === '30342');
ok('leer heisst: keine Zuordnung', pp.nummerLesen('').nummer === null && !pp.nummerLesen('').fehler);
ok('vier Ziffern genügen nicht', !!pp.nummerLesen('3034').fehler);
ok('sechs Ziffern auch nicht', !!pp.nummerLesen('303421').fehler);
ok('Buchstaben nicht', !!pp.nummerLesen('3034a').fehler);
ok('eine unbekannte Kategorie wird benannt', /"99" gibt es nicht/.test(pp.nummerLesen('99001').fehler));
ok('und die möglichen werden aufgezählt', /Beratung/.test(pp.nummerLesen('99001').fehler));

// ── Was hinausgeht ─────────────────────────────────────────────────────────
{
  // Bewusst ein Satz, wie ihn die Abfrage liefert, mit allem, was an einem
  // Mandat hängt. Eine erfundene Minimalzeile würde genau das nicht prüfen,
  // worum es geht.
  const mandat = {
    id: 7, codename: 'FARADAY', status: 'active', mandate_type: 'ma', deal_type: 'Nachfolge',
    phalanx_projekt_nummer: '30343', created_at: '2026-01-01', updated_at: '2026-10-03',
    interessenten: 12, nda_unterschrieben: 8, datenraum_freigegeben: 3,
    letzte_aktivitaet_am: '2026-10-02',
    // Das alles darf die Anwendung nicht verlassen:
    seller_name: 'Hans Mustermann', company_name: 'Muster Elektrotechnik GmbH',
    short_description: 'Etablierter Elektrotechnikdienstleister', full_description: 'lang',
    contact_email: 'inhaber@muster.de',
  };
  const raus = pp.mandatNachAussen(mandat);
  ok('die Nummer geht hinaus', raus.nummer === '30343');
  ok('der Codename auch, er ist ja die Anonymisierung', raus.codename === 'FARADAY');
  ok('die Zahlen gehen hinaus', raus.stand.interessenten === 12 && raus.stand.nda_unterschrieben === 8);

  const text = JSON.stringify(raus);
  ok('kein Name des Verkäufers', !/Mustermann/.test(text));
  ok('kein Firmenname', !/Muster Elektrotechnik/.test(text));
  ok('keine Beschreibung', !/Elektrotechnikdienstleister/.test(text));
  ok('keine E-Mail-Adresse', !/@/.test(text));
  ok('und die Prüfung findet nichts Unerwartetes', pp.verbotenesGefunden(raus).length === 0);

  // Der Wächter muss anschlagen, sonst wäre er wertlos.
  ok('ein zusätzliches Feld wird erkannt',
    pp.verbotenesGefunden({ ...raus, seller_name: 'X' }).includes('seller_name'));
  ok('auch eines im Block "stand"',
    pp.verbotenesGefunden({ ...raus, stand: { ...raus.stand, kaeufer_namen: [] } }).includes('stand.kaeufer_namen'));
}

// ── Was hereinkommt ────────────────────────────────────────────────────────
{
  const felder = pp.uebernahmeFelder({
    nummer: '30342', name: 'Eigen M&A Funding ika ika', kategorie: 'Beratung', phase: 'Angebot',
    // Ein Angreifer oder ein Fehler auf der anderen Seite schickt mehr:
    codename: 'KLARNAME GmbH', status: 'archived', short_description: 'etwas anderes',
  });
  ok('der Projektname wird übernommen', felder.phalanx_projekt_name === 'Eigen M&A Funding ika ika');
  ok('der Codename nicht', !('codename' in felder));
  ok('der Status nicht', !('status' in felder));
  ok('die Beschreibung nicht', !('short_description' in felder));
  ok('der Zeitpunkt wird gesetzt', !!felder.phalanx_sync_am);
  ok('ein alter Fehler wird gelöscht', felder.phalanx_sync_fehler === null);
  ok('der Codename steht auf der Unantastbar-Liste', pp.UNANTASTBAR.includes('codename'));
}

// ── Die Route ──────────────────────────────────────────────────────────────
{
  const route = fs.readFileSync(path.join(__dirname, '..', 'routes', 'extern.js'), 'utf8');
  ok('ohne Schlüssel ist die Schnittstelle abgeschaltet, nicht offen',
    /if \(!erwartet\)[\s\S]{0,120}503/.test(route));
  ok('der Schlüssel wird zeitgleich verglichen', /unterschied \|=/.test(route));
  ok('der Schlüssel steht nur in der Umgebung', /process\.env\.PHALANX_OS_SYNC_KEY/.test(route)
    && !/PHALANX_OS_SYNC_KEY\s*=\s*'/.test(route));
  ok('der abgewiesene Versuch wird protokolliert, nicht der Schlüssel',
    /Abgleich abgewiesen/.test(route) && !/console\.(log|warn)\([^)]*gegeben/.test(route));
  ok('die Antwort wird vor dem Senden geprüft', /verbotenesGefunden\(satz\)/.test(route));
  ok('und im Zweifel zurückgehalten', /zurückgehalten/.test(route));
  ok('ein unbekanntes Mandat wird nicht angelegt', /Angelegt wird über diesen Weg nichts/.test(route));
  ok('Unantastbares wird doppelt entfernt', /for \(const k of pp\.UNANTASTBAR\) delete felder\[k\]/.test(route));
  ok('es wird nichts gelöscht', !/DELETE FROM/.test(route));

  const admin = fs.readFileSync(path.join(__dirname, '..', 'routes', 'admin.js'), 'utf8');
  const setzen = admin.slice(admin.indexOf("'/projects/:id/phalanx-nummer'"), admin.indexOf("router.put('/projects/:id',"));
  ok('die Nummer lässt sich von Hand setzen', setzen.length > 200);
  ok('zwei Mandate bekommen nicht dieselbe Nummer', /haengt bereits am Mandat/.test(setzen));
  ok('und der Hinweis täuscht keine Prüfung vor, die es noch nicht gibt',
    /sobald der Abgleich steht/.test(setzen));

  const wanderung = fs.readFileSync(path.join(__dirname, '..', 'db', 'migrations', '20260901001770_phalanx_projektnummer.js'), 'utf8');
  ok('die Spalten kommen nur dazu, wenn sie fehlen', /hasColumn\('projects', name\)/.test(wanderung));
  ok('die Nummer ist je Mandant eindeutig', /CREATE UNIQUE INDEX/.test(wanderung));
  ok('Mandate ohne Nummer stören einander nicht', /WHERE phalanx_projekt_nummer IS NOT NULL/.test(wanderung));
}

process.exit(fail ? 1 : 0);
