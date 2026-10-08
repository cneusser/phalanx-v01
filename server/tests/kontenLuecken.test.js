// ─────────────────────────────────────────────────────────────────────────────
// Warum hat ein Kontakt kein Nutzerkonto? (v0.449)
//
// Anlass: „Warum hat Herr Eder kein Nutzerkonto? Ich habe mit ihm in drei
// Projekten Kontakt." Beides stimmte gleichzeitig, und genau das macht den
// Fall lehrreich:
//
//   · Die Mitarbeit an einem Mandat hängt an crm_deal_parties und braucht
//     keine E-Mail.
//   · Das Konto wird über die E-Mail gesucht. Fehlt sie, findet die Suche
//     nichts.
//
// Die Oberfläche sagte daraufhin wahrheitsgemäß „kein Konto". Das klingt wie
// ein Befund über die Person und ist in Wahrheit eine Lücke in den
// Stammdaten. Ein Hinweis, der den Ausweg verschweigt, ist eine Sackgasse.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const admin = fs.readFileSync(path.join(wurzel, 'server', 'routes', 'admin.js'), 'utf8');
const crm = fs.readFileSync(path.join(wurzel, 'server', 'routes', 'crm.js'), 'utf8');
const drawer = fs.readFileSync(path.join(wurzel, 'client', 'src', 'components', 'ContactDrawer.jsx'), 'utf8');

// ── Die Suche nach dem Konto ───────────────────────────────────────────────
{
  const block = crm.slice(crm.indexOf('Plattform-Konto (falls der Kontakt registriert'), crm.indexOf('Die zweite Hälfte der Wahrheit'));
  ok('zuerst die hinterlegte Verknüpfung', /contact\.user_id\s*\n?\s*\?/.test(block));
  ok('dann die E-Mail', /lower\(email\) = lower\(\?\)/.test(block));
  ok('und eine gefundene Verknüpfung wird festgeschrieben', /UPDATE crm_contacts SET user_id/.test(block));
  ok('ohne E-Mail gibt es keinen dritten Weg, und das ist der Grund',
    !/last_name/.test(block));
}

// ── Der Hinweis nennt jetzt den Ausweg ─────────────────────────────────────
{
  ok('ohne E-Mail wird erklärt, warum nichts gefunden wird',
    /Das Konto wird über die Adresse gesucht/.test(drawer));
  ok('und was zu tun ist', /Adresse nachtragen oder das Konto/.test(drawer));
  ok('mit E-Mail wird die zweite Möglichkeit genannt',
    /das Konto nutzt eine andere Adresse/.test(drawer));
  ok('es gibt einen Knopf dorthin', /Konto jetzt suchen und verknüpfen/.test(drawer));
  ok('der die Suche gleich mit dem Nachnamen füllt', /searchAccounts\(k\?\.last_name/.test(drawer));
  ok('die Verknüpfung von Hand gab es schon', /linkAccount\(userId\)/.test(drawer));
}

// ── Der Bericht über alle Fälle ────────────────────────────────────────────
{
  const b = admin.slice(admin.indexOf("'/berichte/konten-luecken'"), admin.indexOf("'/berichte/suchprofile'"));
  ok('es gibt einen Bericht über alle Lücken', b.length > 500);
  ok('er nimmt nur Kontakte, die an Mandaten hängen', /FROM crm_deal_parties dp WHERE dp\.contact_id = k\.id\) > 0/.test(b));
  ok('und nur solche ohne Verknüpfung', /k\.user_id IS NULL/.test(b));
  ok('anonymisierte bleiben aussen vor', /anonymized_at IS NULL/.test(b));
  ok('er unterscheidet die beiden Gründe', /Keine E-Mail am Kontakt/.test(b) && /kein Konto darunter/.test(b));
  ok('er zählt, wie viele Mandate betroffen sind', /AS mandate/.test(b));
  ok('und wie viele davon schon im Datenraum sind', /mit_datenraum/.test(b));
  ok('er schlägt Konten mit demselben Nachnamen vor', /lower\(last_name\) = lower\(\?\)/.test(b));
  ok('und sagt, ob auch der Vorname passt', /vorname_passt/.test(b));
  ok('verknüpft wird nichts automatisch', /Verknüpft wird nichts automatisch/.test(b));
  ok('und es steht dabei, warum nicht', /denselben Namen tragen/.test(b));
  ok('der Bericht ändert nichts', !/UPDATE |INSERT |DELETE /.test(b));
  ok('er verlangt Adminrecht', /'\/berichte\/konten-luecken', \.\.\.isAdmin/.test(admin));
}

process.exit(fail ? 1 : 0);
