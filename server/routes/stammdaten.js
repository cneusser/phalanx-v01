// ─────────────────────────────────────────────────────────────────────────────
// Stammdatenpflege: Kampagnen (intern) und die Pflegeseite ohne Anmeldung.
//
// Öffentlich sind nur die Routen unter /api/stammdaten/:token. Sie arbeiten
// ausschließlich mit dem Einmal-Token und geben nie mehr preis als die Felder
// dieser einen Firma. Der Token wird nur gehasst verglichen.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db/database');
const wrap = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const mailing = require('../utils/pflegeMailing');
const voll = require('../utils/vollstaendigkeit');
const vokabular = require('../utils/vokabular');
const rundmail = require('../utils/rundmail');
const uebersetzung = require('../utils/uebersetzung');

const scoped = (req, fn) => (req.tenantId && req.tenantId !== 1) ? db.withTenant(req.tenantId, fn) : fn(db);
const qFor = (req) => ({
  get: (s, p) => scoped(req, (t) => t.get(s, p)),
  all: (s, p) => scoped(req, (t) => t.all(s, p)),
  run: (s, p) => scoped(req, (t) => t.run(s, p)),
  insert: (s, p) => scoped(req, (t) => t.insert(s, p)),
});
const ADMIN_ROLES = ['super_admin', 'advisor', 'tenant_owner'];
const nurStaff = (req, res, next) => (req.user && ADMIN_ROLES.includes(req.user.role))
  ? next() : res.status(403).json({ success: false, error: 'Nur für Beratung und Verwaltung.' });

// ═══════════════════════════════════════════════════════════════════════════
// Öffentlich: die Pflegeseite
// ═══════════════════════════════════════════════════════════════════════════
const publicRouter = express.Router();
const pflegeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false });

// Einladung über den Token finden. Ein verbrauchter oder abgemeldeter Token ist
// ungültig: Der Link gilt einmal, danach ist der Vorgang abgeschlossen.
async function einladungZu(token) {
  const hash = mailing.tokenHash(token);
  const e = await db.get('SELECT * FROM pflege_einladungen WHERE token_hash = ?', [hash]).catch(() => null);
  if (!e) return { fehler: 'Der Link ist ungültig. Möglicherweise wurde er beim Kopieren abgeschnitten.' };
  if (e.abgemeldet_am) return { fehler: 'Sie haben sich von diesem Mailing abgemeldet.' };
  if (e.ausgefuellt_am || e.bestaetigt_am) {
    return { fehler: 'Dieser Link wurde bereits verwendet. Vielen Dank, Ihre Angaben liegen vor.' };
  }
  return { einladung: e };
}

// Was steht an, und welche Felder fehlen? Wird beim Öffnen der Seite geholt.
publicRouter.get('/:token', pflegeLimiter, wrap(async (req, res) => {
  const { einladung, fehler } = await einladungZu(req.params.token);
  if (fehler) return res.status(404).json({ success: false, error: fehler });

  const firma = await db.get('SELECT * FROM crm_companies WHERE id = ?', [einladung.company_id]);
  const kontakt = await db.get('SELECT id, first_name, last_name, salutation, email, responsibility FROM crm_contacts WHERE id = ?', [einladung.contact_id]);
  if (!firma || !kontakt) return res.status(404).json({ success: false, error: 'Der Datensatz ist nicht mehr vorhanden.' });

  if (!einladung.geoeffnet_am) {
    await db.run(`UPDATE pflege_einladungen SET geoeffnet_am = now(), status = CASE WHEN status = 'versendet' THEN 'geoeffnet' ELSE status END WHERE id = ?`, [einladung.id]).catch(() => {});
  }

  const fehlend = JSON.parse(einladung.fehlend_json || '[]');
  res.json({ success: true, data: {
    firma: {
      name: firma.name, sektor: firma.sektor || '', schwerpunkt: firma.schwerpunkt || '',
      region: firma.region || '', employees: firma.employees || '',
      street: firma.street || '', postal_code: firma.postal_code || '',
      city: firma.city || '', country: firma.country || '',
    },
    kontakt: { name: [kontakt.first_name, kontakt.last_name].filter(Boolean).join(' '), email: kontakt.email || '', responsibility: kontakt.responsibility || '' },
    // Nur die Felder, die eine Person selbst beantworten kann.
    fehlend: voll.selbstPflegbar(fehlend),
    labels: Object.fromEntries(voll.FELDER.map((f) => [f.schluessel, f.label])),
    vokabular: { sektoren: vokabular.SEKTOREN, schwerpunkte: vokabular.SCHWERPUNKTE, laender: vokabular.LAENDER },
  } });
}));

const FIRMENFELDER = ['sektor', 'schwerpunkt', 'region', 'employees', 'street', 'postal_code', 'city', 'country'];

// Angaben ergänzen. Nur die Felder dieser Firma, nichts anderes.
publicRouter.post('/:token', pflegeLimiter, wrap(async (req, res) => {
  const { einladung, fehler } = await einladungZu(req.params.token);
  if (fehler) return res.status(404).json({ success: false, error: fehler });

  const eingabe = (req.body && req.body.firma) || {};
  const patch = {};
  for (const f of FIRMENFELDER) {
    if (eingabe[f] === undefined) continue;
    const wert = String(eingabe[f] == null ? '' : eingabe[f]).trim();
    if (!wert) continue;                                  // Leeres löscht nichts
    if (f === 'sektor' && !vokabular.istSektor(wert)) {
      return res.status(400).json({ success: false, error: 'Bitte wählen Sie einen Sektor aus der Liste.' });
    }
    if (f === 'employees') { const n = Number(wert); if (!Number.isFinite(n) || n <= 0) continue; patch.employees = Math.round(n); continue; }
    patch[f] = wert;
  }
  // Schwerpunkt muss zum Sektor passen. Sonst entstehen Angaben wie
  // „Handel / Private Equity", die sich später nicht auswerten lassen.
  const firmaAlt = await db.get('SELECT sektor FROM crm_companies WHERE id = ?', [einladung.company_id]);
  const sektor = patch.sektor || (firmaAlt && firmaAlt.sektor) || '';
  if (patch.schwerpunkt && !vokabular.schwerpunktPasst(sektor, patch.schwerpunkt)) {
    return res.status(400).json({ success: false, error: 'Der gewählte Schwerpunkt passt nicht zum Sektor.' });
  }

  if (Object.keys(patch).length) {
    await db.run(
      `UPDATE crm_companies SET ${Object.keys(patch).map((k) => `${k} = ?`).join(', ')}, updated_at = now() WHERE id = ?`,
      [...Object.values(patch), einladung.company_id]).catch(() => {});
  }

  // Angaben zur Person, sofern mitgeschickt.
  const person = (req.body && req.body.kontakt) || {};
  const kPatch = {};
  if (person.responsibility && String(person.responsibility).trim()) kPatch.responsibility = String(person.responsibility).trim().slice(0, 200);
  if (person.email && String(person.email).includes('@')) kPatch.email = String(person.email).trim().toLowerCase();
  if (Object.keys(kPatch).length) {
    await db.run(
      `UPDATE crm_contacts SET ${Object.keys(kPatch).map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
      [...Object.values(kPatch), einladung.contact_id]).catch(() => {});
  }

  await db.run(`UPDATE pflege_einladungen SET status = 'ausgefuellt', ausgefuellt_am = now(), token_hash = ? WHERE id = ?`,
    [mailing.tokenHash(mailing.neuerToken()), einladung.id]);
  db.auditLog(null, 'STAMMDATEN_SELBSTPFLEGE', 'crm_company', einladung.company_id,
    `${Object.keys(patch).length} Feld(er) ergänzt`, req.ip);
  res.json({ success: true, data: { gespeichert: Object.keys(patch).length + Object.keys(kPatch).length } });
}));

// Alles stimmt. Auch das ist ein Ergebnis und wird mit Zeitstempel festgehalten.
publicRouter.post('/:token/bestaetigen', pflegeLimiter, wrap(async (req, res) => {
  const { einladung, fehler } = await einladungZu(req.params.token);
  if (fehler) return res.status(404).json({ success: false, error: fehler });
  await db.run(`UPDATE pflege_einladungen SET status = 'bestaetigt', bestaetigt_am = now(), token_hash = ? WHERE id = ?`,
    [mailing.tokenHash(mailing.neuerToken()), einladung.id]);
  await db.run('UPDATE crm_companies SET updated_at = now() WHERE id = ?', [einladung.company_id]).catch(() => {});
  db.auditLog(null, 'STAMMDATEN_BESTAETIGT', 'crm_company', einladung.company_id, 'Angaben als aktuell bestätigt', req.ip);
  res.json({ success: true });
}));

// Abmeldung, und zwar nur für dieses Mailing. Das Konto bleibt unberührt.
publicRouter.post('/:token/abmelden', pflegeLimiter, wrap(async (req, res) => {
  const hash = mailing.tokenHash(req.params.token);
  const e = await db.get('SELECT * FROM pflege_einladungen WHERE token_hash = ?', [hash]).catch(() => null);
  if (!e) return res.status(404).json({ success: false, error: 'Der Link ist ungültig.' });
  await db.run(`UPDATE pflege_einladungen SET status = 'abgemeldet', abgemeldet_am = now() WHERE id = ?`, [e.id]);
  await db.run(
    `INSERT INTO pflege_sperren (tenant_id, email, grund, quelle) VALUES (?, ?, 'Abmeldung über den Link im Mailing', 'abmeldung')
     ON CONFLICT (tenant_id, email) DO NOTHING`, [e.tenant_id || 1, e.email]).catch(() => {});
  db.auditLog(null, 'STAMMDATEN_ABGEMELDET', 'crm_contact', e.contact_id, 'Abmeldung vom Pflege-Mailing', req.ip);
  res.json({ success: true });
}));

// ── Abmeldung von Rundmails (v0.409) ────────────────────────────────────────
// Eigener Weg, weil eine Rundmail kein Pflegemailing ist. Die Abmeldung gilt
// nur für Hinweise zur Plattform, der Zugang bleibt unberührt.
// Wer auf einen Abmeldelink klickt, erwartet eine Seite, keine Datenstruktur.
// Deshalb antwortet diese Route mit HTML, in der Bildsprache der Mails.
const abmeldeSeite = (titel, text) => `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${titel} · CapitalMatch</title></head>
<body style="margin:0;background:#f7f5f0;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:48px 20px;">
    <div style="background:#0f1c28;padding:26px 30px;">
      <div style="font:700 10px Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#8fa3b2;">Eine Marke der Phalanx GmbH</div>
      <div style="font:400 26px Georgia,serif;color:#fff;margin-top:8px;">CapitalMatch</div>
    </div>
    <div style="height:3px;background:#c9a96e;font-size:0;">&nbsp;</div>
    <div style="background:#fff;border:1px solid #d8dde1;border-top:0;padding:30px;">
      <h1 style="font:400 26px/1.25 Georgia,serif;color:#111820;margin:0 0 16px;">${titel}</h1>
      <p style="font:15px/1.7 Arial,sans-serif;color:#2f383f;margin:0;">${text}</p>
    </div>
  </div>
</body></html>`;

publicRouter.get('/rundmail-abmelden/:token', pflegeLimiter, wrap(async (req, res) => {
  const r = await rundmail.abmelden(req.params.token);
  res.type('html');
  if (!r.ok) {
    return res.status(404).send(abmeldeSeite('Der Link ist nicht mehr gültig',
      'Diese Abmeldung wurde bereits vorgenommen, oder der Link stammt aus einer alten Nachricht. Wenn Sie sicher gehen wollen, schreiben Sie kurz an datenschutz@phalanx.de.'));
  }
  res.send(abmeldeSeite('Abgemeldet',
    'Sie erhalten von uns keine Hinweise mehr zur Plattform. Ihr Zugang und alle Nachrichten, die zu einem laufenden Vorgang gehören, bleiben davon unberührt.'));
}));

// ═══════════════════════════════════════════════════════════════════════════
// Intern: Kampagnen und Datenpflege
// ═══════════════════════════════════════════════════════════════════════════
const router = express.Router();
router.use(authenticate, nurStaff);

// Übersicht „Datenpflege": Firmen mit fehlenden Feldern, filterbar.
router.get('/pflege/uebersicht', wrap(async (req, res) => {
  const q = qFor(req);
  // crm_companies kennt kein Loeschkennzeichen, Firmen werden hart geloescht
  // oder zusammengefuehrt. Bei Kontakten heisst das Kennzeichen anonymized_at.
  // Kein catch: Ein Fehler soll sichtbar werden und nicht als "0 Firmen" enden.
  const firmen = await q.all(`
    SELECT c.id, c.name, c.sektor, c.schwerpunkt, c.rollen_json, c.region, c.employees,
           c.street, c.postal_code, c.city, c.country, c.company_type
      FROM crm_companies c ORDER BY c.name`);
  const kontakte = await q.all(`
    SELECT k.id, k.last_name, k.email, COALESCE(cc.position, k.responsibility) AS responsibility, cc.company_id
      FROM crm_company_contacts cc JOIN crm_contacts k ON k.id = cc.contact_id
     WHERE k.anonymized_at IS NULL AND cc.ended_on IS NULL`);
  const proFirma = new Map();
  for (const k of kontakte) { const l = proFirma.get(Number(k.company_id)) || []; l.push(k); proFirma.set(Number(k.company_id), l); }

  const filter = String(req.query.fehlt || '').trim();
  const zeilen = [];
  const jeFeld = {};
  for (const f of firmen) {
    const { fehlend, labels, vollstaendig } = voll.pruefe(f, proFirma.get(Number(f.id)) || []);
    for (const k of fehlend) jeFeld[k] = (jeFeld[k] || 0) + 1;
    if (vollstaendig) continue;
    if (filter && !fehlend.includes(filter)) continue;
    zeilen.push({ id: f.id, name: f.name, sektor: f.sektor || null, company_type: f.company_type || null, fehlend, labels });
  }
  res.json({ success: true, data: {
    zeilen, gesamt: firmen.length, unvollstaendig: zeilen.length,
    je_feld: Object.entries(jeFeld).map(([k, n]) => ({ feld: k, label: voll.labelVon(k), anzahl: n })).sort((a, b) => b.anzahl - a.anzahl),
    felder: voll.FELDER,
  } });
}));

// Stapelbearbeitung: ein Feld für mehrere Firmen auf denselben Wert setzen.
router.post('/pflege/stapel', wrap(async (req, res) => {
  const feld = String(req.body.feld || '');
  const wert = String(req.body.wert == null ? '' : req.body.wert).trim();
  // Ein Schwerpunkt ohne passenden Sektor geht nicht. Damit man nicht zweimal
  // durch dieselbe Auswahl muss, darf der Sektor hier mitgeliefert werden und
  // wird dann in einem Zug mitgesetzt.
  const sektorMit = String(req.body.sektor || '').trim();
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
  if (!['sektor', 'schwerpunkt', 'region', 'country'].includes(feld)) {
    return res.status(400).json({ success: false, error: 'Dieses Feld lässt sich nicht im Stapel setzen.' });
  }
  if (!wert || !ids.length) return res.status(400).json({ success: false, error: 'Wert und Auswahl erforderlich.' });
  if (feld === 'sektor' && !vokabular.istSektor(wert)) return res.status(400).json({ success: false, error: 'Unbekannter Sektor.' });
  if (sektorMit && !vokabular.istSektor(sektorMit)) return res.status(400).json({ success: false, error: 'Unbekannter Sektor.' });
  if (feld === 'schwerpunkt' && sektorMit && !vokabular.schwerpunktPasst(sektorMit, wert)) {
    return res.status(400).json({ success: false, error: 'Der gewählte Schwerpunkt passt nicht zu diesem Sektor.' });
  }

  const q = qFor(req);
  let gesetzt = 0; const abgelehnt = [];
  for (const id of ids) {
    const f = await q.get('SELECT sektor, name FROM crm_companies WHERE id = ?', [id]);
    if (!f) { abgelehnt.push({ id, name: null, grund: 'Firma nicht gefunden' }); continue; }

    if (feld === 'schwerpunkt') {
      const sektor = sektorMit || f.sektor || '';
      if (!sektor) {
        abgelehnt.push({ id, name: f.name, grund: 'noch kein Sektor gesetzt' });
        continue;
      }
      if (!vokabular.schwerpunktPasst(sektor, wert)) {
        abgelehnt.push({ id, name: f.name, grund: `passt nicht zum Sektor ${sektor}` });
        continue;
      }
      if (sektorMit && sektorMit !== f.sektor) {
        await q.run('UPDATE crm_companies SET sektor = ?, schwerpunkt = ?, updated_at = now() WHERE id = ?',
          [sektorMit, wert, id]);
        gesetzt += 1;
        continue;
      }
    }
    await q.run(`UPDATE crm_companies SET ${feld} = ?, updated_at = now() WHERE id = ?`, [wert, id]);
    gesetzt += 1;
  }
  db.auditLog(req.user.id, 'CRM_STAPEL_PFLEGE', 'crm_company', null,
    `${feld} = ${wert}${sektorMit ? ` (Sektor ${sektorMit})` : ''} für ${gesetzt} Firmen`, req.ip);
  res.json({ success: true, data: { gesetzt, abgelehnt } });
}));

// ── Kampagnen ───────────────────────────────────────────────────────────────
router.get('/kampagnen', wrap(async (req, res) => {
  const q = qFor(req);
  const zeilen = await q.all('SELECT * FROM pflege_kampagnen ORDER BY id DESC LIMIT 50').catch(() => []);
  const mit = [];
  for (const k of zeilen) mit.push({ ...k, zahlen: await mailing.dashboard(q, k.id) });
  res.json({ success: true, data: mit });
}));

router.post('/kampagnen', wrap(async (req, res) => {
  const q = qFor(req);
  const name = String(req.body.name || '').trim() || `Stammdatenpflege ${new Date().toLocaleDateString('de-DE')}`;
  const id = await q.insert(
    `INSERT INTO pflege_kampagnen (tenant_id, name, betreff, text, text_erinnerung, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [req.tenantId || 1, name, req.body.betreff || mailing.STANDARD_BETREFF,
     req.body.text || mailing.STANDARD_TEXT, req.body.text_erinnerung || mailing.STANDARD_ERINNERUNG, req.user.id]);
  const anlegen = await mailing.einladungenAnlegen(q, { tenant: req.tenantId || 1, kampagneId: id });
  db.auditLog(req.user.id, 'PFLEGE_KAMPAGNE_ANGELEGT', 'pflege_kampagne', id, `${anlegen.angelegt} Einladungen`, req.ip);
  res.status(201).json({ success: true, data: { id, ...anlegen, klartext: undefined, ohneAnsprechperson: anlegen.ohneAnsprechperson } });
}));

router.put('/kampagnen/:id', wrap(async (req, res) => {
  const q = qFor(req);
  const erlaubt = ['name', 'betreff', 'text', 'text_erinnerung', 'status', 'ration', 'pause_sekunden', 'fenster_von', 'fenster_bis', 'erinnerung_nach_tagen'];
  const patch = {};
  for (const f of erlaubt) if (req.body[f] !== undefined) patch[f] = req.body[f];
  if (!Object.keys(patch).length) return res.json({ success: true });
  await q.run(`UPDATE pflege_kampagnen SET ${Object.keys(patch).map((k) => `${k} = ?`).join(', ')}, updated_at = now() WHERE id = ?`,
    [...Object.values(patch), req.params.id]);
  res.json({ success: true });
}));

// Eine Ration senden. Bewusst von Hand angestoßen, damit niemand aus Versehen
// einen Massenversand auslöst.
router.post('/kampagnen/:id/senden', wrap(async (req, res) => {
  const q = qFor(req);
  const appUrl = process.env.FRONTEND_URL || 'https://www.capitalmatch.de';
  const r = await mailing.versendeRation(q, {
    tenant: req.tenantId || 1, kampagneId: Number(req.params.id), appUrl,
    erinnerung: req.body && req.body.erinnerung === true,
  });
  res.json({ success: true, data: r });
}));

router.get('/kampagnen/:id/dashboard', wrap(async (req, res) => {
  res.json({ success: true, data: await mailing.dashboard(qFor(req), Number(req.params.id)) });
}));

// Empfängervorschau, bevor eine Kampagne angelegt wird.
router.get('/empfaenger-vorschau', wrap(async (req, res) => {
  const r = await mailing.empfaenger(qFor(req), { tenant: req.tenantId || 1 });
  res.json({ success: true, data: {
    anzahl: r.zeilen.length, firmen_geprueft: r.firmenGeprueft,
    ohne_ansprechperson: r.ohneAnsprechperson.slice(0, 50),
    beispiele: r.zeilen.slice(0, 10).map((z) => ({ firma: z.firma, email: z.email, fehlend: z.labels })),
  } });
}));

// ── Rundmails (v0.409) ──────────────────────────────────────────────────────
// Angeschrieben werden nur bestätigte, aktive und freigeschaltete Konten.
// Jede Ration wird von Hand angestoßen, damit ein Massenversand nie aus
// Versehen loslaufen kann.
router.get('/rundmails', wrap(async (req, res) => {
  const q = qFor(req);
  const zeilen = await q.all('SELECT * FROM rundmails ORDER BY id DESC LIMIT 50').catch(() => []);
  const mit = [];
  for (const k of zeilen) mit.push({ ...k, zahlen: await rundmail.dashboard(q, k.id) });
  res.json({ success: true, data: mit });
}));

router.get('/rundmail/empfaenger-vorschau', wrap(async (req, res) => {
  const r = await rundmail.empfaenger(qFor(req), { tenant: req.tenantId || 1 });
  res.json({ success: true, data: {
    anzahl: r.zeilen.length,
    konten_geprueft: r.geprueft,
    ausgeschlossen: r.ausgeschlossen.length,
    beispiele: r.zeilen.slice(0, 10).map((z) => ({ email: z.email, rolle: z.rolle })),
  } });
}));

router.post('/rundmails', wrap(async (req, res) => {
  const q = qFor(req);
  const name = String(req.body.name || '').trim() || `Rundmail ${new Date().toLocaleDateString('de-DE')}`;
  const id = await q.insert(
    `INSERT INTO rundmails (tenant_id, name, betreff, titel, text, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [req.tenantId || 1, name,
     req.body.betreff || rundmail.STANDARD_BETREFF,
     req.body.titel || rundmail.STANDARD_TITEL,
     req.body.text || rundmail.STANDARD_TEXT, req.user.id]);
  const angelegt = await rundmail.empfaengerAnlegen(q, { tenant: req.tenantId || 1, rundmailId: id });
  db.auditLog(req.user.id, 'RUNDMAIL_ANGELEGT', 'rundmail', id, `${angelegt.angelegt} Empfänger`, req.ip);
  res.status(201).json({ success: true, data: { id, ...angelegt } });
}));

router.put('/rundmails/:id', wrap(async (req, res) => {
  const q = qFor(req);
  const erlaubt = ['name', 'betreff', 'titel', 'text', 'status', 'ration', 'pause_sekunden', 'fenster_von', 'fenster_bis'];
  const patch = {};
  for (const f of erlaubt) if (req.body[f] !== undefined) patch[f] = req.body[f];
  if (!Object.keys(patch).length) return res.json({ success: true });
  await q.run(`UPDATE rundmails SET ${Object.keys(patch).map((k) => `${k} = ?`).join(', ')}, updated_at = now() WHERE id = ?`,
    [...Object.values(patch), req.params.id]);
  res.json({ success: true });
}));

router.post('/rundmails/:id/senden', wrap(async (req, res) => {
  const appUrl = process.env.FRONTEND_URL || 'https://www.capitalmatch.de';
  const r = await rundmail.versendeRation(qFor(req), {
    tenant: req.tenantId || 1, rundmailId: Number(req.params.id), appUrl,
  });
  db.auditLog(req.user.id, 'RUNDMAIL_RATION', 'rundmail', req.params.id,
    r.uebersprungen || `${r.versendet} versendet`, req.ip);
  res.json({ success: true, data: r });
}));

router.get('/rundmails/:id/dashboard', wrap(async (req, res) => {
  res.json({ success: true, data: await rundmail.dashboard(qFor(req), Number(req.params.id)) });
}));

// ── Übersetzungen der Mandate (v0.410) ──────────────────────────────────────
// Nebeneinander lesen, ändern, freigeben. Gezeigt wird einem Besucher nur, was
// freigegeben ist: Ein maschinell oder nebenbei erzeugter Satz darf in einem
// Verkaufsprozess nicht ungeprüft nach draußen.
const UEBERSETZBAR = ['short_description', 'deal_type', 'industry'];

router.get('/uebersetzungen', wrap(async (req, res) => {
  const q = qFor(req);
  const zeilen = await q.all(`
    SELECT id, codename, mandate_type, status, sprache, uebersetzung_status, uebersetzt_am,
           short_description, short_description_en, deal_type, deal_type_en, industry, industry_en
      FROM projects ORDER BY codename`);

  const mandate = zeilen.map((z) => ({
    id: z.id, codename: z.codename, mandate_type: z.mandate_type, status: z.status,
    sprache: z.sprache || 'de', uebersetzung_status: z.uebersetzung_status || 'fehlt',
    uebersetzt_am: z.uebersetzt_am,
    felder: UEBERSETZBAR.map((f) => ({
      feld: f, de: z[f] || '', en: z[`${f}_en`] || '',
    })),
    // Vollständig heißt: Zu jedem gefüllten deutschen Feld gibt es ein englisches.
    vollstaendig: UEBERSETZBAR.every((f) => !z[f] || (z[`${f}_en`] && String(z[`${f}_en`]).trim())),
  }));

  res.json({ success: true, data: {
    mandate,
    dienst_eingerichtet: uebersetzung.eingerichtet(),
    offen: mandate.filter((m) => m.uebersetzung_status !== 'freigegeben').length,
  } });
}));

router.put('/uebersetzungen/:id', wrap(async (req, res) => {
  const q = qFor(req);
  const patch = {};
  for (const f of UEBERSETZBAR) {
    const wert = req.body[`${f}_en`];
    if (wert !== undefined) patch[`${f}_en`] = String(wert).trim() || null;
  }
  const status = String(req.body.uebersetzung_status || '');
  if (['fehlt', 'entwurf', 'freigegeben'].includes(status)) patch.uebersetzung_status = status;
  if (!Object.keys(patch).length) return res.json({ success: true });

  // Freigeben geht nur, wenn auch etwas dasteht. Sonst wäre ein leeres Feld
  // freigegeben, und der Marktplatz zeigte für englische Leser eine Lücke.
  if (patch.uebersetzung_status === 'freigegeben') {
    const jetzt = await q.get(
      `SELECT ${UEBERSETZBAR.map((f) => `${f}, ${f}_en`).join(', ')} FROM projects WHERE id = ?`,
      [req.params.id]);
    const gefuellt = (w) => !!(w && String(w).trim());
    const fehlend = UEBERSETZBAR.filter((f) => {
      // Der englische Wert nach dieser Änderung, nicht der davor.
      const en = patch[`${f}_en`] !== undefined ? patch[`${f}_en`] : (jetzt && jetzt[`${f}_en`]);
      return gefuellt(jetzt && jetzt[f]) && !gefuellt(en);
    });
    if (fehlend.length) {
      return res.status(400).json({ success: false,
        error: `Noch nicht vollständig: ${fehlend.join(', ')} fehlt auf Englisch.` });
    }
  }

  const sets = Object.keys(patch);
  await q.run(
    `UPDATE projects SET ${sets.map((k) => `${k} = ?`).join(', ')}, uebersetzt_am = now() WHERE id = ?`,
    [...sets.map((k) => patch[k]), req.params.id]);

  db.auditLog(req.user.id, 'MANDAT_UEBERSETZUNG', 'project', req.params.id,
    patch.uebersetzung_status || 'geändert', req.ip);
  res.json({ success: true });
}));

// Fehlende Fassung maschinell vorbelegen. Ergebnis ist immer ein Entwurf.
router.post('/uebersetzungen/:id/vorbelegen', wrap(async (req, res) => {
  if (!uebersetzung.eingerichtet()) {
    return res.status(400).json({ success: false,
      error: 'Es ist kein Übersetzungsdienst eingerichtet. Die Fassung muss von Hand eingetragen werden.' });
  }
  const q = qFor(req);
  const z = await q.get(
    `SELECT sprache, ${UEBERSETZBAR.map((f) => `${f}, ${f}_en`).join(', ')} FROM projects WHERE id = ?`,
    [req.params.id]);
  if (!z) return res.status(404).json({ success: false, error: 'Mandat nicht gefunden.' });

  const r = await uebersetzung.felderVorbelegen(z, UEBERSETZBAR, { von: 'DE', nach: 'EN' });
  const sets = Object.keys(r.werte);
  if (sets.length) {
    await q.run(
      `UPDATE projects SET ${sets.map((k) => `${k} = ?`).join(', ')}, uebersetzung_status = 'entwurf', uebersetzt_am = now() WHERE id = ?`,
      [...sets.map((k) => r.werte[k]), req.params.id]);
  }
  db.auditLog(req.user.id, 'MANDAT_UEBERSETZUNG_VORBELEGT', 'project', req.params.id,
    `${sets.length} Feld(er)`, req.ip);
  res.json({ success: true, data: { vorbelegt: sets.length, fehler: r.fehler } });
}));

module.exports = { router, publicRouter };
