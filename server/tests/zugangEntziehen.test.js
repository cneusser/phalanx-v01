// ─────────────────────────────────────────────────────────────────────────────
// Zugang entziehen (v0.440).
//
// Anlass: „Ich würde gerne dem Kunden den Zugang entziehen. Wenn ich darauf
// klicke passiert nichts." Es passierte etwas, nur sah es niemand. Drei Fehler
// lagen übereinander:
//
//   1. Die Prüfung auf ein Nutzerkonto galt für beide Richtungen. Freigeben
//      ohne Konto geht nicht, entziehen sehr wohl. Und das Entziehen ist die
//      Richtung, die im Zweifel sofort funktionieren muss.
//   2. Gesucht wurde nur das über die E-Mail gefundene Konto. Die Freigabe
//      selbst hängt an crm_contacts.user_id. Weicht die Adresse ab, ist der
//      Zugang da, das Konto aber scheinbar nicht.
//   3. Die Rückmeldung ging an die Seite unter der Schublade und wurde von ihr
//      verdeckt. Auch jede Fehlermeldung von dort war unsichtbar.
//
// Der dritte Fehler ist der schwerste, denn er betraf nicht nur diesen Knopf,
// sondern jede Rückmeldung aus der Kontaktansicht.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const drawer = fs.readFileSync(path.join(wurzel, 'client', 'src', 'components', 'ContactDrawer.jsx'), 'utf8');
const admin = fs.readFileSync(path.join(wurzel, 'server', 'routes', 'admin.js'), 'utf8');

const fn = drawer.slice(drawer.indexOf('async function grantDataroom'), drawer.indexOf('async function setDoNotContact'));

// ── 1 und 2: das Entziehen darf nicht am Konto scheitern ────────────────────
ok('für die Kennung zählt auch die am Kontakt hinterlegte', /data\.account\?\.id \|\| k\?\.user_id/.test(fn));
ok('ohne Kennung wird beim Entziehen nicht zum Einladen geraten',
  /keine Nutzerkennung hinterlegt/.test(fn));
ok('die Rückfrage nennt die Person', /Datenraum-Zugang für \$\{wer\} entziehen/.test(fn));
ok('und sagt, was endet', /Q&A endet sofort/.test(fn));

// ── 3: die Rückmeldung muss sichtbar sein ──────────────────────────────────
ok('die Schublade hat eine eigene Meldungszeile', /eigeneMeldung/.test(drawer));
ok('die über der Schublade liegt', /zIndex: 1200/.test(drawer));
ok('und die Seite darunter bekommt sie weiterhin', /showAussen === 'function'/.test(drawer));
ok('die Schublade selbst liegt darunter', /zIndex: 1100/.test(drawer));

// ── Ehrliche Rückmeldung vom Server ────────────────────────────────────────
const route = admin.slice(admin.indexOf("revoke-dataroom"), admin.indexOf("router.put('/ndas/:id/approve'"));
ok('der Server prüft, ob es etwas zu entziehen gab', /warOffen/.test(route));
ok('und sagt es, wenn nicht', /Es wurde nichts verändert/.test(route));
ok('das Protokoll unterscheidet beide Fälle', /Entzug ohne Wirkung/.test(route));
ok('die Oberfläche reicht den Hinweis durch', /d\.hinweis \? d\.hinweis/.test(fn));

process.exit(fail ? 1 : 0);
