#!/usr/bin/env node
/**
 * Datenraum-Import: legt einen vorbereiteten Ordnerbaum als Dokumente eines
 * Mandats in CapitalMatch ab, mit Ordnerpfad, sprechendem Namen und der
 * Zugriffsstufe „approved" (sichtbar erst nach persönlicher Freigabe je
 * Interessent).
 *
 * Der Import läuft bewusst über die HTTP-Schnittstelle, nicht über die
 * Datenbank: So legt der Server die Dateien selbst in seinem Volume ab, und das
 * Skript funktioniert vom eigenen Rechner aus gegen die Produktion.
 *
 * Anmeldung: über das eigene Sitzungs-Token aus dem Browser (CM_TOKEN). Der
 * Login per Passwort ist durch den Cloudflare-Sicherheitscheck geschützt, den
 * ein Skript nicht lösen kann und auch nicht umgehen soll. Zugangsdaten werden
 * nur aus Umgebungsvariablen gelesen, nie als Argument übergeben.
 *
 *   cd server
 *   export CM_TOKEN=<phalanx_token aus dem Local Storage>
 *   node scripts/datenraum-import.js \
 *     --dir "/Users/<du>/Downloads/Dokumente/1 Datenraum" \
 *     --projekt FARADAY --dry
 *
 * Danach ohne --dry für den echten Lauf.
 *
 * Optionen:
 *   --dir <Pfad>       Wurzel des Ordnerbaums (Pflicht)
 *   --projekt <Name>   Codename oder ID des Mandats (Pflicht)
 *   --dry              Trockenlauf, lädt nichts hoch
 *   --clean-team       Abschnitt 1.17 Clean Team mit importieren (Standard: aus)
 *   --stufe <Wert>     public | nda | approved (Standard: approved)
 *   --basis <URL>      Standard: https://www.capitalmatch.de
 *
 * Eigenschaften: idempotent (gleicher Ordner + gleicher Name wird übersprungen),
 * überspringt Ordner, die mit "0 " beginnen (Klärfälle, Doubletten), und
 * überspringt den Clean-Team-Abschnitt, solange er nicht ausdrücklich gewünscht ist.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ERLAUBT = new Set(['.pdf', '.pptx', '.ppt', '.xlsx', '.xls', '.docx', '.doc', '.jpg', '.jpeg', '.png', '.webp']);
const MIME = {
  '.pdf': 'application/pdf',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
};

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
}
const hat = (name) => process.argv.includes(`--${name}`);

const BASIS = (arg('basis', process.env.CM_BASE_URL || 'https://www.capitalmatch.de')).replace(/\/+$/, '');
const DIR = arg('dir');
const PROJEKT = arg('projekt');
const STUFE = arg('stufe', 'approved');
const DRY = hat('dry');
const CLEAN_TEAM = hat('clean-team');

function frage(text) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(text, (a) => { rl.close(); res(a.trim()); }));
}

// Verdeckte Eingabe: Die Zeichen erscheinen nicht auf dem Bildschirm, damit ein
// Token weder im Fenster noch auf einem Bildschirmfoto landet.
function frageVerdeckt(text) {
  return new Promise((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let still = false;
    rl._writeToOutput = (s) => { if (!still) rl.output.write(s); };
    rl.question(text, (a) => { rl.output.write('\n'); rl.close(); res(String(a).trim()); });
    still = true;
  });
}

async function api(pfad, { method = 'GET', token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASIS}/api${pfad}`, {
    method, headers, body: form || (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* HTML-Fehlerseite */ }
  if (!res.ok) throw new Error(`${method} ${pfad} → ${res.status}: ${(json && json.error) || text.slice(0, 200)}`);
  return json && json.data !== undefined ? json.data : json;
}

const TOKEN_HILFE_KURZ = `
Sitzungs-Token benötigt. In CapitalMatch im Browser anmelden, dann
Entwicklerwerkzeuge (Wahltaste + Command + I) -> "Application" bzw. "Speicher"
-> Local Storage -> https://www.capitalmatch.de -> Wert von "phalanx_token" kopieren.
`;

const TOKEN_HILFE = `
So kommst du an das Sitzungs-Token:
  1. In CapitalMatch im Browser normal anmelden (dort loest du den Sicherheitscheck als Mensch).
  2. Entwicklerwerkzeuge oeffnen (Wahltaste + Command + I), Reiter "Application"
     bzw. "Speicher" -> Local Storage -> https://www.capitalmatch.de
  3. Den Wert von "phalanx_token" kopieren.
  4. Im Terminal setzen:   export CM_TOKEN=<eingefuegter Wert>
Das Token ist zeitlich begrenzt. Laeuft es ab, einfach ein frisches holen.`;

function tokenPlausibel(t) {
  // Ein JWT besteht aus drei durch Punkte getrennten Teilen und beginnt mit "ey".
  return /^ey[\w-]+\.[\w-]+\.[\w-]+$/.test(String(t || '').trim());
}

async function anmelden() {
  // Bevorzugt: bestehendes Sitzungs-Token. Der Login ist durch den
  // Cloudflare-Sicherheitscheck geschuetzt, den ein Skript nicht loesen kann
  // (und auch nicht umgehen soll). Die Anmeldung machst du daher im Browser.
  if (process.env.CM_TOKEN) {
    const t = process.env.CM_TOKEN.trim();
    if (!tokenPlausibel(t)) {
      console.error(`\nCM_TOKEN sieht nicht wie ein Sitzungs-Token aus: "${t.slice(0, 24)}"`);
      console.error('Das ist vermutlich noch der Platzhalter. Lassen Sie CM_TOKEN einfach weg,');
      console.error('dann fragt das Skript den Token gleich selbst ab.\n');
      process.exit(1);
    }
    return t;
  }

  const email = process.env.CM_EMAIL;
  const passwort = process.env.CM_PASSWORD;

  // Nichts gesetzt: Token direkt hier abfragen. So muss niemand etwas in der
  // Befehlszeile ersetzen, und der Token landet nicht in der Shell-History.
  if (!email && !passwort) {
    console.log(TOKEN_HILFE_KURZ);
    for (let versuch = 1; versuch <= 3; versuch++) {
      const t = await frageVerdeckt('Sitzungs-Token einfügen und Enter drücken (Eingabe bleibt unsichtbar): ');
      if (tokenPlausibel(t)) return t;
      console.error(t ? 'Das sieht nicht wie ein Token aus (erwartet wird ein Wert, der mit "ey" beginnt).' : 'Nichts eingegeben.');
    }
    console.error(`\nAbgebrochen.\n${TOKEN_HILFE}`);
    process.exit(1);
  }

  if (!email || !passwort) {
    console.error(`Unvollständiger Zugang.\n${TOKEN_HILFE}`);
    process.exit(1);
  }
  let d;
  try {
    d = await api('/auth/login', { method: 'POST', body: { email, password: passwort } });
  } catch (e) {
    if (/Sicherheitscheck|Roboter/i.test(e.message)) {
      console.error(`\nDer Login ist durch den Sicherheitscheck geschuetzt, den ein Skript nicht loesen kann.\nBitte stattdessen mit CM_TOKEN arbeiten.\n${TOKEN_HILFE}`);
      process.exit(1);
    }
    throw e;
  }
  if (d && d.twofa_required) {
    const code = await frage('Zwei-Faktor-Code: ');
    d = await api('/auth/login/2fa', { method: 'POST', body: { challenge: d.challenge, code } });
  }
  if (!d || !d.token) throw new Error('Anmeldung fehlgeschlagen (kein Token erhalten).');
  return d.token;
}

async function mandatFinden(token) {
  if (/^\d+$/.test(PROJEKT)) return Number(PROJEKT);
  const liste = await api('/admin/projects', { token });
  const rows = Array.isArray(liste) ? liste : (liste.items || []);
  const treffer = rows.filter((p) => String(p.codename || '').toLowerCase() === PROJEKT.toLowerCase());
  if (!treffer.length) {
    const namen = rows.map((p) => p.codename).filter(Boolean).join(', ');
    throw new Error(`Mandat "${PROJEKT}" nicht gefunden. Vorhanden: ${namen}`);
  }
  return treffer[0].id;
}

// Dateien sammeln: relative Ordnerpfade als folder, Dateiname als Anzeigename.
function sammeln(wurzel) {
  const raus = [];
  (function lauf(abs) {
    for (const eintrag of fs.readdirSync(abs, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'de'))) {
      if (eintrag.name === '.DS_Store' || eintrag.name.startsWith('.')) continue;
      const p = path.join(abs, eintrag.name);
      if (eintrag.isDirectory()) {
        if (eintrag.name.startsWith('0 ')) continue;                       // Klärfälle, Doubletten
        if (!CLEAN_TEAM && /clean team/i.test(eintrag.name)) continue;      // separat freigeben
        lauf(p);
        continue;
      }
      const ext = path.extname(eintrag.name).toLowerCase();
      if (!ERLAUBT.has(ext)) { console.warn(`  übersprungen (Dateityp): ${eintrag.name}`); continue; }
      const rel = path.relative(wurzel, path.dirname(p));
      raus.push({ pfad: p, ordner: rel === '' ? '' : rel.split(path.sep).join('/'), name: eintrag.name, ext });
    }
  }(wurzel));
  return raus;
}

(async () => {
  if (!DIR || !PROJEKT) {
    console.error('Pflichtangaben: --dir "<Ordner>" --projekt <Codename oder ID>');
    process.exit(1);
  }
  if (!fs.existsSync(DIR)) { console.error(`Ordner nicht gefunden: ${DIR}`); process.exit(1); }
  if (!['public', 'nda', 'approved'].includes(STUFE)) { console.error('--stufe muss public, nda oder approved sein.'); process.exit(1); }

  const dateien = sammeln(DIR);
  console.log(`\nGefunden: ${dateien.length} Datei(en) unter ${DIR}`);
  console.log(`Zugriffsstufe: ${STUFE}${STUFE === 'approved' ? ' (erst nach persönlicher Freigabe sichtbar)' : ''}`);
  console.log(`Clean Team: ${CLEAN_TEAM ? 'wird mit importiert' : 'ausgenommen'}\n`);

  const token = await anmelden();
  const projectId = await mandatFinden(token);
  console.log(`Mandat: ${PROJEKT} (ID ${projectId})\n`);

  // Bestand laden, um doppelte Anlage zu vermeiden.
  const bestand = await api(`/documents/${projectId}`, { token });
  const vorhanden = new Set((Array.isArray(bestand) ? bestand : (bestand.documents || bestand.items || []))
    .map((d) => `${d.folder || ''} ${d.filename}`));

  let neu = 0, uebersprungen = 0, fehler = 0;
  for (const f of dateien) {
    const schluessel = `${f.ordner} ${f.name}`;
    if (vorhanden.has(schluessel)) { uebersprungen++; continue; }
    const groesse = fs.statSync(f.pfad).size;
    if (groesse > 50 * 1024 * 1024) { console.warn(`  zu groß (>50 MB), übersprungen: ${f.name}`); fehler++; continue; }
    console.log(`${DRY ? 'PLAN' : 'LADE'}  ${f.ordner}/${f.name}  (${(groesse / 1024 / 1024).toFixed(1)} MB)`);
    if (DRY) { neu++; continue; }
    try {
      const form = new FormData();
      form.append('file', new Blob([fs.readFileSync(f.pfad)], { type: MIME[f.ext] || 'application/octet-stream' }), f.name);
      form.append('display_name', f.name);
      form.append('folder', f.ordner);
      form.append('access_level', STUFE);
      form.append('description', '');
      await api(`/documents/${projectId}`, { method: 'POST', token, form });
      neu++;
    } catch (e) {
      console.error(`  FEHLER bei ${f.name}: ${e.message}`);
      fehler++;
    }
  }

  console.log(`\n${DRY ? 'Trockenlauf' : 'Import'} fertig: ${neu} ${DRY ? 'würden angelegt' : 'angelegt'}, ${uebersprungen} bereits vorhanden, ${fehler} Fehler.`);
  if (!CLEAN_TEAM) console.log('Hinweis: Der Abschnitt Clean Team wurde ausgenommen. Für ihn später mit --clean-team erneut laufen lassen.');
})().catch((e) => { console.error('\nAbbruch:', e.message); process.exit(1); });
