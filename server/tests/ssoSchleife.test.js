// ─────────────────────────────────────────────────────────────────────────────
// Die Endlosschleife beim Anmelden über Phalanx OS (v0.450).
//
// Eine Regression aus v0.444, der Gastansicht. Der Ablauf:
//
//   1. In der Gastansicht wird das Token bewusst nicht mitgeschickt, damit man
//      sieht, was ein nicht angemeldeter Besucher sieht.
//   2. Die Anmeldung über Phalanx OS legt ein Token im Speicher ab und leitet
//      auf /admin.
//   3. Dort ist niemand angemeldet, denn das Token wird ja nicht geschickt.
//      ProtectedRoute schickt auf /login.
//   4. Dort klickt man „Mit Phalanx OS anmelden", und es geht von vorn los.
//
// Jeder Schritt für sich ist richtig. Zusammen ergeben sie einen Kreis, aus
// dem man ohne Kenntnis des sessionStorage nicht herausfindet, und genau das
// ist die unangenehmste Art von Fehler: Er entsteht aus zwei Entscheidungen,
// die einzeln jede für sich vernünftig sind.
//
// Die Regel, die den Kreis aufbricht: Wer sich anmeldet, will keine Vorschau.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..', 'client', 'src');
const sso = fs.readFileSync(path.join(wurzel, 'pages', 'SsoCallback.jsx'), 'utf8');
const ctx = fs.readFileSync(path.join(wurzel, 'context', 'AuthContext.jsx'), 'utf8');
const klient = fs.readFileSync(path.join(wurzel, 'api', 'client.js'), 'utf8');
const app = fs.readFileSync(path.join(wurzel, 'App.jsx'), 'utf8');

// ── Der Kreis ist an vier Stellen aufgebrochen ─────────────────────────────
ok('die SSO-Landeseite beendet die Gastansicht', /setzeGastansicht\(false\)/.test(sso));
ok('und zwar bevor das Token gelesen wird',
  sso.indexOf('setzeGastansicht(false)') < sso.indexOf("hash.match(/token="));
ok('auf der Anmeldeseite endet sie ebenfalls', /\['\/login', '\/sso'\]\.includes\(pfad\)/.test(ctx));
ok('die Anmeldung mit Passwort beendet sie', /const login = async[\s\S]{0,120}setzeGastansicht\(false\)/.test(ctx));
ok('der zweite Faktor auch', /const loginTwoFactor = async[\s\S]{0,120}setzeGastansicht\(false\)/.test(ctx));
ok('die Registrierung auch', /const register = async[\s\S]{0,120}setzeGastansicht\(false\)/.test(ctx));

// ── Die Gastansicht selbst bleibt, wie sie war ─────────────────────────────
ok('im Gastmodus wird weiterhin kein Token geschickt', /if \(istGastansicht\(\)\) return null;/.test(klient));
ok('sie lebt nur in der Sitzung', /sessionStorage/.test(klient) && !/localStorage\.setItem\(GAST_SCHLUESSEL/.test(klient));
ok('und der Hinweisbalken steht weiter auf jeder Seite', /<GastBalken \/>/.test(app));

// ── Der Weg aus dem Kreis ist auch ohne Kenntnis der Technik begehbar ──────
{
  const komp = fs.readFileSync(path.join(wurzel, 'components', 'AnsichtPruefen.jsx'), 'utf8');
  ok('es gibt einen sichtbaren Weg zurück', /Ansicht beenden/.test(komp));
  ok('und der Balken sagt, was gerade gilt', /nicht angemeldeter Besucher sieht/.test(komp));
}

// ── Was die Schleife NICHT war ─────────────────────────────────────────────
//
// Festgehalten, damit die nächste Suche nicht wieder dort anfängt: Der
// Fehlerweg im SSO leitet auf /login?sso_error=… und bleibt dort. Ein
// fehlgeschlagener Austausch erzeugt also keine Schleife, sondern eine
// Meldung. Und ProtectedRoute schickt einen angemeldeten Nutzer ohne
// Adminrecht auf /dashboard, nicht auf /login.
{
  const auth = fs.readFileSync(path.join(__dirname, '..', 'utils', 'phalanxsso.js'), 'utf8');
  ok('ein Fehler im SSO endet auf der Anmeldeseite mit Grund', /login\?sso_error=/.test(auth));
  ok('ohne Adminrecht geht es aufs Dashboard, nicht zur Anmeldung',
    /adminOnly && !\['super_admin', 'advisor'\]\.includes\(user\.role\)\) return <Navigate to="\/dashboard"/.test(app));
}

process.exit(fail ? 1 : 0);
