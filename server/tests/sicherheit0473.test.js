// ─────────────────────────────────────────────────────────────────────────────
// Fünf Befunde aus der Durchsicht, behoben (v0.473)
//
// Der schwerste zuerst, weil er am leisesten war: Bei aktivem zweiten Faktor
// gab die Anmeldung nach richtigem Passwort eine Bescheinigung zurück, mit
// der NUR der Code eingelöst werden sollte. Sie trug `{ userId, twofa: true }`
// und keine Token-Version. Die Prüfung las aber nur `userId` und liess eine
// fehlende Version als 0 durchgehen. Damit war diese Bescheinigung fünf
// Minuten lang ein vollwertiges Sitzungstoken, und der zweite Faktor war
// eine Höflichkeitsfrage.
//
// Die übrigen vier: eine doppelt registrierte Route, bei der die
// ungeschützte Fassung gewann; eine Dateitypprüfung, die mit ODER verknüpft
// war und damit nichts prüfte; eine Löschroute ohne Ablaufprüfung; und
// Zugangslinks im Klartext, einmal im Serverprotokoll und einmal im
// Mail-Ausgangsbuch.
//
// Geprüft wird hier am Quelltext. Für die Wirkung braucht es die laufende
// Anwendung; was sich ohne Datenbank halten lässt, ist der Zustand des
// Codes, und genau der war in allen fünf Fällen das Problem.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const lies = (...p) => fs.readFileSync(path.join(wurzel, ...p), 'utf8');

const mw = lies('server', 'middleware', 'auth.js');
const authRoute = lies('server', 'routes', 'auth.js');
const crm = lies('server', 'routes', 'crm.js');
const docs = lies('server', 'routes', 'documents.js');
const admin = lies('server', 'routes', 'admin.js');

console.log('\n── Der zweite Faktor lässt sich nicht überspringen ──');
ok('es gibt eine Erkennung für den Zwischenschein', /function istZwischenschein/.test(mw));
ok('authenticate weist ihn ab', /if \(istZwischenschein\(decoded\)\) \{[\s\S]{0,200}401/.test(mw));
ok('optionalAuth behandelt ihn als anonym', /if \(istZwischenschein\(decoded\)\) return next\(\);/.test(mw));
ok('die Meldung sagt, was fehlt', /ZWEITER_FAKTOR_OFFEN/.test(mw));
ok('der Schein traegt seinen Zweck', /zweck: '2fa'/.test(authRoute));
ok('und die Token-Version', /twofa: true, zweck: '2fa', tv: user\.token_version/.test(authRoute));
{
  // Die Erkennung selbst. Herausgeloest statt eingebunden: Die Datei zieht
  // die Datenbank nach sich, und geprueft wird hier die Regel, nicht Postgres.
  const quelle = mw.slice(mw.indexOf('function istZwischenschein'));
  // eslint-disable-next-line no-new-func
  const istZwischenschein = new Function(`${quelle.slice(0, quelle.indexOf('\n}') + 2)}; return istZwischenschein;`)();
  ok('ein Schein mit twofa wird erkannt', istZwischenschein({ userId: 1, twofa: true }) === true);
  ok('ein Schein mit Zweck ebenso', istZwischenschein({ userId: 1, zweck: '2fa' }) === true);
  ok('ein gewoehnliches Token nicht', istZwischenschein({ userId: 1, tv: 0 }) === false);
  ok('und nichts ist auch kein Schein', istZwischenschein(null) === false);
}

console.log('\n── Eine Route, eine Wache ──');
{
  const treffer = crm.match(/router\.post\('\/contacts\/from-user\/:userId'/g) || [];
  ok('die Route ist nur noch einmal registriert', treffer.length === 1);
  ok('und zwar die Fassung mit Schreibrecht', /\/contacts\/from-user\/:userId', \.\.\.isStaff, canWrite/.test(crm));
}

console.log('\n── Der Dateityp wird wirklich geprüft ──');
ok('Mimetype UND Endung müssen stimmen',
  /ALLOWED_TYPES\.has\(file\.mimetype\) && ALLOWED_EXT\.has\(ext\)/.test(docs));
ok('das ODER ist weg', !/ALLOWED_TYPES\.has\(file\.mimetype\) \|\| ALLOWED_EXT\.has\(ext\)/.test(docs));

console.log('\n── Ein abgelaufener Link löscht nichts mehr ──');
{
  const stelle = crm.slice(crm.indexOf("router.post('/invite/:token/erase'"));
  const bis = stelle.slice(0, stelle.indexOf('}));'));
  ok('der Ablauf wird geprüft', /expires_at/.test(bis));
  ok('und mit 410 beantwortet', /410/.test(bis));
  ok('ein bereits gelöschter Fall löscht nicht erneut', /status === 'declined'/.test(bis));
  ok('die Löschung selbst gibt es weiterhin', /DELETE FROM crm_contacts WHERE id = \?/.test(bis));
}

console.log('\n── Zugangslinks bleiben im Postfach ──');
ok('der Reset-Link steht nicht mehr im Protokoll', !/Reset-Link: \$\{resetUrl\}/.test(authRoute));
ok('protokolliert wird die Nutzer-Kennung', /angefordert fuer Nutzer #\$\{user\.id\}/.test(authRoute));
ok('die Reset-Mail hat eine eigene Art', /type: 'password_reset'/.test(lies('server', 'utils', 'email.js')));
ok('das Ausgangsbuch haelt Zugangsmails zurueck', /MAIL_OHNE_VOLLTEXT/.test(admin));
ok('und macht Schlüssel in Links unkenntlich', /SCHLUESSEL_IM_LINK/.test(admin));
{
  const re = /([?&](?:token|t|code|key|schluessel)=)[A-Za-z0-9._-]{8,}/gi;
  const aus = 'https://x.de/reset?token=abc123def456GHI'.replace(re, '$1entfernt');
  ok('ein Schlüssel im Link wird ersetzt', aus === 'https://x.de/reset?token=entfernt');
  const kurz = 'https://x.de/?t=12'.replace(re, '$1entfernt');
  ok('eine harmlose kurze Angabe bleibt', kurz === 'https://x.de/?t=12');
}

console.log(fail ? `\n${fail} Fehler` : '\nAlles grün');
process.exit(fail ? 1 : 0);
