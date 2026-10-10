// ─────────────────────────────────────────────────────────────────────────────
// Ansicht prüfen: Was sehen andere wirklich? (v0.444)
//
// Die wichtigste Entscheidung hier ist eine Weglassung: Es gibt keine Ansicht
// „als Käufer". Was ein Käufer sieht, hängt nicht an seiner Rolle, sondern an
// unterschriebener Vereinbarung, Datenraum-Freigabe und Einzelfreigaben. Zwei
// Käufer sehen Verschiedenes. Eine gespielte Rolle gäbe also eine Auskunft, die
// niemandem entspricht, und wäre damit schlechter als gar keine Funktion: Man
// würde sich auf sie verlassen.
//
// Deshalb zwei Wege, die beide echt sind:
//   · als nicht angemeldeter Besucher (für alle gleich, also zeigbar)
//   · als eine bestimmte Person (Birdview, die es schon gab)
//
// In beiden Fällen entscheidet der Server, nicht die Oberfläche. Eine Ansicht,
// die im Browser nachbaut, was jemand sehen dürfte, prüft die Oberfläche gegen
// sich selbst und übersieht genau die Lücken, um die es geht.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const admin = fs.readFileSync(path.join(wurzel, 'server', 'routes', 'admin.js'), 'utf8');
const klient = fs.readFileSync(path.join(wurzel, 'client', 'src', 'api', 'client.js'), 'utf8');
const ctx = fs.readFileSync(path.join(wurzel, 'client', 'src', 'context', 'AuthContext.jsx'), 'utf8');
const komp = fs.readFileSync(path.join(wurzel, 'client', 'src', 'components', 'AnsichtPruefen.jsx'), 'utf8');
const app = fs.readFileSync(path.join(wurzel, 'client', 'src', 'App.jsx'), 'utf8');
const markt = fs.readFileSync(path.join(wurzel, 'client', 'src', 'pages', 'Projects.jsx'), 'utf8');

// ── Die Auswahl ist nur für Verwaltende ────────────────────────────────────
const route = admin.slice(admin.indexOf("'/birdview/nutzer'"), admin.indexOf("'/birdview/nutzer'") + 1400);
ok('die Nutzerauswahl verlangt Adminrecht', /'\/birdview\/nutzer', \.\.\.isAdmin/.test(admin));
ok('die Rolle wird gegen eine Liste geprüft statt in die Abfrage gereicht', /erlaubt\.includes\(rolle\)/.test(route));
ok('man selbst steht nicht in der Liste', /u\.id <> \?/.test(route));
ok('nur aktive Konten', /u\.is_active = 1/.test(route));
ok('die Liste zeigt, woran die Sicht wirklich hängt', /dataroom_granted/.test(route));

// ── Gastansicht: das Token bleibt liegen, wird aber nicht gesendet ─────────
ok('im Gastmodus wird kein Token mitgeschickt', /if \(istGastansicht\(\)\) return null;/.test(klient));
ok('die Gastansicht endet mit dem Fenster', /sessionStorage/.test(klient));
ok('und sie wird nicht im dauerhaften Speicher abgelegt', !/localStorage\.setItem\(GAST_SCHLUESSEL/.test(klient));
ok('im Gastmodus gilt niemand als angemeldet', /if \(istGastansicht\(\)\) \{ setLoading\(false\); return; \}/.test(ctx));
ok('es gibt einen Weg zurück', /beendeGastansicht/.test(ctx) && /beendeGastansicht/.test(komp));
ok('und einen sichtbaren Hinweis auf jeder Seite', /<GastBalken \/>/.test(app));

// ── Keine gespielte Rolle ──────────────────────────────────────────────────
ok('die Oberfläche erklärt, warum es keine Rollenansicht gibt',
  /hängt nicht an seiner\s*\n?\s*Rolle/.test(komp) || /hängt nicht an seiner Rolle/.test(komp));
ok('gewählt wird eine Person, nicht eine Rolle', /startBirdview\(p\.id\)/.test(komp));
ok('die Ansicht hängt auf dem Marktplatz', /<AnsichtPruefen C=\{C\} \/>/.test(markt));

// ── Die Birdview führte auf die Anmeldeseite (v0.459) ────────────────────
//
// Das ausgestellte Token trug keinen tv-Anspruch und galt damit als
// Token-Version 0. Beim Zielnutzer steht die Version höher, sobald er einmal
// das Passwort zurückgesetzt hat; die Anmeldeprüfung wies das frische Token
// deshalb als „Sitzung abgelaufen" ab. Die Oberfläche warf es weg, und der
// Betrachter stand ohne eigene Sitzung auf der Anmeldeseite. Die Funktion
// arbeitete also nur bei Personen, die ihr Passwort nie geändert hatten.
console.log('\n── Token-Version im Birdview ──');
ok('das Birdview-Token trägt die Token-Version des Zielnutzers',
  /tv: target\.token_version \|\| 0/.test(admin));
ok('und sie wird dafür auch gelesen',
  /SELECT id, email, role, first_name, last_name, is_active, token_version FROM users/.test(admin));
ok('ein gescheitertes Token kostet nicht die eigene Sitzung',
  /phalanx_admin_token/.test(ctx) && /const eigenes = localStorage\.getItem\('phalanx_admin_token'\)/.test(ctx));

console.log(fail ? `\n${fail} Fehler` : '\nAlles grün');
process.exit(fail ? 1 : 0);
