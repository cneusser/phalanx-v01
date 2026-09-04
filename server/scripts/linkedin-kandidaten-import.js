#!/usr/bin/env node
/**
 * LinkedIn-Kandidaten-Import (CLI).
 *
 * Liest die fünf Outreach-Excel-Dateien, legt Kontakte dublettenfrei an bzw.
 * reichert sie an, setzt je Mandat einen Funnel-Eintrag (Stufe 2 Ansprache,
 * Quelle linkedin_import) und schreibt je Mandat eine Ergebnis-CSV. Optional
 * aktualisiert es die Outreach-Excel (Spalten „Registriert" und „NDA").
 *
 * Nutzt dieselbe Zuordnungslogik wie der In-App-Import (utils/linkedinImport)
 * und den DB-Layer der App (db/database), also RLS-konform über withTenant.
 *
 * Voraussetzungen:
 *   - Umgebungsvariable DATABASE_URL (bzw. DATABASE_PUBLIC_URL) auf die Zieldatenbank.
 *   - exceljs installiert:  npm i exceljs
 *
 * Aufruf (aus dem Verzeichnis server/):
 *   DATABASE_URL=... node scripts/linkedin-kandidaten-import.js \
 *     --dir ~/Downloads/linkedin-import/outreach \
 *     [--excel ~/Downloads/linkedin-import/outreach/CapitalMatch_Investoren_nach_Mandat.xlsx] \
 *     [--dry]
 *
 * Nichts wird gelöscht. Kein Mailversand. Keine Einladungstokens.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

const li = require('../utils/linkedinImport');
let db, ExcelJS;
try { ExcelJS = require('exceljs'); } catch { console.error('Bitte zuerst exceljs installieren:  npm i exceljs'); process.exit(1); }

// Feste Import-Reihenfolge (ein Mehrfach-Kontakt entsteht nur einmal).
const FILES = [
  ['Betongold', 'capitalmatch_import_Betongold.xlsx'],
  ['Cudd', 'capitalmatch_import_Cudd.xlsx'],
  ['FARADAY', 'capitalmatch_import_FARADAY.xlsx'],
  ['Cavendish', 'capitalmatch_import_Cavendish.xlsx'],
  ['Nexora', 'capitalmatch_import_Nexora.xlsx'],
];

function arg(name, def) { const i = process.argv.indexOf('--' + name); return i > -1 ? (process.argv[i + 1] || true) : def; }
const expand = (p) => p && p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;
const DRY = process.argv.includes('--dry');
const DIR = expand(arg('dir', path.join(os.homedir(), 'Downloads/linkedin-import/outreach')));
const EXCEL = expand(arg('excel', path.join(DIR, 'CapitalMatch_Investoren_nach_Mandat.xlsx')));
const OUT = path.join(DIR, 'ergebnisse');

// Kopfzeile wie im App-Parser normalisieren (klein, nur Buchstaben inkl. äöüß).
const normKey = (h) => String(h || '').toLowerCase().replace(/[^a-zäöüß]/g, '');
const pick = (row, ...keys) => { for (const k of keys) if (row[k]) return String(row[k]).trim(); return null; };

async function readSheet(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0];
  const headers = [];
  ws.getRow(1).eachCell((c, i) => { headers[i] = normKey(c.text); });
  const rows = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r); const obj = {}; let any = false;
    row.eachCell((c, i) => { if (headers[i]) { obj[headers[i]] = c.text; if (String(c.text).trim()) any = true; } });
    if (any) rows.push(obj);
  }
  return rows;
}

async function main() {
  db = require('../db/database');
  if (db.initialize) { try { await db.initialize(); } catch { /* Migrationen laufen separat */ } }
  const admin = await db.get("SELECT id FROM users WHERE email = 'neusser@phalanx.de'").catch(() => null);
  const actorId = admin ? admin.id : null;
  fs.mkdirSync(OUT, { recursive: true });

  const summary = [];
  await db.withTenant(1, async (t) => {
    const allNames = await t.all('SELECT id, first_name, last_name FROM crm_contacts').catch(() => []);

    for (const [mandat, fname] of FILES) {
      const file = path.join(DIR, fname);
      if (!fs.existsSync(file)) { console.warn(`  Datei fehlt, übersprungen: ${fname}`); continue; }
      const rows = await readSheet(file);
      const project = await t.get('SELECT id, codename FROM projects WHERE codename = ?', [mandat]).catch(() => null);
      let created = 0, enriched = 0, registered = 0, parties = 0;
      const results = [];

      for (const r of rows) {
        const first = pick(r, 'vorname', 'firstname');
        const last = pick(r, 'nachname', 'lastname', 'name');
        if (!last) continue;
        const email = (pick(r, 'email', 'mail', 'emailadresse') || '').toLowerCase() || null;
        const linkedin = li.normalizeLinkedin(pick(r, 'linkedin', 'linkedinurl'));
        const buyerType = li.mapBuyerType(pick(r, 'käufertyp', 'kaeufertyp', 'buyertype'));
        const buyerTypeRaw = pick(r, 'käufertyp', 'kaeufertyp', 'buyertype');
        const source = pick(r, 'quelle', 'source') || 'linkedin_import';
        const note = pick(r, 'notiz', 'notizen', 'notes');
        const passung = pick(r, 'passung'); const prio = pick(r, 'prio', 'priority');

        let contact = null;
        if (email) contact = await t.get('SELECT * FROM crm_contacts WHERE lower(email) = ?', [email]).catch(() => null);
        if (!contact && linkedin) contact = await t.get('SELECT * FROM crm_contacts WHERE linkedin_url = ? OR lower(linkedin_url) = ?', [linkedin, linkedin]).catch(() => null);
        if (!contact && first && last) {
          const key = li.nameKey(first, last);
          const m = allNames.filter((c) => li.nameKey(c.first_name, c.last_name) === key);
          if (m.length === 1) contact = await t.get('SELECT * FROM crm_contacts WHERE id = ?', [m[0].id]).catch(() => null);
        }

        let contactId, outcome;
        if (contact) {
          contactId = contact.id;
          let tags = []; try { tags = JSON.parse(contact.tags_json || '[]'); } catch { tags = []; }
          tags = li.buildTags({ passung, prio, buyerTypeRaw, existing: tags });
          const mergedNote = note && !(contact.notes || '').includes(note) ? ((contact.notes ? contact.notes + '\n' : '') + note) : contact.notes;
          if (!DRY) await t.run(`UPDATE crm_contacts SET linkedin_url = COALESCE(linkedin_url, ?), buyer_type = COALESCE(NULLIF(buyer_type,''), ?), relationship = COALESCE(NULLIF(relationship,''), ?), source = COALESCE(NULLIF(source,''), ?), tags_json = ?, notes = ?, updated_at = now() WHERE id = ?`,
            [linkedin, buyerType, 'LinkedIn-Kontakt', source, JSON.stringify(tags), mergedNote, contactId]).catch(() => {});
          enriched++; outcome = 'angereichert';
        } else {
          const tags = li.buildTags({ passung, prio, buyerTypeRaw });
          contactId = DRY ? -1 : await t.insert(`INSERT INTO crm_contacts (tenant_id, salutation, title, first_name, last_name, email, phone, mobile, linkedin_url, location, responsibility, notes, buyer_type, relationship, source, tags_json, consent_status, contact_status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unknown', 'active', ?)`,
            [1, pick(r, 'anrede', 'salutation'), pick(r, 'titel', 'title'), first, last, email, pick(r, 'telefon', 'phone'), pick(r, 'mobil', 'mobile'), linkedin, pick(r, 'standort', 'location'), pick(r, 'position', 'funktion'), note, buyerType, 'LinkedIn-Kontakt', source, JSON.stringify(tags), actorId]).catch(() => -1);
          created++; outcome = 'neu angelegt';
          if (contactId > 0) allNames.push({ id: contactId, first_name: first, last_name: last });
        }

        const acc = await db.get('SELECT id, created_at FROM users WHERE id = ? OR lower(email) = lower(?) ORDER BY id LIMIT 1', [contact && contact.user_id ? contact.user_id : 0, email || '___none___']).catch(() => null);
        const hasAccount = !!acc;
        if (hasAccount) registered++;

        let ndaStatus = '';
        if (project && !hasAccount && !DRY && contactId > 0) {
          const existP = await t.get('SELECT id FROM crm_deal_parties WHERE project_id = ? AND contact_id = ?', [project.id, contactId]).catch(() => null);
          if (!existP) { await t.run(`INSERT INTO crm_deal_parties (tenant_id, project_id, contact_id, party_role, funnel_stage, party_status, source, next_step, stage_changed_at, created_by) VALUES (?, ?, ?, 'buyer', 2, 'open', 'linkedin_import', ?, now(), ?)`, [1, project.id, contactId, 'Über LinkedIn angesprochen, wartet auf Selbstregistrierung', actorId]).catch(() => {}); parties++; }
        }
        if (project && hasAccount) {
          const nda = await db.get('SELECT status FROM nda_requests WHERE user_id = ? AND project_id = ? ORDER BY id DESC LIMIT 1', [acc.id, project.id]).catch(() => null);
          ndaStatus = nda ? nda.status : '';
        }

        results.push({ first: first || '', last, linkedin: linkedin || '', result: outcome, account: hasAccount ? 'Konto vorhanden' : '', registered_at: acc && acc.created_at ? new Date(acc.created_at).toISOString().slice(0, 10) : '', mandat, contact_id: contactId, nda: ndaStatus });
      }

      // Ergebnis-CSV je Mandat
      const csv = ['Vorname;Nachname;LinkedIn;Ergebnis;Konto vorhanden;Registriert am;Mandat;Kontakt-ID;NDA']
        .concat(results.map((x) => [x.first, x.last, x.linkedin, x.result, x.account, x.registered_at, x.mandat, x.contact_id, x.nda].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')))
        .join('\n');
      fs.writeFileSync(path.join(OUT, `capitalmatch_import_ergebnis_${mandat}.csv`), '﻿' + csv, 'utf8');
      summary.push({ mandat, total: rows.length, created, enriched, registered, parties });
      console.log(`  ${mandat}: ${created} neu, ${enriched} angereichert, ${registered} mit Konto, ${parties} Funnel-Einträge (von ${rows.length})`);
    }
  });

  // Outreach-Excel aktualisieren (Formatierung bleibt erhalten, exceljs schreibt Styles zurück)
  if (!DRY && fs.existsSync(EXCEL)) {
    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(EXCEL);
      for (const [mandat] of FILES) {
        const ws = wb.getWorksheet(mandat);
        if (!ws) continue;
        const head = {}; ws.getRow(1).eachCell((c, i) => { head[normKey(c.text)] = i; });
        const csvPath = path.join(OUT, `capitalmatch_import_ergebnis_${mandat}.csv`);
        if (!fs.existsSync(csvPath)) continue;
        const map = new Map();
        fs.readFileSync(csvPath, 'utf8').replace(/^﻿/, '').split('\n').slice(1).forEach((line) => {
          const c = line.split(';').map((s) => s.replace(/^"|"$/g, '').replace(/""/g, '"'));
          if (c[2] || c[1]) map.set((c[2] || (c[0] + ' ' + c[1])).toLowerCase(), { account: c[4], regAt: c[5], nda: c[8] });
        });
        const colReg = head['registriert']; const colNda = head['nda'];
        const colLi = head['linkedin'] || head['linkedinurl']; const colV = head['vorname']; const colN = head['nachname'];
        if (!colReg && !colNda) continue;
        for (let r = 2; r <= ws.rowCount; r++) {
          const row = ws.getRow(r);
          const liVal = colLi ? li.normalizeLinkedin(row.getCell(colLi).text) : '';
          const nameVal = ((colV ? row.getCell(colV).text : '') + ' ' + (colN ? row.getCell(colN).text : '')).toLowerCase().trim();
          const hit = map.get(liVal) || map.get(nameVal);
          if (!hit) continue;
          if (colReg) row.getCell(colReg).value = hit.account ? `Konto vorhanden${hit.regAt ? ' (' + hit.regAt + ')' : ''}` : '';
          if (colNda && hit.nda) row.getCell(colNda).value = hit.nda;
        }
      }
      await wb.xlsx.writeFile(EXCEL);
      console.log(`  Outreach-Excel aktualisiert: ${EXCEL}`);
    } catch (e) { console.warn('  Excel-Update übersprungen:', e.message); }
  }

  console.log('\nZusammenfassung:'); summary.forEach((s) => console.log(`  ${s.mandat}: neu ${s.created}, angereichert ${s.enriched}, mit Konto ${s.registered}, Funnel ${s.parties}`));
  console.log(DRY ? '\nTrockenlauf, nichts geschrieben.' : `\nErgebnis-CSVs unter: ${OUT}`);
  process.exit(0);
}

main().catch((e) => { console.error('Fehler:', e); process.exit(1); });
