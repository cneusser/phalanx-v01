// ─────────────────────────────────────────────────────────────────────────────
// Datenraum-Plan: die Vertraulichkeitsstufen sind der kritische Teil.
//
// Ein Dokument im falschen Ordner ist ärgerlich. Eine Gehaltsliste, die
// versehentlich auf "nach Vereinbarung" statt "nur mit Einzelfreigabe" steht,
// ist ein Datenschutzvorfall. Deshalb prüft dieser Test die Stufen härter als
// die Ordnerzuordnung.
// ─────────────────────────────────────────────────────────────────────────────
const plan = require('../utils/datenraumPlan');

let fail = 0;
const ok = (name, cond) => { console.log((cond ? '✓' : '✗ FEHLER') + ' ' + name); if (!cond) fail++; };

const stufe = (name) => (plan.regelFuer(name) || {}).stufe || null;
const ordner = (name) => (plan.regelFuer(name) || {}).ordner || null;

// ── Was niemals unter "nur nach Vereinbarung" landen darf ─────────────────
const NUR_CLEAN_TEAM = [
  'Gehaltsliste 2025.xlsx',
  'Lohnjournal Dezember.pdf',
  'Personalliste mit Vergütung.xlsx',
  'Arbeitsvertrag Geschäftsführer.pdf',
  'Kundenliste Top 20.xlsx',
  'Preisliste Händler 2026.pdf',
  'Kalkulation Serienteile.xlsx',
  'Patentschrift DE102019.pdf',
  'Rezeptur Grundmasse.docx',
  'Quellcode Steuerung.zip',
];
const zuOffen = NUR_CLEAN_TEAM.filter((n) => stufe(n) !== 'vertraulich');
ok(`alle ${NUR_CLEAN_TEAM.length} heiklen Dokumente kommen auf "vertraulich"`
  + (zuOffen.length ? `  (zu offen: ${zuOffen.join(', ')})` : ''), zuOffen.length === 0);

// ── Was ohne Vereinbarung sichtbar sein darf, ist genau eines ─────────────
ok('der anonyme Teaser ist offen', stufe('Teaser FARADAY anonym.pdf') === 'offen');
ok('das Memorandum ist NICHT offen', stufe('Information Memorandum FARADAY.pdf') === 'nda');
ok('ein Exposé ist NICHT offen', stufe('Expose Projekt Faraday.pdf') === 'nda');

// ── Ordnerzuordnung an typischen Namen ────────────────────────────────────
const erwartet = [
  ['Jahresabschluss 2024.pdf', 'Wirtschaftliche Entwicklung (GuV, Bilanz, Cash Flow)'],
  ['BWA Januar 2026.pdf', 'Wirtschaftliche Entwicklung (GuV, Bilanz, Cash Flow)'],
  ['Gesellschaftsvertrag.pdf', 'Rechtliche Situation im Unternehmen'],
  ['Handelsregisterauszug HRB 4711.pdf', 'Rechtliche Situation im Unternehmen'],
  ['Darlehensvertrag Sparkasse.pdf', 'Finanzierung'],
  ['Organigramm 2026.png', 'Mitarbeiter und Management'],
  ['ISO 9001 Zertifikat.pdf', 'Organisation und Steuerung'],
  ['Maschinenliste Fertigung.xlsx', 'Leistungswirtschaftliche Entwicklung (Produkte, Kunden, Markt, Wettbewerb, Fertigung)'],
  ['Teaser FARADAY.pdf', 'Teaser und Investment Memorandum'],
];
const daneben = erwartet.filter(([n, o]) => ordner(n) !== o).map(([n, o]) => `${n} → ${ordner(n)} statt ${o}`);
ok(`alle ${erwartet.length} Beispielnamen landen im richtigen Ordner`
  + (daneben.length ? `\n     ${daneben.join('\n     ')}` : ''), daneben.length === 0);

// ── Nichts raten ──────────────────────────────────────────────────────────
ok('ein nichtssagender Name wird nicht zugeordnet', plan.regelFuer('Scan_0042.pdf') === null);
ok('ein leerer Name wird nicht zugeordnet', plan.regelFuer('') === null && plan.regelFuer(null) === null);

// ── Der Plan selbst ───────────────────────────────────────────────────────
const dateien = [
  { id: 1, name: 'Teaser FARADAY.pdf', parent_name: null, confidential: 0 },
  { id: 2, name: 'Gehaltsliste 2025.xlsx', parent_name: 'Finanzierung', confidential: 0 },
  { id: 3, name: 'Jahresabschluss 2024.pdf', parent_name: 'Wirtschaftliche Entwicklung (GuV, Bilanz, Cash Flow)', confidential: 0 },
  { id: 4, name: 'Scan_0042.pdf', parent_name: null, confidential: 0 },
];
const p = plan.planen(dateien);
ok('die Gehaltsliste soll verschoben werden', p.verschieben.some((v) => v.id === 2));
ok('die Gehaltsliste soll vertraulich werden', p.stufen.some((s) => s.id === 2 && s.nach === 'vertraulich'));
ok('der bereits richtig liegende Jahresabschluss wird nicht bewegt', !p.verschieben.some((v) => v.id === 3));
ok('der nichtssagende Scan landet unter "unklar"', p.unklar.length === 1 && p.unklar[0].id === 4);
ok('jeder Vorschlag nennt einen Grund', p.verschieben.concat(p.stufen).every((x) => x.grund && x.grund.length > 10));

// ── Prüfliste ─────────────────────────────────────────────────────────────
const gefunden = p.pruefliste.filter((e) => e.vorhanden).map((e) => e.was);
ok('die Prüfliste erkennt den vorhandenen Jahresabschluss', gefunden.some((w) => /Jahresabschl/.test(w)));
ok('die Prüfliste meldet das fehlende Organigramm', p.pruefliste.some((e) => /Organigramm/.test(e.was) && !e.vorhanden));
ok('die Prüfliste hat mehr als zehn Punkte', p.pruefliste.length > 10);

// Eine Regel, die auf alles passt, wäre schlimmer als keine Regel.
const allesTreffer = plan.REGELN.filter((r) => r.muster.test('Scan_0042.pdf'));
ok('keine Regel greift auf einen beliebigen Namen', allesTreffer.length === 0);

process.exit(fail ? 1 : 0);
