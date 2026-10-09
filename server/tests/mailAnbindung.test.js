// ─────────────────────────────────────────────────────────────────────────────
// Mail und Plattform zusammenbringen (v0.451).
//
// Zwei Lücken, die derselbe Vorgang aufgedeckt hat: Eine Kundenmail geht an
// info@phalanx.de, darin wird nach dem Informationsmemorandum gefragt.
//
//   1. Wird diese Mail an die Plattform weitergeleitet, ist der Absender die
//      eigene Adresse. Die Zuordnung über den Absender findet den Kunden
//      nicht, die Mail landet als „unbekannter Absender" im Protokoll und beim
//      Kontakt gar nicht.
//   2. Antwortet man mit einem Verweis auf ein Dokument, trifft der Link
//      jemanden, der nicht angemeldet ist. Er sieht den Teaser, findet das
//      Dokument nicht und hält den Link für kaputt.
//
// Beim ersten Punkt kommt es auf die Reihenfolge an: Der echte Absender hat
// immer Vorrang. Eine zitierte Mail im Text darf niemals eine direkte Antwort
// überschreiben, denn eine falsch zugeordnete Nachricht ist schlimmer als eine
// nicht zugeordnete.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..');
const quelle = fs.readFileSync(path.join(wurzel, 'utils', 'inbound.js'), 'utf8');

// Die reine Funktion herauslösen: inbound.js selbst braucht eine Datenbank,
// und eine Prüfung, die dafür eine Datenbank verlangt, läuft nirgends.
const code = quelle.slice(quelle.indexOf('function parseAddress'), quelle.indexOf('// Zitierte Passagen'))
  + quelle.slice(quelle.indexOf('const WEITERLEITUNG'), quelle.indexOf('// Kernlogik'))
  + '; module.exports = { urspruenglicherAbsender, parseAddress };';
const tmp = path.join(require('os').tmpdir(), `wl_${process.pid}.js`);
fs.writeFileSync(tmp, code);
const { urspruenglicherAbsender } = require(tmp);

// ── Die gängigen Weiterleitungsköpfe ───────────────────────────────────────
const FAELLE = [
  ['Outlook deutsch', 'Lieber Herr Neusser,\n\n-----Ursprüngliche Nachricht-----\n'
    + 'Von: Christoph Picker <c.picker@beispiel.de>\nGesendet: Dienstag, 7. Oktober 2026\n'
    + 'An: info@phalanx.de\nBetreff: FARADAY\n\nich habe das NDA unterzeichnet.'],
  ['Apple Mail', '---------- Weitergeleitete Nachricht ----------\n'
    + 'Von: Christoph Picker <c.picker@beispiel.de>\nDatum: 7. Oktober 2026\n\nText'],
  ['Gmail englisch', '---------- Forwarded message ---------\n'
    + 'From: Christoph Picker <c.picker@beispiel.de>\nDate: Tue, 7 Oct 2026\n\nText'],
  ['zitiert mit Grösserzeichen', '> Von: Christoph Picker <c.picker@beispiel.de>\n> Betreff: FARADAY'],
];
for (const [name, text] of FAELLE) {
  ok(`${name}: der ursprüngliche Absender wird gefunden`,
    urspruenglicherAbsender(text) === 'c.picker@beispiel.de');
}

ok('eine gewöhnliche Antwort hat keinen solchen Kopf',
  urspruenglicherAbsender('Guten Tag, anbei meine Antwort. Viele Grüße') === null);
ok('ein Text ohne Adresse ergibt nichts',
  urspruenglicherAbsender('---------- Weitergeleitete Nachricht ----------\nVon: Christoph Picker\n') === null);
ok('leer ergibt nichts', urspruenglicherAbsender('') === null && urspruenglicherAbsender(null) === null);

// ── Die Reihenfolge ist die eigentliche Zusage ─────────────────────────────
{
  const kern = quelle.slice(quelle.indexOf('async function ingestReply'), quelle.indexOf('const project ='));
  ok('zuerst wird der echte Absender gesucht', /await matchContact\(fromAddr\)/.test(kern));
  ok('erst danach der ursprüngliche', kern.indexOf('matchContact(fromAddr)') < kern.indexOf('urspruenglicherAbsender'));
  ok('und nur, wenn der erste nichts fand', /if \(!contact && !contactId\)/.test(kern));
  ok('eine manuelle Erfassung wird nicht übergangen', /!contactId/.test(kern));
  ok('derselbe Absender zählt nicht als Weiterleitung', /original !== fromAddr/.test(kern));
  ok('unbekannt bleibt unbekannt, es wird nichts angelegt', /nicht raten, nicht anlegen/.test(quelle));

  ok('in der Historie steht der Kunde als Absender, nicht das eigene Haus',
    /weitergeleitetVon \? \(contact\.email \|\| fromAddr\)/.test(quelle));
  ok('und der Weg ist am Text vermerkt', /\[weitergeleitet über \$\{weitergeleitetVon\}\]/.test(quelle));
}

// ── Der Dokumentverweis aus einer Mail ─────────────────────────────────────
{
  const seite = fs.readFileSync(path.join(wurzel, '..', 'client', 'src', 'pages', 'ProjectDetail.jsx'), 'utf8');
  ok('ein Verweis ohne Anmeldung führt zur Anmeldung', /login\?redirect=\$\{encodeURIComponent\(ziel\)\}/.test(seite));
  ok('nur bei einem Dokumentverweis', /if \(!p\.get\('dok'\)\) return;/.test(seite));
  ok('und nicht, während das Profil noch geladen wird', /if \(user \|\| authLaeuft\) return;/.test(seite));

  const login = fs.readFileSync(path.join(wurzel, '..', 'client', 'src', 'pages', 'Login.jsx'), 'utf8');
  ok('die Anmeldeseite kennt das Ziel', /redirect && redirect\.startsWith\('\/'\)/.test(login));
  ok('und nimmt nur Ziele innerhalb der Anwendung', /startsWith\('\/'\)/.test(login));

  // Die Freigabe entscheidet weiterhin der Server, nicht der Link.
  const safe = fs.readFileSync(path.join(wurzel, 'routes', 'safe.js'), 'utf8');
  const pfad = safe.slice(safe.indexOf('/item/:id/pfad'), safe.indexOf('In einen anderen Ordner verschieben'));
  ok('ein Verweis ist weiterhin keine Freigabe', /darfObjekt\(req, item\.id, 'view'\)/.test(pfad));
  ok('und der Aufruf steht im Zugriffsprotokoll', /logSafeAccess/.test(pfad));
}

try { fs.unlinkSync(tmp); } catch { /* egal */ }
process.exit(fail ? 1 : 0);
