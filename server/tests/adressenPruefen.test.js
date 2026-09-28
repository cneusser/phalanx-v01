// ─────────────────────────────────────────────────────────────────────────────
// Startprüfung der öffentlichen Adressen.
//
// Der Fall, der sie ausgelöst hat, steht ganz oben: FRONTEND_URL zeigte auf
// die interne Railway-Adresse. Aufgefallen ist es beim Login über Phalanx OS,
// gestanden hätte dieselbe Adresse aber in jedem Maillink.
// ─────────────────────────────────────────────────────────────────────────────
const { pruefe, pruefeUndMelde } = require('../utils/adressenPruefen');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };
const fehler = (env) => pruefe(env).filter((f) => f.schwere === 'fehler');

// ── Der echte Fall ────────────────────────────────────────────────────────
const echt = { NODE_ENV: 'production', FRONTEND_URL: 'https://phalanx-v01-production.up.railway.app' };
ok('die interne Railway-Adresse wird beanstandet', fehler(echt).length === 1);
ok('die Meldung nennt die richtige Adresse', /capitalmatch\.de/.test(fehler(echt)[0].text));
ok('die Meldung erklärt die Folge für Maillinks', /Maillink/i.test(fehler(echt)[0].text));

// ── Was in Ordnung ist, bleibt still ──────────────────────────────────────
ok('die richtige Adresse ergibt keine Beanstandung',
  pruefe({ NODE_ENV: 'production', FRONTEND_URL: 'https://www.capitalmatch.de' }).length === 0);
ok('ein Schrägstrich am Ende stört nicht',
  pruefe({ NODE_ENV: 'production', FRONTEND_URL: 'https://www.capitalmatch.de/' }).length === 0);
ok('ohne FRONTEND_URL greift der eingebaute Rückfall',
  pruefe({ NODE_ENV: 'production' }).length === 0);

// ── In der Entwicklung ist localhost richtig, nicht falsch ────────────────
ok('localhost in der Entwicklung ist in Ordnung',
  pruefe({ NODE_ENV: 'development', FRONTEND_URL: 'http://localhost:5173' }).length === 0);
ok('localhost in Produktion dagegen nicht',
  fehler({ NODE_ENV: 'production', FRONTEND_URL: 'http://localhost:5173' }).length > 0);

// ── Die Rückkehradresse muss zur Oberfläche passen ────────────────────────
const schief = {
  NODE_ENV: 'production',
  FRONTEND_URL: 'https://www.capitalmatch.de',
  PHALANX_OS_REDIRECT_URI: 'https://phalanx-v01-production.up.railway.app/api/auth/phalanx/callback',
};
ok('eine Rückkehradresse auf fremdem Rechnernamen wird beanstandet', fehler(schief).length === 1);
ok('die Meldung erklärt, dass der Nutzer dann abgemeldet bleibt',
  /abgemeldet|angemeldet/.test(fehler(schief)[0].text));
ok('die zusammenpassende Rückkehradresse ist still',
  pruefe({ NODE_ENV: 'production', FRONTEND_URL: 'https://www.capitalmatch.de',
    PHALANX_OS_REDIRECT_URI: 'https://www.capitalmatch.de/api/auth/phalanx/callback' }).length === 0);

// ── Unsinnige Werte ───────────────────────────────────────────────────────
ok('kaputte Adresse wird beanstandet',
  fehler({ NODE_ENV: 'production', FRONTEND_URL: 'nicht mal eine url' }).length > 0);
ok('http statt https in Produktion wird beanstandet',
  fehler({ NODE_ENV: 'production', FRONTEND_URL: 'http://www.capitalmatch.de' }).length > 0);

// ── Die Prüfung darf den Start nicht verhindern ───────────────────────────
const gesammelt = [];
const stumm = { error: (m) => gesammelt.push(m), warn: (m) => gesammelt.push(m) };
let geworfen = null;
try { pruefeUndMelde(echt, stumm); } catch (e) { geworfen = e; }
ok('die Prüfung wirft nicht', geworfen === null);
ok('sie schreibt die Beanstandung ins Protokoll', gesammelt.length === 1 && /❌/.test(gesammelt[0]));

// ── Sie ist auch wirklich eingehängt ──────────────────────────────────────
const fs = require('fs');
const path = require('path');
const index = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
ok('beim Hochfahren wird geprüft', /adressenPruefen'\)\.pruefeUndMelde\(\)/.test(index));

process.exit(fail ? 1 : 0);
