#!/usr/bin/env node
/**
 * Textwächter: findet Gedankenstriche und KI-Floskeln, bevor sie live gehen.
 *
 * Zwei Regeln, mehr nicht:
 *   1. Kein Gedankenstrich (U+2014). Punkt, Komma, Doppelpunkt oder ein zweiter
 *      Satz tun es auch, und niemand hört beim Lesen einen Strich.
 *   2. Keine Floskeln, an denen man maschinell erzeugten Text erkennt. Die Liste
 *      unten stammt aus dem, was in deutschen KI-Texten immer wieder auftaucht.
 *
 * Aufruf:  npm run check:texts
 * Rückgabe: 0 sauber, 1 Fund. Damit taugt das Skript auch für einen Pre-Commit-Hook.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'uploads', 'coverage', 'scripts']);
// Diese Datei führt die verbotenen Wörter selbst auf, damit sie danach suchen kann.
// Sie darf sich nicht über sich selbst beschweren.
const SKIP_FILES = new Set([path.join('server', 'tests', 'mailText.test.js')]);
const EXT = new Set(['.js', '.jsx', '.md']);
const DASH = '—';

// Floskeln, die in einem Text von uns nichts verloren haben
const PHRASES = [
  'zusammenfassend lässt sich sagen',
  'es ist wichtig zu erwähnen',
  'es ist wichtig zu betonen',
  'es sei darauf hingewiesen',
  'in der heutigen schnelllebigen',
  'in der heutigen digitalen welt',
  'nahtlos',
  'ganzheitlich betrachtet',
  'eintauchen in',
  'vielfältige möglichkeiten',
  'im rahmen dieses artikels',
  'abschließend lässt sich festhalten',
  'revolutionär',
  'bahnbrechend',
  'im digitalen zeitalter',
];

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(full); continue; }
    if (EXT.has(path.extname(e.name))) files.push(full);
  }
})(ROOT);

const findings = [];
for (const file of files) {
  const rel = path.relative(ROOT, file);
  if (SKIP_FILES.has(rel)) continue;
  fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (line.includes(DASH)) findings.push([rel, i + 1, 'Gedankenstrich', line.trim().slice(0, 90)]);
    const low = line.toLowerCase();
    for (const ph of PHRASES) {
      if (low.includes(ph)) findings.push([rel, i + 1, `Floskel „${ph}"`, line.trim().slice(0, 90)]);
    }
  });
}

if (!findings.length) {
  console.log(`✓ ${files.length} Dateien geprüft, kein Gedankenstrich, keine Floskel.`);
  process.exit(0);
}
for (const [f, l, what, text] of findings) console.log(`✗ ${f}:${l}  ${what}\n    ${text}`);
console.log(`\n${findings.length} Fund(e). Bitte umformulieren.`);
process.exit(1);
