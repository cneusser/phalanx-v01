// ─────────────────────────────────────────────────────────────────────────────
// Der Abschnitt, den es scheinbar nicht gab (v0.467)
//
// Anlass: Eine englische Fassung des Exposés sollte gepflegt werden. Der
// Abschnitt „Übersetzungen der Mandate" in der Datenpflege war nicht da.
//
// Er fehlte nicht, er war kaputt: GET /pflege/uebersetzungen antwortete in
// der Produktion mit 500, und die Oberfläche fing das mit einem leeren catch
// ab, kommentiert mit „erst nach der Migration da". Dieser Kommentar war die
// Erklärung, die das Nachsehen ersetzt hat.
//
// Ein verschluckter Fehler sieht aus wie eine fehlende Funktion. Das ist das
// Muster dieser Woche, zum vierten Mal.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const lies = (...p) => fs.readFileSync(path.join(wurzel, ...p), 'utf8');

const route = lies('server', 'routes', 'stammdaten.js');
const ui = lies('client', 'src', 'pages', 'Datenpflege.jsx');
const nachzug = lies('server', 'db', 'migrations', '20260901002050_zweisprachig_nachziehen.js');

console.log('\n── Die Oberfläche verschweigt nichts mehr ──');
ok('das leere catch ist weg', !/catch \{ \/\* erst nach der Migration da \*\/ \}/.test(ui));
ok('der Fehler wird festgehalten', /setSprachenFehler\(e\.message/.test(ui));
ok('und angezeigt', /\{sprachenFehler && \(/.test(ui));
ok('unter derselben Überschrift wie der Abschnitt selbst',
  (ui.match(/Übersetzungen der Mandate/g) || []).length >= 2);

console.log('\n── Die Abfrage sagt, was fehlt ──');
const a = route.slice(route.indexOf("router.get('/uebersetzungen'"), route.indexOf("router.put('/uebersetzungen/:id'"));
ok('sie prüft die Spalten, bevor sie sie abfragt', /information_schema\.columns/.test(a));
ok('sie prüft genau die benötigten', /\.\.\.UEBERSETZBAR, \.\.\.UEBERSETZBAR\.map/.test(a));
ok('eine fehlende Spalte ergibt 503 und keinen Absturz', /status\(503\)[\s\S]{0,200}SPALTEN_FEHLEN/.test(a));
ok('die fehlenden Spalten werden benannt', /Es fehlen: \$\{fehlend\.join/.test(a));
ok('und es steht dabei, was zu tun ist', /Wanderung erneut ausführen/.test(a));

console.log('\n── Die Wanderung prüft den Endzustand ──');
ok('sie legt nach, was fehlt', /hasColumn\(tabelle, en\)/.test(nachzug));
ok('sie setzt die deutsche Spalte nicht voraus, sondern prüft sie',
  /if \(!\(await knex\.schema\.hasColumn\(tabelle, spalte\)\)\) continue/.test(nachzug));
ok('Status und Zeitpunkt werden einzeln geprüft',
  /hasColumn\(tabelle, 'uebersetzung_status'\)/.test(nachzug) && /hasColumn\(tabelle, 'uebersetzt_am'\)/.test(nachzug));
ok('auch die Ausgangssprache', /hasColumn\('projects', 'sprache'\)/.test(nachzug));
ok('mehrfaches Ausführen schadet nicht', /Mehrfaches Ausführen schadet nicht/.test(nachzug));
ok('sie meldet, was sie angelegt hat', /Zweisprachigkeit nachgezogen/.test(nachzug));
ok('sie hat bewusst keinen Rückweg', /exports\.down = async function \(\) \{\};/.test(nachzug));
ok('und der Verzicht ist begründet', /den Fehler wiederherzustellen/.test(nachzug));

console.log(fail ? `\n${fail} Fehler` : '\nAlles grün');
process.exit(fail ? 1 : 0);
