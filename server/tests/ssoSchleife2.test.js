// ─────────────────────────────────────────────────────────────────────────────
// Die zweite Anmeldeschleife (v0.465)
//
// Anlass: „Beim Login über Phalanx OS erscheint immer wieder der
// Login-Screen." Auf dem Bildschirm stand kein Grund, obwohl das System an
// jeder Stelle genau weiss, woran es scheitert.
//
// Drei Stellen warfen Auskünfte weg:
//
//   1. Die Nutzerabfrage in der Anmeldeprüfung konnte eine Ausnahme werfen.
//      Daraus wurde irgendein Fehler, kein 401, und die Oberfläche behandelte
//      ihn trotzdem wie „nicht angemeldet".
//   2. Die Oberfläche warf das Token bei JEDEM Fehler weg, auch bei einem
//      Serverfehler. Dann meldet man sich neu an und scheitert an derselben
//      Stelle: die Schleife.
//   3. Die Landeseite leitete blind weiter. Schlug es danach fehl, kam der
//      Benutzer auf der Anmeldeseite an, und zwar ohne Begründung, weil die
//      Umleitung aus der Anwendung kam und nicht aus dem Anmeldeverfahren.
//
// Der gemeinsame Nenner, und das ist die Lehre: Eine Panne ist nicht dasselbe
// wie „nicht angemeldet", und sie darf nicht so behandelt werden.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const lies = (...p) => fs.readFileSync(path.join(wurzel, ...p), 'utf8');

const wache = lies('server', 'middleware', 'auth.js');
const sso = lies('server', 'utils', 'phalanxsso.js');
const ctx = lies('client', 'src', 'context', 'AuthContext.jsx');
const landung = lies('client', 'src', 'pages', 'SsoCallback.jsx');
const login = lies('client', 'src', 'pages', 'Login.jsx');

// ── 1. Panne ist nicht abgemeldet ────────────────────────────────────────
console.log('\n── Panne ist nicht abgemeldet ──');
ok('die Nutzerabfrage ist abgesichert', /try \{\s*\n\s*user = await lookupUser/.test(wache));
ok('sie antwortet mit 503, nicht mit 401', /status\(503\)[\s\S]{0,200}LOOKUP_FAILED/.test(wache));
ok('und sagt, dass es nicht an den Zugangsdaten liegt',
  /liegt nicht an Ihren Zugangsdaten/.test(wache));
ok('die Meldung der Datenbank wird mitgegeben', /\$\{e\.message\}/.test(wache));
ok('ein wirklich unbekannter Nutzer bekommt weiterhin 401',
  /if \(!user \|\| !user\.is_active\)[\s\S]{0,120}status\(401\)/.test(wache));

// ── 2. Die Oberfläche wirft das Token nicht mehr bei jedem Fehler weg ───
console.log('\n── Das Token bleibt liegen ──');
ok('nur 401 führt zum Abmelden', /if \(e && e\.status && e\.status !== 401\)/.test(ctx));
ok('bei allem anderen wird der Grund gezeigt', /setFehler\(e\.message/.test(ctx));
ok('und der Grund steht der ganzen Anwendung zur Verfügung', /user, loading, fehler, login/.test(ctx));
ok('der Rückweg über das eigene Admin-Token bleibt erhalten', /phalanx_admin_token/.test(ctx));

// ── 3. Die Landeseite prüft, bevor sie weiterleitet ─────────────────────
console.log('\n── Erst prüfen, dann weiterleiten ──');
ok('sie fragt einmal nach', /api\.get\('\/auth\/me'\)/.test(landung));
ok('sie leitet erst danach weiter', landung.indexOf("api.get('/auth/me')") < landung.indexOf('window.location.replace'));
ok('Mitarbeitende kommen in die Verwaltung, andere in ihren Bereich',
  /intern \? '\/admin' : '\/dashboard'/.test(landung));
ok('bei 401 wird das Token entfernt und der Grund genannt',
  /e\.status === 401/.test(landung) && /nicht anerkannt/.test(landung));
ok('bei allem anderen bleibt es liegen', /lässt sich aber nicht laden/.test(landung));
ok('es wird nicht mehr blind umgeleitet', !/localStorage\.setItem\('phalanx_token'[\s\S]{0,80}window\.location\.replace/.test(landung));

// ── 4. Der Grund wird festgehalten und benannt ──────────────────────────
console.log('\n── Der Grund ──');
ok('jeder abgewiesene Versuch wird protokolliert', /SSO_ABGEWIESEN/.test(sso));
ok('mit Einzelheiten, nicht nur mit einem Schlagwort', /einzelheiten/.test(sso));
ok('bei fehlendem Konto steht dabei, welche Adresse Phalanx OS gemeldet hat',
  /Phalanx OS meldet \$\{email/.test(sso));
ok('und ob sie dort bestätigt ist', /nicht bestaetigt/.test(sso));
ok('bei falscher Rolle steht die Rolle dabei', /Rolle \$\{user\.role\}/.test(sso));
ok('beim Tokentausch der Statuscode', /HTTP \$\{tokRes\.status\}/.test(sso));
ok('der Grund steht auch im Laufzeitprotokoll', /console\.warn\(`SSO abgewiesen/.test(sso));

console.log('\n── Auf der Anmeldeseite ──');
ok('die Gründe stehen im Klartext', /const SSO_GRUND = \{/.test(login));
ok('kein_staff_konto wird erklärt', /nicht als Mitarbeiterkonto geführt/.test(login));
ok('kein_konto nennt den Ausweg', /wenden Sie sich an die Verwaltung/.test(login));
ok('sitzung_abgelaufen erklärt das Zeitfenster', /zu lange gedauert/.test(login));
ok('der Hinweis hängt nicht mehr am eingeschalteten SSO-Block',
  login.indexOf('{ssoError && (') < login.indexOf('{ssoEnabled && !challenge && ('));
ok('ein unbekannter Schlüssel wird trotzdem angezeigt', /SSO_GRUND\[ssoError\] \|\| ssoError/.test(login));

console.log(fail ? `\n${fail} Fehler` : '\nAlles grün');
process.exit(fail ? 1 : 0);
