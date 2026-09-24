// ─────────────────────────────────────────────────────────────────────────────
// Pflegeseite ohne Anmeldung, geprüft über die echten Routen (v0.405).
//
// Geprüft wird das, was teuer wäre: Der Link gilt genau einmal, eine
// Bestätigung ohne Änderung wird als Ergebnis festgehalten, ein Schwerpunkt,
// der nicht zum Sektor passt, wird abgelehnt, und die Abmeldung sperrt die
// Adresse für weitere Mailings dieser Art.
//
// Die Datenbank wird durch eine kleine Ablage im Speicher ersetzt, die in den
// Modul-Cache gelegt wird, bevor die Route geladen wird. So läuft der Test ohne
// Postgres, prüft aber den echten Weg durch Express.
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const http = require('http');
const Module = require('module');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };
const gleich = (n, a, b) => ok(n + (a === b ? '' : `  (war: ${JSON.stringify(a)}, erwartet: ${JSON.stringify(b)})`), a === b);

// ── Ablage im Speicher ──────────────────────────────────────────────────────
const stand = {
  firma: { id: 7, name: 'Muster GmbH', sektor: null, schwerpunkt: null, region: null, employees: null, street: null, postal_code: null, city: null, country: null },
  kontakt: { id: 3, first_name: 'Anna', last_name: 'Berg', salutation: 'Frau', email: 'berg@muster.de', responsibility: null },
  einladung: null,
  sperren: [],
  protokoll: [],
};

const setzeFelder = (ziel, sql, werte) => {
  const felder = (sql.match(/SET\s+([\s\S]*?)\s+WHERE/i) || [])[1] || '';
  let i = 0;
  for (const teil of felder.split(',')) {
    const m = teil.trim().match(/^(\w+)\s*=\s*(.+)$/);
    if (!m) continue;
    const [, feld, ausdruck] = m;
    if (ausdruck.trim() === '?') { ziel[feld] = werte[i]; i += 1; continue; }
    if (/now\(\)/i.test(ausdruck)) { ziel[feld] = new Date().toISOString(); continue; }
    if (/^NULL$/i.test(ausdruck.trim())) { ziel[feld] = null; continue; }
    const text = ausdruck.trim().match(/^'(.*)'$/);
    if (text) ziel[feld] = text[1];
  }
};

const fakeDb = {
  async get(sql, p = []) {
    if (/FROM pflege_einladungen WHERE token_hash/.test(sql)) {
      return (stand.einladung && stand.einladung.token_hash === p[0]) ? { ...stand.einladung } : null;
    }
    if (/FROM crm_companies/.test(sql)) return { ...stand.firma };
    if (/FROM crm_contacts/.test(sql)) return { ...stand.kontakt };
    return null;
  },
  async all() { return []; },
  async run(sql, p = []) {
    if (/UPDATE pflege_einladungen/.test(sql)) { setzeFelder(stand.einladung, sql, p); return 1; }
    if (/UPDATE crm_companies/.test(sql)) { setzeFelder(stand.firma, sql, p); return 1; }
    if (/UPDATE crm_contacts/.test(sql)) { setzeFelder(stand.kontakt, sql, p); return 1; }
    if (/INSERT INTO pflege_sperren/.test(sql)) { stand.sperren.push({ email: p[1] }); return 1; }
    return 1;
  },
  async insert() { return 1; },
  auditLog(...a) { stand.protokoll.push(a[1]); },
  withTenant: async (t, fn) => fn(fakeDb),
};

// Den Datenbank-Zugriff ersetzen, bevor die Route ihn lädt.
const dbPfad = require.resolve('../db/database');
require.cache[dbPfad] = new Module(dbPfad, null);
require.cache[dbPfad].filename = dbPfad;
require.cache[dbPfad].loaded = true;
require.cache[dbPfad].paths = Module._nodeModulePaths(path.dirname(dbPfad));
require.cache[dbPfad].exports = fakeDb;

const express = require('express');
const mailing = require('../utils/pflegeMailing');
const { publicRouter } = require('../routes/stammdaten');

const app = express();
app.use(express.json());
app.use('/api/stammdaten', publicRouter);

// ── Hilfen ──────────────────────────────────────────────────────────────────
let basis = '';
const hole = async (pfad, methode = 'GET', koerper = null) => {
  const res = await fetch(`${basis}/api/stammdaten${pfad}`, {
    method: methode,
    headers: { 'Content-Type': 'application/json' },
    body: koerper ? JSON.stringify(koerper) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
};

const neueEinladung = (token) => {
  stand.einladung = {
    id: 11, tenant_id: 1, kampagne_id: 1, company_id: 7, contact_id: 3, email: 'berg@muster.de',
    token_hash: mailing.tokenHash(token),
    fehlend_json: JSON.stringify(['sektor', 'region', 'employees', 'street', 'postal_code', 'city', 'country', 'ansprechperson_rolle']),
    status: 'versendet', versendet_am: new Date().toISOString(),
    geoeffnet_am: null, ausgefuellt_am: null, bestaetigt_am: null, abgemeldet_am: null, erinnert_am: null, unzustellbar_am: null,
  };
};

(async () => {
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  basis = `http://127.0.0.1:${server.address().port}`;

  // ── Seite öffnen ────────────────────────────────────────────────────────
  const token = mailing.neuerToken();
  neueEinladung(token);

  const auf = await hole(`/${token}`);
  gleich('die Seite öffnet sich', auf.status, 200);
  gleich('der Firmenname steht da', auf.json.data.firma.name, 'Muster GmbH');
  ok('nur selbst pflegbare Felder werden gezeigt', !auf.json.data.fehlend.includes('name'));
  ok('der Sektor wird abgefragt', auf.json.data.fehlend.includes('sektor'));
  ok('die Sektorliste kommt mit', (auf.json.data.vokabular.sektoren || []).length === 8);
  ok('das Öffnen wird festgehalten', !!stand.einladung.geoeffnet_am);

  const falscherToken = await hole(`/${mailing.neuerToken()}`);
  gleich('ein fremder Token führt ins Leere', falscherToken.status, 404);

  // ── Unpassender Schwerpunkt ─────────────────────────────────────────────
  const schief = await hole(`/${token}`, 'POST', { firma: { sektor: 'Handel', schwerpunkt: 'Private Equity' } });
  gleich('ein Schwerpunkt, der nicht zum Sektor passt, wird abgelehnt', schief.status, 400);
  gleich('die Firma bleibt dabei unverändert', stand.firma.sektor, null);

  const unbekannt = await hole(`/${token}`, 'POST', { firma: { sektor: 'Irgendwas' } });
  gleich('ein Sektor außerhalb der Liste wird abgelehnt', unbekannt.status, 400);

  // ── Angaben ergänzen ────────────────────────────────────────────────────
  const speichern = await hole(`/${token}`, 'POST', {
    firma: { sektor: 'Handel', region: 'Bayern', employees: '45', street: 'Weg 1', postal_code: '91056', city: 'Erlangen', country: 'Deutschland' },
    kontakt: { responsibility: 'Geschäftsführung' },
  });
  gleich('das Speichern gelingt', speichern.status, 200);
  gleich('der Sektor steht jetzt in der Firmenakte', stand.firma.sektor, 'Handel');
  gleich('die Mitarbeiterzahl kommt als Zahl an', stand.firma.employees, 45);
  gleich('die Rolle steht am Kontakt', stand.kontakt.responsibility, 'Geschäftsführung');
  gleich('der Vorgang ist als ausgefüllt vermerkt', stand.einladung.status, 'ausgefuellt');

  // ── Der Link gilt genau einmal ──────────────────────────────────────────
  const zweitesMal = await hole(`/${token}`);
  gleich('derselbe Link öffnet sich nicht noch einmal', zweitesMal.status, 404);
  const nochmalSpeichern = await hole(`/${token}`, 'POST', { firma: { region: 'Hessen' } });
  gleich('und lässt sich auch nicht noch einmal abschicken', nochmalSpeichern.status, 404);
  gleich('die zuletzt gespeicherte Region bleibt stehen', stand.firma.region, 'Bayern');

  // ── Bestätigung ohne Änderung ───────────────────────────────────────────
  const token2 = mailing.neuerToken();
  neueEinladung(token2);
  const vorher = { ...stand.firma };
  const bestaetigt = await hole(`/${token2}/bestaetigen`, 'POST');
  gleich('bestätigen gelingt', bestaetigt.status, 200);
  gleich('bestätigen ändert keine Angabe', JSON.stringify({ ...stand.firma, updated_at: null }), JSON.stringify({ ...vorher, updated_at: null }));
  gleich('bestätigen wird als eigenes Ergebnis vermerkt', stand.einladung.status, 'bestaetigt');
  ok('bestätigen setzt einen Zeitstempel', !!stand.einladung.bestaetigt_am);
  gleich('auch dieser Link gilt nur einmal', (await hole(`/${token2}/bestaetigen`, 'POST')).status, 404);

  // ── Abmeldung ───────────────────────────────────────────────────────────
  const token3 = mailing.neuerToken();
  neueEinladung(token3);
  const ab = await hole(`/${token3}/abmelden`, 'POST');
  gleich('die Abmeldung gelingt', ab.status, 200);
  gleich('die Adresse ist für weitere Mailings gesperrt', stand.sperren.length, 1);
  gleich('gesperrt ist die Adresse aus der Einladung', stand.sperren[0].email, 'berg@muster.de');
  gleich('nach der Abmeldung öffnet sich die Seite nicht mehr', (await hole(`/${token3}`)).status, 404);

  ok('jeder Schritt steht im Protokoll', stand.protokoll.length >= 3);

  server.close();
  console.log(fail ? `\n${fail} Fehler` : '\nAlle Prüfungen bestanden');
  process.exit(fail ? 1 : 0);
})();
