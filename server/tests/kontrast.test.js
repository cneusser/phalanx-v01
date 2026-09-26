/**
 * Lesbarkeit: kein Text in der Farbe seiner eigenen Fläche.
 *
 * Hintergrund: beim Umstellen auf die Markenfarben wurde der helle Akzent
 * (#29ABE2) mechanisch auf #174a6a abgebildet, dieselbe Farbe wie die
 * Navigationsleiste und die dunklen Handlungsflächen. Dadurch stand der
 * aktive Menüpunkt navy auf navy, also unsichtbar, und der Knopf
 * "Jetzt Mandat starten" war dunkel auf dunkel. Beides ist kein
 * Schönheitsfehler, sondern eine Seite, die ihre eigene Bedienung versteckt.
 *
 * Der Test prüft den Quelltext, nicht das Bild: ein Paar aus Fläche und
 * Schrift, das dieselbe oder eine fast gleich helle Farbe nennt, fällt auf.
 */
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (name, cond, hinweis) => {
  if (!cond) fail++;
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond || !hinweis ? '' : `\n     ${hinweis}`}`);
};

const QUELLE = path.join(__dirname, '..', '..', 'client', 'src');

function dateien(verzeichnis, treffer = []) {
  for (const e of fs.readdirSync(verzeichnis, { withFileTypes: true })) {
    const p = path.join(verzeichnis, e.name);
    if (e.isDirectory()) dateien(p, treffer);
    else if (/\.(jsx|js)$/.test(e.name)) treffer.push(p);
  }
  return treffer;
}

// Relative Helligkeit nach WCAG.
function helligkeit(hex) {
  const h = hex.replace('#', '');
  const voll = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const teile = [0, 2, 4].map(i => parseInt(voll.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * teile[0] + 0.7152 * teile[1] + 0.0722 * teile[2];
}
function kontrast(a, b) {
  const x = helligkeit(a), y = helligkeit(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const alle = dateien(QUELLE);
ok('Quelldateien gefunden', alle.length > 50, `nur ${alle.length}`);

// 1. Genau die Fehlerklasse von v0.412: Fläche und Schrift greifen auf
//    dasselbe Farbobjekt zu und landen dort auf demselben Wert. Bewusst eng
//    gefasst, damit der Test keine Stilfragen beantwortet, sondern nur
//    unsichtbare Beschriftungen findet.
const schwach = [];
for (const datei of alle) {
  const text = fs.readFileSync(datei, 'utf8');
  // Nur das erste Farbobjekt der Datei, und nur dessen eigene Zeilen.
  const objekt = text.match(/const C\s*=\s*\{([\s\S]*?)\};/);
  if (!objekt) continue;
  const namen = {};
  for (const m of objekt[1].matchAll(/(\w+)\s*:\s*'(#[0-9a-fA-F]{3,6})'/g)) namen[m[1]] = m[2];

  for (const m of text.matchAll(/background:\s*C\.(\w+)\s*,\s*color:\s*C\.(\w+)/g)) {
    const flaeche = namen[m[1]], schrift = namen[m[2]];
    if (!flaeche || !schrift) continue;
    const k = kontrast(flaeche, schrift);
    if (k < 3) schwach.push(`${path.relative(QUELLE, datei)}: C.${m[1]} (${flaeche}) hinter C.${m[2]} (${schrift}) ergibt ${k.toFixed(2)} zu 1`);
  }
}
ok('kein Knopf mit Text in der Farbe seiner Fläche', schwach.length === 0, schwach.join('\n     '));

// 2. Die Navigationsleiste braucht einen Akzent, der sich von ihr abhebt.
const navbar = fs.readFileSync(path.join(QUELLE, 'components', 'Navbar.jsx'), 'utf8');
const navFarben = {};
for (const m of navbar.matchAll(/(\w+)\s*:\s*'(#[0-9a-fA-F]{6})'/g)) navFarben[m[1]] = m[2];
ok('Navbar kennt einen Akzent', Boolean(navFarben.akzent));
ok('Akzent hebt sich von der Leiste ab',
  navFarben.akzent && navFarben.navy && kontrast(navFarben.akzent, navFarben.navy) >= 3,
  navFarben.akzent ? `${navFarben.akzent} auf ${navFarben.navy} = ${kontrast(navFarben.akzent, navFarben.navy).toFixed(2)}` : '');

// 3. overflow-x: hidden auf einem Vorfahren setzt position:sticky ausser Kraft.
//    Genau daran lief die Kopfleiste nicht mit.
for (const css of ['index.css', path.join('styles', 'marke.css')]) {
  const inhalt = fs.readFileSync(path.join(QUELLE, css), 'utf8');
  // Nur die Rahmenelemente: eine breite Tabelle darf sehr wohl scrollen.
  const bloecke = inhalt.split('}').filter(b => /(^|[\s,])(html|body|#root|\.marke)\s*[,{]/.test(b));
  const boese = bloecke.filter(b => /overflow-x:\s*hidden/.test(b) && !/overflow-x:\s*clip/.test(b))
    .map(b => b.trim().split('\n')[0]);
  ok(`${css}: kein overflow-x ohne clip-Nachsatz`, boese.length === 0, boese.join(' | '));
}

// 4. Der Knopf nach oben ist eingehängt und beschriftet.
const app = fs.readFileSync(path.join(QUELLE, 'App.jsx'), 'utf8');
ok('Knopf nach oben ist global eingehängt', /<NachOben\s*\/>/.test(app));
const nachOben = fs.readFileSync(path.join(QUELLE, 'components', 'NachOben.jsx'), 'utf8');
ok('Knopf nach oben hat eine Beschriftung für Vorleseprogramme', /aria-label=/.test(nachOben));
ok('Knopf nach oben achtet auf reduzierte Bewegung', /prefers-reduced-motion/.test(nachOben));
const i18n = fs.readFileSync(path.join(QUELLE, 'i18n', 'index.jsx'), 'utf8');
ok('Beschriftung liegt auch englisch vor', /'allgemein\.nach_oben'/.test(i18n));

process.exit(fail ? 1 : 0);
