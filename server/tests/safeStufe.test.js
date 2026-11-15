// ─────────────────────────────────────────────────────────────────────────────
// Stufe und Stand im Datenraum (v0.478, Sprint 1, Teil 2)
//
// Das Abnahmekriterium aus der Roadmap lautet: „Ein hochgeladener Teaser
// erscheint ohne weiteren Klick in der Käuferansicht der passenden Stufe."
//
// Bis v0.477 war das unmöglich, und zwar nicht aus Versehen: Der Safe kannte
// nur eine Frage, nämlich ob der Käufer die Datenraum-Freigabe hat. Für
// einen Teaser, der auf die öffentliche Stufe gehört, gab es im Baum keinen
// Ort, an dem er sichtbar wäre.
//
// Die gefährliche Hälfte dieser Änderung ist nicht, dass jetzt mehr sichtbar
// wird. Sie ist, dass versehentlich mehr sichtbar wird. Deshalb prüft diese
// Datei in beide Richtungen, und die Prüfungen, die auf „sieht nichts"
// hinauslaufen, sind die wichtigeren.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const stufen = require('../utils/safeStufe');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const lies = (...p) => fs.readFileSync(path.join(wurzel, ...p), 'utf8');

console.log('\n── Die Stufen ──');
ok('öffentlich ist von überall erreichbar', stufen.erreicht('public', 'public'));
ok('das Memorandum nicht von der öffentlichen Stufe', !stufen.erreicht('nda', 'public'));
ok('der Datenraum nicht von der NDA-Stufe', !stufen.erreicht('dataroom', 'nda'));
ok('von der Datenraum-Stufe alles', stufen.erreicht('public', 'dataroom')
  && stufen.erreicht('nda', 'dataroom') && stufen.erreicht('dataroom', 'dataroom'));
ok('eine unbekannte Stufe gilt als die höchste, nicht als die niedrigste',
  !stufen.erreicht('quatsch', 'nda'));

console.log('\n── Aus der Akte ──');
{
  const erlaubt = (stage, was) => ({
    nichts: [],
    im: ['im'],
    alles: ['im', 'dataroom'],
  }[stage] || []).includes(was);
  const stageAllows = (stage, was) => erlaubt(stage, was);
  ok('ohne alles bleibt öffentlich', stufen.stufeAusAkte('nichts', { stageAllows }) === 'public');
  ok('mit Memorandum wird nda', stufen.stufeAusAkte('im', { stageAllows }) === 'nda');
  ok('mit Datenraum wird dataroom', stufen.stufeAusAkte('alles', { stageAllows }) === 'dataroom');
}

console.log('\n── Was auf der Stufe übrig bleibt ──');
{
  const baum = [
    { id: 1, parent_id: null, is_folder: 1, name: '00 Teaser' },
    { id: 2, parent_id: 1, is_folder: 0, name: 'Teaser.pdf', sichtbar_ab: 'public', stand: 'freigegeben' },
    { id: 3, parent_id: null, is_folder: 1, name: '01 IM' },
    { id: 4, parent_id: 3, is_folder: 0, name: 'IM.pdf', sichtbar_ab: 'nda', stand: 'freigegeben' },
    { id: 5, parent_id: null, is_folder: 1, name: '02 Unterlagen' },
    { id: 6, parent_id: 5, is_folder: 0, name: 'Gehaelter.xlsx', sichtbar_ab: 'dataroom', stand: 'freigegeben' },
    { id: 7, parent_id: 5, is_folder: 0, name: 'Entwurf.docx', sichtbar_ab: 'dataroom', stand: 'entwurf' },
    { id: 8, parent_id: 1, is_folder: 0, name: 'Alt.pdf', sichtbar_ab: 'public', stand: 'zurueckgezogen' },
  ];
  const ids = (stufe) => stufen.fuerStufe(baum, stufe).map((i) => i.id).sort((a, b) => a - b);

  ok('öffentlich: der Teaser und sein Ordner', JSON.stringify(ids('public')) === '[1,2]');
  ok('ab NDA kommt das Memorandum dazu', JSON.stringify(ids('nda')) === '[1,2,3,4]');
  ok('im Datenraum auch die Unterlagen', JSON.stringify(ids('dataroom')) === '[1,2,3,4,5,6]');
  ok('ein Entwurf geht nie hinaus', !ids('dataroom').includes(7));
  ok('eine zurückgezogene Fassung ebenso wenig', !ids('public').includes(8));
  ok('ein Ordner ohne sichtbaren Inhalt bleibt draussen', !ids('public').includes(5));
}

console.log('\n── Der Weg nach oben bleibt erhalten ──');
{
  const tief = [
    { id: 1, parent_id: null, is_folder: 1, name: 'A' },
    { id: 2, parent_id: 1, is_folder: 1, name: 'B' },
    { id: 3, parent_id: 2, is_folder: 1, name: 'C' },
    { id: 4, parent_id: 3, is_folder: 0, name: 'tief.pdf', sichtbar_ab: 'public', stand: 'freigegeben' },
    { id: 5, parent_id: 1, is_folder: 1, name: 'Daneben' },
    { id: 6, parent_id: 5, is_folder: 0, name: 'geheim.pdf', sichtbar_ab: 'dataroom', stand: 'freigegeben' },
  ];
  const raus = stufen.fuerStufe(tief, 'public').map((i) => i.id).sort((a, b) => a - b);
  ok('die Ordner auf dem Weg kommen mit', JSON.stringify(raus) === '[1,2,3,4]');
  ok('der Nachbarordner nicht', !raus.includes(5) && !raus.includes(6));
}

console.log('\n── Der Bestand verhält sich wie bisher ──');
{
  // Zeilen ohne die neuen Spalten: so sieht der Bestand vor der Wanderung aus.
  const alt = [
    { id: 1, parent_id: null, is_folder: 1, name: 'Finanzen' },
    { id: 2, parent_id: 1, is_folder: 0, name: 'BWA.pdf' },
  ];
  ok('ohne Angabe gilt die Datenraum-Stufe', stufen.fuerStufe(alt, 'public').length === 0);
  ok('und im Datenraum ist alles da', stufen.fuerStufe(alt, 'dataroom').length === 2);
}

console.log('\n── Die Sicht fragt wirklich danach ──');
{
  const sicht = lies('server', 'utils', 'datenraumSicht.js');
  ok('der Kontext trägt eine Stufe', /stufe: stufen\.stufeAusAkte|const stufe = stufen\.stufeAusAkte/.test(sicht));
  ok('der Baum wird vorher gefiltert', /stufen\.fuerStufe\(alleItems, ktx\.stufe/.test(sicht));
  ok('Stufe und Stand werden gelesen', /COALESCE\(sichtbar_ab, 'dataroom'\)/.test(sicht) && /COALESCE\(stand, 'freigegeben'\)/.test(sicht));
  ok('die Bewertung bleibt bei safeVisibility', /sichtbarkeit\.bewerteBaum/.test(sicht));

  const ablage = lies('server', 'utils', 'safeAblage.js');
  ok('ein neuer Eintrag bekommt Stufe und Stand', /sichtbar_ab, stand, fassung/.test(ablage));

  const safe = lies('server', 'routes', 'safe.js');
  ok('das Übernehmen setzt die Stufe am Objekt', /UPDATE safe_items SET sichtbar_ab = \?, stand = 'freigegeben'/.test(safe));

  const migration = lies('server', 'db', 'migrations', '20260901002190_stufe_und_stand.js');
  ok('der Bestand wird auf das heutige Verhalten zurückgefüllt',
    /sichtbar_ab: 'dataroom'/.test(migration) && /stand: 'freigegeben'/.test(migration));
  ok('Neues beginnt dagegen als Entwurf', /SET DEFAULT 'entwurf'/.test(migration));
  ok('die erlaubten Werte stehen in der Datenbank',
    /sichtbar_ab IN \('public','nda','dataroom'\)/.test(migration));
}

console.log(fail ? `\n${fail} Fehler` : '\nAlles grün');
process.exit(fail ? 1 : 0);
