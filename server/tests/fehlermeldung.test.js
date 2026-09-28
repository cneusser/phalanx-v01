// ─────────────────────────────────────────────────────────────────────────────
// Abstürze der Oberfläche einsammeln.
//
// Anlass: Ein Interessent im FARADAY-Datenraum sah vier Tage lang eine
// Fehlerseite. Erfahren haben wir es durch eine E-Mail mit Bildschirmfoto. Die
// Meldung lag nur in seiner Browserkonsole, und dorthin sieht niemand.
//
// Beim Einsammeln von Fehlern ist die Gefahr, zu viel mitzunehmen. In der
// Adresse einer Pflegeseite steckt ein Schlüssel, der Zugang ohne Anmeldung
// gibt. Deshalb prüft dieser Lauf vor allem, was NICHT gespeichert wird.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const lies = (...t) => fs.readFileSync(path.join(wurzel, ...t), 'utf8');
const route = lies('server', 'routes', 'version.js');
const grenze = lies('client', 'src', 'components', 'ErrorBoundary.jsx');
const migration = lies('server', 'db', 'migrations', '20260901001530_fehlermeldungen.js');

// ── Kein Schlüssel aus der Adresse ────────────────────────────────────────
ok('nur der Pfad wird gespeichert, keine Parameter', /new URL\(String\(b\.adresse[\s\S]{0,40}\.pathname/.test(route));
// Nachgerechnet: So würde eine Pflegeadresse ankommen.
const nurPfad = (roh) => { try { return new URL(String(roh), 'https://x').pathname; } catch { return null; } };
ok('ein Token in der Abfrage verschwindet',
  nurPfad('/stammdaten?token=GEHEIM123') === '/stammdaten');
ok('ein Token im Pfad bleibt allerdings stehen, das ist bekannt',
  nurPfad('/stammdaten/GEHEIM123') === '/stammdaten/GEHEIM123');

// ── Die Meldung darf nie selbst einen Fehler auslösen ────────────────────
ok('die Route fängt alles ab', /catch \{ \/\* eine Fehlermeldung darf nie/.test(route));
ok('die Meldung im Browser nutzt fetch, nicht den API-Helfer',
  /fetch\('\/api\/fehler'/.test(grenze) && !/api\.post\('\/fehler/.test(grenze));
ok('und fängt auch dort alles ab', /\.catch\(\(\) => \{\}\)/.test(grenze));

// ── Gekürzt wird, damit die Tabelle keine Ablage wird ────────────────────
ok('die Meldung wird gekürzt', /kurz\(b\.meldung, \d+\)/.test(route));
ok('der Komponentenpfad wird gekürzt', /kurz\(b\.komponenten, \d+\)/.test(route));
ok('die Browserkennung wird gekürzt', /kurz\(req\.headers\['user-agent'\], \d+\)/.test(route));
ok('der Browser schickt höchstens acht Zeilen Komponentenpfad',
  /slice\(0, 8\)/.test(grenze));

// ── Gleiches wird gezählt, nicht wiederholt ──────────────────────────────
ok('die Tabelle hat einen Eindeutigkeitsindex', /CREATE UNIQUE INDEX/.test(migration));
ok('ein erneuter Fehler zählt hoch', /anzahl = fehlermeldungen\.anzahl \+ 1/.test(route));
ok('und öffnet ihn wieder, falls er abgehakt war', /erledigt_am = NULL/.test(route));

// ── Auch ohne Anmeldung meldbar, aber Kennung nur mit gültigem Token ─────
ok('die Route verlangt keine Anmeldung', /router\.post\('\/fehler', async/.test(route));
ok('die Nutzerkennung kommt aus einem geprüften Token', /jwt\.verify/.test(route));
ok('ein ungültiges Token führt nicht zum Abbruch',
  /catch \{ \/\* ohne gültiges Token bleibt die Kennung leer \*\//.test(route));

// ── Die Tabelle speichert keine Inhalte ──────────────────────────────────
const spalten = [...migration.matchAll(/t\.(?:text|integer|timestamp|increments)\('(\w+)'/g)].map((m) => m[1]);
const verboten = spalten.filter((s) => /inhalt|body|payload|daten|dokument|nachricht$/i.test(s));
ok('keine Spalte für Seiteninhalte' + (verboten.length ? `  (${verboten.join(', ')})` : ''),
  verboten.length === 0);
ok('der Nutzer wird als Fremdschlüssel geführt, nicht als Name',
  /t\.integer\('user_id'\)/.test(migration) && !/t\.text\('(name|email)'/.test(migration));

// ── Die Fassung steht in der Meldung ─────────────────────────────────────
ok('die Fehlerseite nennt die Fassung', /Fassung \{FASSUNG/.test(grenze));
ok('sie sagt, dass gemeldet wurde', /automatisch an uns übermittelt/.test(grenze));
ok('die Fassung wird mitgeschickt', /fassung: FASSUNG/.test(grenze));

// ── Mandantentrennung ────────────────────────────────────────────────────
ok('die Tabelle hat Row Level Security', /ENABLE ROW LEVEL SECURITY/.test(migration));
ok('und erzwingt sie', /FORCE ROW LEVEL SECURITY/.test(migration));

process.exit(fail ? 1 : 0);
