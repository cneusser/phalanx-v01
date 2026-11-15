// ─────────────────────────────────────────────────────────────────────────────
// Klarnamen im Datenraum (v0.479)
//
// Der Anlass ist der ernsteste in diesem Projekt: Ein Interessent hat im
// Gespräch einzelne Mitarbeiter beim Namen genannt. Die Belegschaft weiss in
// der Regel nichts vom Verkauf, und ein Name, der den Datenraum verlassen
// hat, lässt sich nicht zurückholen.
//
// Die wichtigste Prüfung in dieser Datei ist deshalb nicht, dass Namen
// gefunden werden. Sie ist, dass eine Datei ohne gewonnenen Text NICHT als
// unauffällig gilt. Eine Prüfung, die Ungeprüftes für sauber erklärt, ist
// schlimmer als gar keine: Sie erzeugt Vertrauen, das nichts trägt.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const p = require('../utils/klarnamenImDatenraum');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

console.log('\n── Ein Name im Text ──');
{
  const z = p.bewerteDatei({
    id: 1, name: 'Protokoll.pdf', pfad: 'Recht',
    content_text: 'Anwesend waren Herr Bergmann und Frau Dr. Keller. Rückfragen an m.bergmann@elektro.de.',
  }, []);
  ok('die Anrede mit Namen wird gefunden', z.funde.some((f) => /Bergmann/.test(f.treffer)));
  ok('der Titel mit Namen ebenfalls', z.funde.some((f) => /Keller/.test(f.treffer)));
  ok('die Adresse ebenfalls', z.funde.some((f) => f.art === 'email'));
  ok('die Stufe ist Treffer', z.stufe === 'treffer');
  ok('die Begriffe taugen zum Schwärzen', z.begriffe.length >= 2);
}

console.log('\n── Ein Name im Dateinamen ──');
{
  const z = p.bewerteDatei({ id: 2, name: 'Arbeitsvertrag Herr Bergmann.pdf', pfad: 'Personal', content_text: 'Vertrag' }, []);
  ok('auch der Dateiname wird geprüft', z.funde.some((f) => /im Dateinamen/.test(f.hinweis)));
  ok('und das genügt für einen Treffer', z.stufe === 'treffer');
}

console.log('\n── Bekannte Namen aus dem Mandat ──');
{
  const z = p.bewerteDatei({ id: 3, name: 'Liste.pdf', pfad: '', content_text: 'Verantwortlich: Anna Schmitt, Vertrieb.' },
    ['Anna Schmitt']);
  ok('ein bekannter Name wird gefunden, ohne zu raten', z.funde.some((f) => f.art === 'bekannt'));
}

console.log('\n── Der Verdacht ohne Fund ──');
{
  const z = p.bewerteDatei({ id: 4, name: 'Gehaltsliste 2025.xlsx', pfad: 'Finanzen', content_text: 'Summe 1.240.000' }, []);
  ok('der Name allein genügt für einen Verdacht', z.stufe === 'verdacht');
  ok('und das Wort wird genannt', z.woerter.includes('gehalt'));
}

console.log('\n── Ungeprüft ist nicht sauber ──');
{
  const z = p.bewerteDatei({ id: 5, name: 'Scan 0012.pdf', pfad: 'Recht', content_text: '' }, []);
  ok('ohne Text gilt die Datei als ungeprüft', z.stufe === 'ungeprueft');
  ok('und nicht als unauffällig', z.stufe !== 'unauffaellig');
  ok('der Grund steht dabei', /kein Text/.test(z.grund));
  ok('geprueft ist falsch', z.geprueft === false);
}

console.log('\n── Was wirklich unauffällig ist ──');
{
  const z = p.bewerteDatei({ id: 6, name: 'Marktbericht.pdf', pfad: 'Markt', content_text: 'Der Markt wuchs um vier Prozent.' }, []);
  ok('bleibt unauffällig', z.stufe === 'unauffaellig');
  ok('ohne Funde', z.funde_gesamt === 0);
}

console.log('\n── Die Zusammenfassung ──');
{
  const r = p.bewerteAlle([
    { id: 1, name: 'Protokoll.pdf', content_text: 'Herr Bergmann war da.' },
    { id: 2, name: 'Gehaltsliste.xlsx', content_text: 'Summen' },
    { id: 3, name: 'Scan.pdf', content_text: '' },
    { id: 4, name: 'Markt.pdf', content_text: 'Vier Prozent.' },
    { id: 5, name: 'Vertraulich.pdf', content_text: 'Nichts.', confidential: 1 },
  ], []);
  ok('alle Dateien sind gezählt', r.stand.dateien === 5);
  ok('je ein Treffer, Verdacht und Ungeprüftes', r.stand.treffer === 1 && r.stand.verdacht === 1 && r.stand.ungeprueft === 1);
  ok('bereits Vertrauliches wird ausgewiesen', r.stand.bereits_vertraulich === 1);
  ok('die Treffer stehen oben', r.zeilen[0].stufe === 'treffer');
  ok('das Unauffällige unten', r.zeilen[r.zeilen.length - 1].stufe === 'unauffaellig');
}

console.log('\n── Die Route ──');
{
  const safe = fs.readFileSync(path.join(__dirname, '..', 'routes', 'safe.js'), 'utf8');
  ok('es gibt die Prüfung', /router\.get\('\/:projectId\/klarnamen-pruefung'/.test(safe));
  ok('sie ist nur für Pfleger', /klarnamen-pruefung', authenticate, wrap\(async \(req, res\) => \{\s*\n\s*if \(!\(await guard\(req, res\)\)\) return;/.test(safe));
  ok('sie protokolliert den Lauf', /SAFE_KLARNAMEN_PRUEFUNG/.test(safe));
  ok('eine Sperrliste lässt sich mitgeben', /req\.query\.sperrliste/.test(safe));
  ok('es gibt das Kennzeichnen als vertraulich', /klarnamen-pruefung\/vertraulich/.test(safe));
  ok('und auch das wird protokolliert', /SAFE_KLARNAMEN_VERTRAULICH/.test(safe));
  ok('die Prüfung selbst ändert nichts',
    !/klarnamen-pruefung'[\s\S]{0,2000}?UPDATE safe_items/.test(safe));
}

console.log(fail ? `\n${fail} Fehler` : '\nAlles grün');
process.exit(fail ? 1 : 0);
