// ─────────────────────────────────────────────────────────────────────────────
// Die Rollenwahl bei der Anmeldung (v0.464)
//
// Anlass: Ein Verkäufer hatte sich als Verkäufer angemeldet und war als Käufer
// im Bestand. Er sah Marktplatz, Vertraulichkeitsvereinbarung und „Mandat
// auswählen" statt seines eigenen Unternehmens.
//
// Es war kein Fehler beim Speichern. Es waren zwei Vorgaben, die beide in
// dieselbe Richtung zeigten: In der Maske war „Käufer" vorausgewählt, und der
// Server machte aus einer fehlenden oder unbekannten Rolle stillschweigend
// ebenfalls „buyer". Wer die Umschaltung übersah, war Käufer, und niemandem
// fiel es auf.
//
// Die Lehre, die hier festgehalten wird: Die folgenreichste Angabe eines
// Formulars darf nicht die sein, die man versehentlich stehen lässt.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const lies = (...p) => fs.readFileSync(path.join(wurzel, ...p), 'utf8');

const auth = lies('server', 'routes', 'auth.js');
const admin = lies('server', 'routes', 'admin.js');
const register = lies('client', 'src', 'pages', 'Register.jsx');
const kaeufer = lies('client', 'src', 'pages', 'Dashboard.jsx');
const verkaeufer = lies('client', 'src', 'pages', 'SellerDashboard.jsx');

// ── 1. Keine stille Vorgabe mehr ─────────────────────────────────────────
console.log('\n── Keine stille Vorgabe ──');
ok('der Server rät die Rolle nicht mehr',
  !/const userRole = validRoles\.includes\(role\) \? role : 'buyer'/.test(auth));
ok('er weist eine fehlende Rolle ab', /Bitte wählen Sie zuerst, ob Sie ein Unternehmen suchen/.test(auth));
ok('und zwar mit 400, nicht mit einem Konto', /status\(400\)[\s\S]{0,160}Bitte wählen Sie zuerst/.test(auth));
ok('in der Maske ist nichts vorausgewählt', /useState\(''\);\s*\/\/ '' \| 'buyer' \| 'seller'/.test(register));
ok('ohne Wahl wird nicht abgeschickt', /if \(!roleType\) \{/.test(register));
ok('das Formular erscheint erst nach der Wahl', /display: roleType \? 'block' : 'none'/.test(register));
ok('und davor steht, warum', /Bitte wählen Sie zuerst oben aus/.test(register));

// ── 2. Die Wahl sieht aus wie eine Entscheidung ──────────────────────────
console.log('\n── Die Wahl als Entscheidung ──');
ok('es gibt eine Frage dazu', /Was führt Sie zu CapitalMatch\?/.test(register));
ok('beide Wege sind beschrieben, nicht nur benannt',
  /role_buyer_hint/.test(register) && /role_seller_hint/.test(register));
ok('der Käuferweg nennt Kurzprofil, Vereinbarung und Datenraum',
  /anonyme Kurzprofile[\s\S]{0,200}Datenraum/.test(register));
ok('der Verkäuferweg nennt Einreichen, Prüfen und Stand der Interessenten',
  /reichen Ihr Unternehmen ein[\s\S]{0,160}Stand jedes Interessenten/.test(register));
ok('es steht dabei, dass sich das korrigieren lässt', /Wir können das später ändern/.test(register));
ok('die alte Umschaltung ist weg', !/Ich suche \(Käufer\)/.test(register));

// ── 3. Die Umstellung einer falschen Rolle ───────────────────────────────
//
// Die Rolle umzustellen genügt nicht: Am Konto hängen Dinge, die nur für
// Käufer einen Sinn haben. Gelöscht wird davon nur, was ohne Rolle sinnlos
// und zugleich inhaltsleer ist; alles andere wird gemeldet.
console.log('\n── Umstellung einer falschen Rolle ──');
const wechsel = admin.slice(admin.indexOf("router.put('/users/:id/role'"),
  admin.indexOf("// ── Mail-Ausgangsbuch"));
ok('beim Wechsel auf Verkäufer fällt der Käufertyp weg',
  /buyer_type = NULL, succession_type = NULL/.test(wechsel));
ok('ein ausgefülltes Suchprofil wird gemeldet, nicht gelöscht',
  /Es besteht ein ausgefülltes Suchprofil/.test(wechsel) && !/DELETE FROM buyer_profiles/.test(wechsel));
ok('ein leeres Suchprofil löst keine Meldung aus', /const leer = \(v\)/.test(wechsel));
ok('bestehende Interessentenakten werden gemeldet', /als Interessent geführt/.test(wechsel));
ok('und zwar mit Mandat und Stand', /\$\{a\.codename\}: \$\{a\.stage\}/.test(wechsel));
ok('mit dem Hinweis, dass sie weiter Zugang geben', /gibt weiterhin[\s\S]{0,40}Zugang/.test(wechsel));
ok('nichts davon wird stillschweigend gelöscht', !/DELETE FROM interests/.test(wechsel));
ok('die Hinweise gehen an den Aufrufer zurück', /hinweise: reste/.test(wechsel));
ok('der Wechsel wird protokolliert', /USER_ROLE_CHANGED/.test(wechsel));

// ── 4. Die Begrüßung ─────────────────────────────────────────────────────
console.log('\n── Begrüßung ──');
{
  // Die Datei ist ESM, der Test läuft in CommonJS. Geprüft wird deshalb der
  // Quelltext und zusätzlich die Logik in einer nachgebauten Fassung, die
  // aus derselben Datei stammt.
  const quelle = lies('client', 'src', 'utils', 'begruessung.js');
  ok('es gibt ein eigenes Modul dafür', quelle.length > 0);
  ok('die Tageszeit wird berücksichtigt', /Guten Morgen/.test(quelle) && /Guten Abend/.test(quelle));
  ok('Anrede und Nachname gehen vor dem Vornamen', /anrede && nachname/.test(quelle));
  ok('ohne Anrede bleibt der Vorname als Rückfall', /vorname \? `\$\{gruss\}, \$\{vorname\}`/.test(quelle));
  ok('ein Doktortitel wird mitgeführt', /user\.title/.test(quelle));
  ok('es wird genau ein nächster Schritt genannt', /Wer drei[\s\S]{0,20}gleichwertige Vorschläge sieht/.test(quelle));

  const fn = new Function(`${quelle.replace(/export /g, '')}; return { begruessung, tagesgruss };`)();
  const mittag = new Date(2026, 9, 18, 13, 0);
  ok('Herr Hodapp wird mit Anrede begrüsst',
    fn.begruessung({ salutation: 'Herr', last_name: 'Hodapp', first_name: 'Simon' }, mittag) === 'Guten Tag, Herr Hodapp');
  ok('ohne Anrede mit Vornamen',
    fn.begruessung({ first_name: 'Simon' }, mittag) === 'Guten Tag, Simon');
  ok('ohne jeden Namen bleibt der Gruss allein',
    fn.begruessung({}, mittag) === 'Guten Tag');
  ok('ohne Nutzer ebenso', fn.begruessung(null, mittag) === 'Guten Tag');
  ok('morgens anders als abends',
    fn.tagesgruss(new Date(2026, 9, 18, 8)) === 'Guten Morgen'
    && fn.tagesgruss(new Date(2026, 9, 18, 20)) === 'Guten Abend');
  ok('eine unbekannte Anrede führt nicht zu „Divers Hodapp"',
    fn.begruessung({ salutation: 'Divers', last_name: 'Hodapp', first_name: 'Simon' }, mittag) === 'Guten Tag, Simon');
}
ok('der Käuferbereich begrüsst persönlich', /begruessung\(user\)/.test(kaeufer));
ok('und nennt den nächsten Schritt', /naechsterSchritt\(\{/.test(kaeufer));
ok('der Verkäuferbereich ebenfalls', /begruessung\(user\)/.test(verkaeufer));
ok('die Überschrift „Verkäufer-Dashboard" ist weg', !/>\s*Verkäufer-Dashboard\s*</.test(verkaeufer));
ok('„Willkommen, Vorname" ist weg', !/Willkommen, \{user\?\.first_name\}/.test(kaeufer));

console.log(fail ? `\n${fail} Fehler` : '\nAlles grün');
process.exit(fail ? 1 : 0);
