// ─────────────────────────────────────────────────────────────────────────────
// Die Konversationsliste: Reihenfolge, Suche, Kappung.
//
// Der Fehler, den dieser Test verhindert, ist ein leiser: eine ungelesene
// Nachricht, die durch die Kappung aus der Liste fällt. Man merkt ihn erst,
// wenn jemand keine Antwort bekommen hat.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

// Das Modul ist ESM für den Browser. Für den Test die Exporte herausschneiden,
// das ist ehrlicher als eine zweite Fassung der Logik danebenzulegen.
const quelle = fs.readFileSync(
  path.join(__dirname, '..', '..', 'client', 'src', 'utils', 'konversationen.js'), 'utf8');
const { ordnen, GRENZE } = (new Function(`${quelle.replace(/export (const|function)/g, '$1')}
  return { ordnen, GRENZE };`))();

const k = (name, unread, tage, extra = {}) => ({
  partner_id: name, name, unread,
  last_at: new Date(Date.now() - tage * 86400000).toISOString(),
  ...extra,
});

// ── Reihenfolge ───────────────────────────────────────────────────────────
const gemischt = [k('Alt gelesen', 0, 30), k('Neu ungelesen', 2, 1), k('Alt ungelesen', 1, 20), k('Neu gelesen', 0, 2)];
const r = ordnen(gemischt);
ok('Ungelesenes steht vorn', r.ungelesen.map(x => x.name).join() === 'Neu ungelesen,Alt ungelesen');
ok('innerhalb der Gruppe das Neueste oben', r.gelesen[0].name === 'Neu gelesen');

// ── Kappung ───────────────────────────────────────────────────────────────
const viele = Array.from({ length: 40 }, (_, i) => k(`Gelesen ${i}`, 0, i + 1));
const g = ordnen(viele);
ok(`ohne Ungelesenes werden ${GRENZE} gezeigt`, g.gelesenSichtbar.length === GRENZE);
ok('der Rest wird gezählt', g.versteckt === 30);
ok('alles anzeigen hebt die Kappung auf', ordnen(viele, { alleZeigen: true }).versteckt === 0);

// ── Der wichtige Fall: Ungelesenes darf nie wegfallen ─────────────────────
const vieleUngelesen = Array.from({ length: 25 }, (_, i) => k(`Ungelesen ${i}`, 1, i + 1))
  .concat(Array.from({ length: 25 }, (_, i) => k(`Gelesen ${i}`, 0, i + 1)));
const u = ordnen(vieleUngelesen);
ok('alle 25 ungelesenen bleiben sichtbar', u.ungelesen.length === 25);
ok('der gelesene Teil wird dafür ganz eingeklappt', u.gelesenSichtbar.length === 0);
ok('und die Zahl der Versteckten stimmt', u.versteckt === 25);

// Genau an der Grenze
const grenzfall = Array.from({ length: 4 }, (_, i) => k(`U${i}`, 1, i))
  .concat(Array.from({ length: 20 }, (_, i) => k(`G${i}`, 0, i)));
const gf = ordnen(grenzfall);
ok('vier ungelesene lassen sechs gelesene übrig',
  gf.ungelesen.length === 4 && gf.gelesenSichtbar.length === GRENZE - 4);

// ── Suche ─────────────────────────────────────────────────────────────────
const mitFirma = [
  k('Eduard Sofian', 0, 1, { company: 'MBI Partner', last: 'Rufen Sie mich an' }),
  k('Yurii Khrapun', 0, 2, { company: 'Betongold', last: 'NDA unterschrieben' }),
];
ok('Suche über den Namen', ordnen(mitFirma, { suche: 'sofian' }).gefiltert.length === 1);
ok('Suche über die Firma', ordnen(mitFirma, { suche: 'betongold' }).gefiltert.length === 1);
ok('Suche über den letzten Text', ordnen(mitFirma, { suche: 'rufen' }).gefiltert.length === 1);
ok('Groß- und Kleinschreibung ist egal', ordnen(mitFirma, { suche: 'SOFIAN' }).gefiltert.length === 1);
ok('leere Suche zeigt alles', ordnen(mitFirma, { suche: '   ' }).gefiltert.length === 2);
ok('kein Treffer ergibt eine leere Liste', ordnen(mitFirma, { suche: 'zzz' }).gefiltert.length === 0);

// Die Suche darf Ungelesenes nicht bevorzugt verstecken.
const suchMix = [k('Meier', 3, 1, { company: 'Alpha' }), k('Meier GmbH', 0, 2, { company: 'Alpha' })];
const sm = ordnen(suchMix, { suche: 'alpha' });
ok('die Suche behält die Ungelesen-Sortierung', sm.ungelesen.length === 1 && sm.gelesen.length === 1);

// ── Unsinnige Eingaben ────────────────────────────────────────────────────
ok('leere Liste ist kein Absturz', ordnen([]).gefiltert.length === 0);
ok('keine Liste ist kein Absturz', ordnen(undefined).gefiltert.length === 0);
ok('fehlendes Datum sortiert nach hinten statt zu werfen',
  ordnen([{ partner_id: 1, name: 'Ohne Datum', unread: 0 }]).gelesenSichtbar.length === 1);
ok('unread als Zeichenkette zählt trotzdem',
  ordnen([{ partner_id: 1, name: 'X', unread: '2' }]).ungelesen.length === 1);

process.exit(fail ? 1 : 0);
