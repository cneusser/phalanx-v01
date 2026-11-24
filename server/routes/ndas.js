// CapitalMatch – NDA-Route: PostgreSQL/Knex
const express = require('express');
const path = require('path');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const crypto = require('crypto');
const fs = require('fs');
const { generateNDA, saveNDA, NDA_DIR } = require('../utils/ndaGenerator');
const wrap = require('../utils/asyncHandler');
const { setStage, getStage } = require('../middleware/gates');
const { getSignatureProvider } = require('../providers/signature');
const router = express.Router();

// Aktive NDA-Vorlage aus der DB laden (Fallback: eingebaute Standard-Vorlage)
async function loadNdaTemplate() {
  const row = await db.get(`SELECT * FROM nda_templates WHERE is_active = 1 ORDER BY version DESC, id DESC LIMIT 1`);
  if (!row) return { id: null, ...require('../db/defaultNdaTemplate') };
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    court_venue: row.court_venue,
    advisor: JSON.parse(row.advisor_json || '{}'),
    preamble: row.preamble,
    // v0.490: Die englische Spalte. Fehlt sie, bleibt die Vorlage einsprachig,
    // und alles weitere verhält sich wie bisher.
    preamble_en: row.preamble_en || null,
    titel: row.titel || null,
    titel_en: row.titel_en || null,
    sections: JSON.parse(row.sections_json || '[]'),
  };
}

// Die Angaben, die der Vertrag über den Interessenten nennt (v0.490).
// Sie stehen im Profil, werden aber im Unterschriftsdialog erhoben, weil sie
// erst dort gebraucht werden und dort erklärbar sind.
const VERTRAGSFELDER = ['company_seat', 'company_register', 'company_representative'];
const VERTRAGSFELDER_NAMEN = {
  company_seat: 'Sitz',
  company_register: 'Register und Nummer',
  company_representative: 'vertretungsberechtigte Person',
};

/**
 * Die Gegenzeichnung der Beratung (v0.491).
 *
 * § 8 der Vereinbarung sagt, sie tritt „mit Unterzeichnung durch beide
 * Parteien" in Kraft. Bis v0.490 trug die Urkunde nur eine Unterschrift. Die
 * Gegenzeichnung geschieht jetzt im selben Vorgang und in derselben Form, in
 * der auch der Interessent zeichnet: in Textform, mit Name, Funktion, Ort und
 * Zeitpunkt. § 10 Absatz 1 lässt das ausdrücklich genügen.
 *
 * Sie hängt an keiner Handlung und an keiner Freigabe. Ein Vertrag, der an
 * einem Posten in jemandes Postfach hängt, ist genau der zweite Schritt, den
 * v0.489 entfernt hat.
 *
 * @returns {object|null} { name, role, place, date }
 */
function gegenzeichnungAus(template, zeitpunkt) {
  const unterzeichner = (template.advisor && template.advisor.signer) || null;
  if (!unterzeichner || !unterzeichner.name) return null;
  return {
    name: unterzeichner.name,
    role: unterzeichner.role || null,
    place: unterzeichner.place || null,
    date: zeitpunkt,
  };
}

/** Der Interessent, wie ihn die Fassung braucht. Eine Stelle, nicht drei. */
function kaeuferAus(user) {
  return {
    first_name: [user.title, user.first_name].filter(Boolean).join(' '),
    last_name: user.last_name,
    company: user.company,
    email: user.email,
    company_seat: user.company_seat || '',
    company_register: user.company_register || '',
    company_representative: user.company_representative || '',
  };
}

const { requireCompleteProfile } = require('../utils/profileCompleteness');
const ndaFassung = require('../utils/ndaFassung');

// ─── NDA anfordern (setzt vollständiges Profil voraus) ──────────────────────
// v0.488: Hier werden die vollstaendigen Kontaktdaten verlangt, und hier sind
// sie begruendet: Mit der Vereinbarung wird der Interessent Vertragspartei.
router.post('/', authenticate, requireCompleteProfile('voll'), wrap(async (req, res) => {
  const { project_id } = req.body;
  if (!project_id) return res.status(400).json({ success: false, error: 'project_id fehlt' });
  const project = await db.get(`SELECT id, codename, created_by FROM projects WHERE id = ? AND status = 'active'`, [project_id]);
  if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });
  // Kein NDA/Interesse am EIGENEN Mandat (Verkäufer/Ersteller kann nicht auf sich selbst bieten)
  if (project.created_by === req.user.id) {
    return res.status(403).json({ success: false, error: 'Dies ist Ihr eigenes Mandat. Ein Interesse ist hier nicht möglich.' });
  }
  const existing = await db.get('SELECT * FROM nda_requests WHERE user_id = ? AND project_id = ?', [req.user.id, project_id]);
  if (existing) return res.status(409).json({ success: false, error: 'NDA bereits angefordert', data: { status: existing.status } });

  const ndaId = await db.insert(`INSERT INTO nda_requests (user_id, project_id, status) VALUES (?, ?, 'requested')`, [req.user.id, project_id]);
  // Zustandsautomat: Interesse registrieren (Gate-Grundlage)
  await setStage(req.user.id, project_id, 'requested', req.user.id, req.ip);
  db.auditLog(req.user.id, 'NDA_REQUESTED', 'nda_request', ndaId, `Projekt: ${project.codename}`, req.ip);
  // Sprint 15: Interesse → Intro → Chat (Verbindung Käufer↔Berater + Systemnachricht + Intro-Mail)
  require('../utils/dealChat').introduceBuyer({ project, buyer: req.user, reason: 'NDA angefordert' }).catch(() => {});
  // Sprint 17: XP für Interesse
  require('../utils/xp').award(req.user.id, 'INTEREST_EXPRESSED', { refType: 'project', refId: project.id }).catch(() => {});
  res.status(201).json({ success: true, data: { id: ndaId, status: 'requested' } });
}));

// ─── Meine NDAs ──────────────────────────────────────────────────────────────
router.get('/', authenticate, wrap(async (req, res) => {
  const ndas = await db.all(`
    SELECT nr.*, p.codename, p.industry, p.region, p.deal_type
    FROM nda_requests nr JOIN projects p ON p.id = nr.project_id
    WHERE nr.user_id = ? ORDER BY nr.requested_at DESC
  `, [req.user.id]);
  res.json({ success: true, data: ndas });
}));

// ─── NDA Status ──────────────────────────────────────────────────────────────
router.get('/:projectId/status', authenticate, wrap(async (req, res) => {
  const nda = await db.get('SELECT * FROM nda_requests WHERE user_id = ? AND project_id = ?', [req.user.id, req.params.projectId]);
  // Der IM-/Datenraum-Zugang steht in interests.stage und muss hier gespiegelt
  // werden. Sonst bleibt das IM optisch gesperrt, obwohl der Server es bereits
  // ausliefert, etwa wenn im Funnel „NDA liegt vor" gesetzt oder (bei Startup-
  // Finanzierungen) die Freigabe ohne NDA erteilt wurde. Ohne diesen Datenabgleich
  // hing die Detailseite allein am nda_requests-Eintrag.
  const interest = await db.get('SELECT stage FROM interests WHERE buyer_id = ? AND project_id = ?', [req.user.id, req.params.projectId]).catch(() => null);
  const stage = interest ? interest.stage : null;
  let fromStage = null;
  if (stage === 'nda_signed' || stage === 'im_granted') fromStage = 'signed';        // IM frei, Datenraum noch nicht
  else if (stage === 'dataroom_granted' || stage === 'loi') fromStage = 'approved';  // Vollzugriff
  const order = { requested: 1, signed: 2, approved: 3 };
  let status = nda ? nda.status : null;
  if (fromStage && (order[fromStage] || 0) > (order[status] || 0)) status = fromStage;

  // ── Zugang und Unterschrift sind zweierlei (v0.506) ────────────────────────
  //
  // Bis hierher endete die Abfrage eine Zeile früher, und `status` war beides
  // zugleich: Es trug den Vorgang und, wenn die Stufe weiter war, auch sie.
  // Ein Interessent, dessen Datenraum von Hand geöffnet wurde, las daraufhin
  // „Zugang freigeschaltet" und schloss daraus, er habe unterschrieben. Genau
  // das ist bei FARADAY passiert, und die Rückfrage dazu kam per Mail.
  //
  // `status` bleibt, damit nichts bricht, was daran hängt. Daneben stehen
  // jetzt zwei Angaben, die sich nicht vermischen lassen: was offen ist, und
  // ob es dafür einen Nachweis gibt.
  const { nachweisFuer } = require('../utils/ndaNachweis');
  const nachweis = await nachweisFuer(db, { userId: req.user.id, projectId: Number(req.params.projectId) });
  const zugang = (stage === 'dataroom_granted' || stage === 'loi') ? 'datenraum'
    : (stage === 'nda_signed' || stage === 'im_granted') ? 'unterlagen'
      : null;

  res.json({ success: true, data: {
    ...(nda || {}), id: nda ? nda.id : null, status,
    vorgang: nda ? nda.status : null,   // der reine Stand des NDA-Vorgangs
    zugang,                              // was tatsächlich offen ist
    nachweis,                            // ob es dafür eine Unterschrift gibt
  } });
}));

// ─── NDA Dokument als PDF abrufen (Preview zum Lesen) ────────────────────────
router.get('/:projectId/document', authenticate, wrap(async (req, res) => {
  try {
    const project = await db.get('SELECT * FROM projects WHERE id = ?', [req.params.projectId]);
    if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });

    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const nda = await db.get('SELECT * FROM nda_requests WHERE user_id = ? AND project_id = ?', [req.user.id, req.params.projectId]);

    const buyerData = {
      id: user.id,
      first_name: [user.title, user.first_name].filter(Boolean).join(' '),
      last_name: user.last_name,
      company: user.company || '',
      position: user.position || '',
      email: user.email,
      // Anschrift aus dem Pflichtprofil (Sprint 5.1)
      address: user.street || '',
      city: [user.postal_code, user.city].filter(Boolean).join(' '),
      country: 'Deutschland',
      // v0.490: Die Vorlage nennt die Vertragspartei mit Sitz, Register
      // und vertretungsberechtigter Person.
      company_seat: user.company_seat || '',
      company_register: user.company_register || '',
      company_representative: user.company_representative || '',
    };

    // If already signed, include signature info
    const signature = (nda && nda.online_consent_at) ? {
      name: nda.consent_name || `${user.first_name} ${user.last_name}`,
      company: user.company || '',
      date: nda.online_consent_at,
      ip: nda.consent_ip || null,
    } : null;

    const template = await loadNdaTemplate();
    const pdfBuffer = await generateNDA({
      buyer: buyerData,
      project: { codename: project.codename, industry: project.industry, region: project.region },
      template,
      signature,
      // v0.491: Gegengezeichnet wird nur, was auch unterzeichnet ist.
      gegenzeichnung: (signature && nda && nda.countersigned_at)
        ? gegenzeichnungAus(template, nda.countersigned_at)
        : null,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="NDA_${project.codename}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (e) {
    console.error('PDF generation error:', e);
    res.status(500).json({ success: false, error: 'PDF-Generierung fehlgeschlagen: ' + e.message });
  }
}));

// ─── Die Fassung, die der Unterzeichnungsdialog anzeigt (v0.466) ────────────
//
// Anlass: Ein Interessent hat nach der Online-Unterzeichnung das signierte PDF
// mit dem Dialogtext verglichen und drei Abweichungen gefunden, darunter eine
// Vertragspartei, die es nicht gibt. Der Dialog trug seinen eigenen, von Hand
// gepflegten Vertragstext; das PDF entstand aus der Vorlage. Zwei Texte, zwei
// Pflegewege, auseinandergelaufen.
//
// Ab hier gibt es eine Fassung. Diese Route liefert sie, das PDF druckt
// dieselbe, und beide tragen denselben Fingerabdruck.
router.get('/:projectId/fassung', authenticate, wrap(async (req, res) => {
  const project = await db.get('SELECT id, codename FROM projects WHERE id = ?', [req.params.projectId]);
  if (!project) return res.status(404).json({ success: false, error: 'Mandat nicht gefunden' });
  const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  const template = await loadNdaTemplate();
  // Vorschau mit noch nicht gespeicherten Angaben (v0.490): Der Dialog erhebt
  // Sitz, Register und vertretungsberechtigte Person erst kurz vor der
  // Unterschrift. Damit der Interessent genau den Text sieht, den er gleich
  // unterschreibt, darf er sie hier mitgeben. Gespeichert wird dabei nichts.
  const kaeufer = kaeuferAus(user);
  for (const feld of VERTRAGSFELDER) {
    const wert = req.query[feld];
    if (typeof wert === 'string' && wert.trim()) kaeufer[feld] = wert.trim();
  }
  const f = ndaFassung.fassung({
    vorlage: template,
    kaeufer,
    mandat: { codename: project.codename },
  });
  // Was im Vertrag noch fehlt, sagt die Antwort gleich mit. Der Dialog fragt
  // genau diese Felder ab, statt den Nutzer suchen zu lassen (v0.490).
  f.fehlende_vertragsangaben = VERTRAGSFELDER
    .filter((k) => !kaeufer[k] || String(kaeufer[k]).trim() === '')
    .map((k) => ({ feld: k, bezeichnung: VERTRAGSFELDER_NAMEN[k] }));
  f.vertragsangaben = Object.fromEntries(VERTRAGSFELDER.map((k) => [k, user[k] || '']));
  res.json({ success: true, data: f });
}));

// ─── NDA Online unterzeichnen (§10) ──────────────────────────────────────────
router.post('/:projectId/sign-online', authenticate, wrap(async (req, res) => {
  const { consent_name, consent_confirmed } = req.body;
  if (!consent_confirmed) return res.status(400).json({ success: false, error: 'Bestätigung erforderlich' });
  if (!consent_name || consent_name.trim().length < 3) return res.status(400).json({ success: false, error: 'Name muss mindestens 3 Zeichen haben' });

  const nda = await db.get('SELECT * FROM nda_requests WHERE user_id = ? AND project_id = ?', [req.user.id, req.params.projectId]);
  if (!nda) return res.status(404).json({ success: false, error: 'NDA nicht gefunden' });
  if (!['requested', 'sent'].includes(nda.status)) {
    return res.status(400).json({ success: false, error: `NDA hat bereits den Status: ${nda.status}` });
  }

  const project = await db.get('SELECT * FROM projects WHERE id = ?', [req.params.projectId]);
  let user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);

  // ── Die Angaben, die der Vertrag über die Vertragspartei nennt (v0.490) ──
  //
  // Sitz, Register mit Nummer und die vertretungsberechtigte Person stehen im
  // Kopf der Vereinbarung. Fehlen sie, entsteht ein Vertrag mit Lücken, und
  // zwar genau dort, wo er die Partei benennt. Also werden sie hier verlangt.
  // Der Dialog schickt sie mit, sie werden ins Profil übernommen und beim
  // nächsten Mandat nicht erneut abgefragt.
  const eingereicht = req.body.vertragsdaten || {};
  const zuSetzen = {};
  for (const feld of VERTRAGSFELDER) {
    const wert = String(eingereicht[feld] == null ? '' : eingereicht[feld]).trim();
    if (wert) zuSetzen[feld] = wert;
  }
  if (Object.keys(zuSetzen).length) {
    await db.run(
      `UPDATE users SET ${Object.keys(zuSetzen).map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
      [...Object.values(zuSetzen), req.user.id]);
    user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  }
  const fehlend = VERTRAGSFELDER.filter((k) => !user[k] || String(user[k]).trim() === '');
  if (fehlend.length) {
    return res.status(400).json({
      success: false,
      code: 'VERTRAGSANGABEN_FEHLEN',
      error: `Für die Vereinbarung fehlen noch ${fehlend.length === 1 ? 'eine Angabe' : `${fehlend.length} Angaben`}: `
        + `${fehlend.map((k) => VERTRAGSFELDER_NAMEN[k]).join(', ')}. Sie benennen die Vertragspartei und stehen im Vertrag.`,
      missing: fehlend,
      missing_labels: fehlend.map((k) => VERTRAGSFELDER_NAMEN[k]),
    });
  }

  // ── Es wird nur unterschrieben, was angezeigt wurde (v0.466) ─────────────
  //
  // Der Dialog schickt den Fingerabdruck der Fassung mit, die er angezeigt
  // hat. Stimmt er nicht mit der jetzt geltenden überein, wurde die Vorlage
  // zwischenzeitlich geändert, und der Interessent würde etwas anderes
  // unterschreiben als das, was er gelesen hat. Dann wird abgebrochen und
  // nicht etwa die neue Fassung still untergeschoben.
  const geltend = ndaFassung.fassung({
    vorlage: await loadNdaTemplate(),
    kaeufer: kaeuferAus(user),
    mandat: { codename: project.codename },
  });
  const gezeigt = String(req.body.fassung_hash || '');
  if (!gezeigt) {
    return res.status(400).json({
      success: false, code: 'FASSUNG_FEHLT',
      error: 'Es ist nicht nachvollziehbar, welche Fassung Ihnen angezeigt wurde. '
        + 'Bitte laden Sie die Seite neu und lesen Sie die Vereinbarung erneut.',
    });
  }
  if (gezeigt !== geltend.hash) {
    db.auditLog(req.user.id, 'NDA_FASSUNG_ABWEICHUNG', 'nda_request', nda.id,
      `angezeigt ${gezeigt.slice(0, 12)}, geltend ${geltend.hash.slice(0, 12)}`, req.ip);
    return res.status(409).json({
      success: false, code: 'FASSUNG_GEAENDERT',
      error: 'Die Vereinbarung wurde geändert, seit sie Ihnen angezeigt wurde. '
        + 'Bitte laden Sie die Seite neu und lesen Sie die neue Fassung, bevor Sie unterzeichnen.',
    });
  }

  const consentIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = new Date().toISOString();

  try {
    const template = await loadNdaTemplate();
    const buyerData = {
      id: user.id,
      first_name: [user.title, user.first_name].filter(Boolean).join(' '),
      last_name: user.last_name,
      company: user.company || '',
      position: user.position || '',
      email: user.email,
      // Anschrift aus dem Pflichtprofil (Sprint 5.1)
      address: user.street || '',
      city: [user.postal_code, user.city].filter(Boolean).join(' '),
      country: 'Deutschland',
      // v0.490: Die Vorlage nennt die Vertragspartei mit Sitz, Register
      // und vertretungsberechtigter Person.
      company_seat: user.company_seat || '',
      company_register: user.company_register || '',
      company_representative: user.company_representative || '',
    };
    const projectData = { codename: project.codename, industry: project.industry, region: project.region };

    // 1. Befülltes (unsigniertes) NDA erzeugen und über den austauschbaren
    //    SignatureProvider signieren (Standard: Stub, eIDAS FES)
    const filledPdf = await generateNDA({ buyer: buyerData, project: projectData, template });
    const provider = getSignatureProvider();
    const providerName = (process.env.SIGNATURE_PROVIDER || 'stub').toLowerCase();
    const { providerRef } = await provider.send(filledPdf, {
      name: consent_name.trim(), email: user.email, company: user.company || '', ip: consentIp,
    });
    const signatureStatus = await provider.status(providerRef);
    if (signatureStatus !== 'signed') {
      // Bei echten Providern: Vorgang bleibt offen, Abschluss via Status-Polling/Webhook
      return res.status(202).json({ success: true, data: { status: 'sent', provider_ref: providerRef } });
    }

    // 2. Signiertes PDF revisionssicher ablegen (Datei + SHA-256-Audit-Referenz)
    const gegen = gegenzeichnungAus(template, now);
    const pdfFilename = await saveNDA({
      buyer: buyerData,
      project: projectData,
      template,
      signature: { name: consent_name.trim(), company: user.company || '', date: now, ip: consentIp },
      gegenzeichnung: gegen,
    });
    const signedBuffer = fs.readFileSync(require('path').join(NDA_DIR, pdfFilename));
    const auditRef = crypto.createHash('sha256').update(signedBuffer).digest('hex');

    const interest = await db.get(`SELECT id FROM interests WHERE buyer_id = ? AND project_id = ?`, [req.user.id, req.params.projectId]);
    await db.insert(
      `INSERT INTO ndas (interest_id, nda_request_id, template_id, filled_pdf_ref, signature_provider, signature_status, provider_ref, signed_pdf_ref, signed_at, audit_ref)
       VALUES (?, ?, ?, ?, ?, 'signed', ?, ?, now(), ?)`,
      [interest ? interest.id : null, nda.id, template.id, null, providerName, providerRef, pdfFilename, auditRef]
    );

    // 3. Workflow-Status aktualisieren
    await db.run(`
      UPDATE nda_requests
      SET status='signed',
          signed_at=now(),
          online_consent_at=?,
          consent_name=?,
          consent_ip=?,
          signed_pdf_path=?,
          fassung_hash=?,
          fassung_version=?,
          fassung_text=?,
          countersigned_at=?,
          countersigned_by=?
      WHERE user_id=? AND project_id=?
    `, [now, consent_name.trim(), consentIp, pdfFilename,
        // Der Wortlaut wird mitgespeichert und nicht nur sein Fingerabdruck
        // (v0.466). Ein Fingerabdruck beweist, dass sich nichts geaendert
        // hat; er stellt den Text aber nicht wieder her, wenn die Vorlage
        // spaeter ueberschrieben wird. Und genau dann braucht man ihn.
        geltend.hash, geltend.version || null, ndaFassung.alsText(geltend),
        gegen ? now : null,
        gegen ? `${gegen.name}${gegen.role ? `, ${gegen.role}` : ''}` : null,
        req.user.id, req.params.projectId]);

    // 4. Zustandsautomat: nda_signed erreicht → IM/Exposé automatisch
    //    freischalten (im_granted, Sprint 3). Beim nachträglichen Signieren eines
    //    bereits freigegebenen Zugangs (Altfall) darf die Stage NICHT zurückfallen:
    //    nur vorwärts setzen, wenn die aktuelle Stage niedriger ist.
    {
      const { stageRank } = require('../utils/dealStateMachine');
      const cur = await getStage(req.user.id, req.params.projectId);
      if (stageRank(cur) < stageRank('nda_signed')) {
        await setStage(req.user.id, req.params.projectId, 'nda_signed', req.user.id, consentIp);
      }
      if (stageRank(cur) < stageRank('im_granted')) {
        await setStage(req.user.id, req.params.projectId, 'im_granted', req.user.id, consentIp);
      }
      // v0.489: Mit der Unterschrift geht auch der Datenraum auf.
      //
      // Bisher folgte darauf eine zweite, von Hand ausgeloeste Freigabe. Aus
      // Sicht des Interessenten war die Unterschrift damit ein Schritt, nach
      // dem sichtbar wenig passierte: „NDA unterschrieben, Freigabe
      // ausstehend". Christians Entscheidung: alles sofort, ausser dem
      // Clean Team.
      //
      // Das Heikle bleibt heikel. Als vertraulich gekennzeichnete Ordner und
      // Dateien sind damit nicht freigegeben; dafuer braucht es weiterhin die
      // Einzelfreigabe je Person. Das entscheidet safeVisibility, nicht diese
      // Stufe, und daran aendert sich nichts.
      if (stageRank(cur) < stageRank('dataroom_granted')) {
        await setStage(req.user.id, req.params.projectId, 'dataroom_granted', req.user.id, consentIp);
        await db.run("UPDATE nda_requests SET status = 'approved', approved_at = now() WHERE id = ?", [nda.id]).catch(() => {});
        db.auditLog(req.user.id, 'NDA_APPROVED', 'nda_request', nda.id,
          'Datenraum mit der Unterschrift geoeffnet (v0.489). Vertrauliches bleibt gesperrt.', consentIp);
      }
    }
    db.auditLog(req.user.id, 'NDA_SIGNED_ONLINE', 'nda_request', nda.id,
      `Online §10 (${providerName}/FES): ${consent_name.trim()} | IP: ${consentIp} | PDF: ${pdfFilename} | SHA-256: ${auditRef.slice(0, 16)}…`, consentIp);

    // Sprint 15: NDA-Unterzeichnung als Systemnachricht in die Deal-Timeline
    require('../utils/dealChat').eventForBuyer({
      project, buyerId: req.user.id,
      body: `✅ NDA für „${project.codename}" unterzeichnet: das Informationsmemorandum ist jetzt freigeschaltet.`,
      notifyAdvisorBody: `✅ ${user.first_name} ${user.last_name} hat die NDA für „${project.codename}" unterzeichnet.`,
    }).catch(() => {});
    // Sprint 17: XP für NDA-Unterzeichnung
    require('../utils/xp').award(req.user.id, 'NDA_SIGNED', { refType: 'project', refId: project.id }).catch(() => {});

    console.log(`NDA für ${project.codename} online unterzeichnet von ${user.email} (${consent_name.trim()})`);

    // ── Das unterzeichnete PDF geht an beide Seiten (v0.489) ──────────────
    //
    // Bisher bekam der Unterzeichner eine Hinweismail ohne Anhang, und die
    // Beratung bekam gar nichts. Eine Vereinbarung, die niemand in der Hand
    // haelt, ist als Nachweis wenig wert. Also: dieselbe Urkunde an den
    // Unterzeichner und an die Beratung, mit Fingerabdruck in der Mail.
    const { sendProcessUpdateEmail, sendMail } = require('../utils/email');
    let anhang = [];
    try {
      const fsp = require('fs');
      const pfad = path.join(NDA_DIR, pdfFilename);
      if (fsp.existsSync(pfad)) {
        anhang = [{
          filename: `Vertraulichkeitsvereinbarung_${project.codename}.pdf`,
          content: fsp.readFileSync(pfad).toString('base64'),
          encoding: 'base64',
          contentType: 'application/pdf',
        }];
      }
    } catch (e) { console.warn('NDA-Anhang nicht lesbar:', e.message); }

    sendProcessUpdateEmail({
      to: user.email, firstName: user.first_name, person: user,
      title: `Vertraulichkeitsvereinbarung unterzeichnet: ${project.codename}`,
      message: `Ihre Vertraulichkeitsvereinbarung für <strong>${project.codename}</strong> ist unterzeichnet`
        + `${gegen ? ` und von der Phalanx GmbH gegengezeichnet (${gegen.name}${gegen.role ? `, ${gegen.role}` : ''})` : ''}. `
        + `Die Unterlagen und der Datenraum sind ab sofort für Sie freigeschaltet; als vertraulich gekennzeichnete Bereiche geben wir Ihnen bei Bedarf einzeln frei. `
        + `Das unterzeichnete Dokument liegt dieser Mail bei.`,
      ctaLabel: 'Zum Mandat', ctaPath: `/projekte/${req.params.projectId}`,
      attachments: anhang,
    }).catch(() => {});

    // Die Beratung bekommt dieselbe Urkunde, damit sie nicht in der Plattform
    // gesucht werden muss. Adresse ueber NDA_ARCHIV_MAIL aenderbar.
    {
      // ── An die Beratung des Mandats, nicht nur ins Archiv (v0.506) ───────
      //
      // Bis hierher ging die Kopie an eine einzige, feste Adresse. Wer das
      // Mandat betreut, bekam nichts, und als eine Vereinbarung fehlte, war
      // „ich habe auch nichts in Kopie bekommen" kein Hinweis, sondern der
      // Normalfall. Jetzt bekommt sie, wer das Mandat angelegt hat oder ihm
      // zugeordnet ist, und das Archiv zusätzlich.
      const archiv = process.env.NDA_ARCHIV_MAIL || 'info@phalanx.de';
      const beratung = await db.all(
        `SELECT DISTINCT u.email FROM users u
          WHERE u.email IS NOT NULL
            AND (u.id = (SELECT created_by FROM projects WHERE id = ?)
                 OR u.id IN (SELECT user_id FROM project_members WHERE project_id = ?))`,
        [project.id, project.id]).catch(() => []);
      const empfaenger = [...new Set([archiv, ...(beratung || []).map((b) => b.email)].filter(Boolean))];
      sendMail({
        to: empfaenger.join(', '),
        subject: `Unterzeichnet: Vertraulichkeitsvereinbarung ${project.codename}, ${user.first_name} ${user.last_name}`,
        html: `<p>Eine Vertraulichkeitsvereinbarung wurde online unterzeichnet.</p>
<table cellpadding="4" style="font-size:14px">
<tr><td><strong>Mandat</strong></td><td>${project.codename}</td></tr>
<tr><td><strong>Unterzeichnet von</strong></td><td>${consent_name.trim()}</td></tr>
<tr><td><strong>Konto</strong></td><td>${user.email}${user.company ? `, ${user.company}` : ''}</td></tr>
<tr><td><strong>Zeitpunkt</strong></td><td>${new Date().toLocaleString('de-DE')}</td></tr>
<tr><td><strong>IP-Adresse</strong></td><td>${consentIp}</td></tr>
<tr><td><strong>Fingerabdruck</strong></td><td style="font-family:monospace">${auditRef}</td></tr>
${gegen ? `<tr><td><strong>Gegengezeichnet</strong></td><td>${gegen.name}${gegen.role ? `, ${gegen.role}` : ''}</td></tr>` : ''}
</table>
<p>Der Datenraum ist damit freigeschaltet. Als vertraulich gekennzeichnete Bereiche bleiben gesperrt und brauchen weiterhin eine Einzelfreigabe.</p>`,
        attachments: anhang,
        meta: { type: 'nda', projectId: project.id, userId: user.id },
      }).catch(() => {});
    }

    res.json({ success: true, data: { status: 'signed', pdf_filename: pdfFilename, audit_ref: auditRef } });
  } catch (e) {
    console.error('Sign error:', e);
    res.status(500).json({ success: false, error: 'Fehler beim Unterzeichnen: ' + e.message });
  }
}));

// ─── Buyer: NDA Unterschrift simulieren (status: sent → signed) [Legacy] ─────
router.put('/:projectId/sign', authenticate, wrap(async (req, res) => {
  const nda = await db.get('SELECT * FROM nda_requests WHERE user_id = ? AND project_id = ?', [req.user.id, req.params.projectId]);
  if (!nda) return res.status(404).json({ success: false, error: 'NDA nicht gefunden' });
  if (nda.status !== 'sent') return res.status(400).json({ success: false, error: 'NDA muss den Status "versendet" haben um unterzeichnet werden zu können' });
  await db.run(`UPDATE nda_requests SET status='signed', signed_at=now() WHERE user_id=? AND project_id=?`, [req.user.id, req.params.projectId]);
  await setStage(req.user.id, req.params.projectId, 'nda_signed', req.user.id, req.ip);
  await setStage(req.user.id, req.params.projectId, 'im_granted', req.user.id, req.ip); // IM automatisch freischalten
  db.auditLog(req.user.id, 'NDA_SIGNED', 'nda_request', nda.id, null, req.ip);
  res.json({ success: true, data: { status: 'signed' } });
}));

// ─── Admin: NDA zur Unterschrift freigeben (requested → sent) ────────────────
//
// Seit v0.480 ruft diese Route denselben Vorgang auf wie die Kontofreigabe in
// der Verwaltung. Vorher stand die Logik hier und nur hier; als die
// Kontofreigabe dasselbe tun sollte, waere sie ein zweites Mal entstanden,
// und zwei Fassungen derselben Regel laufen irgendwann auseinander.
router.put('/:projectId/send', authenticate, wrap(async (req, res) => {
  const { user_id } = req.body;
  if (!['super_admin', 'advisor'].includes(req.user.role)) return res.status(403).json({ success: false, error: 'Keine Berechtigung' });
  const targetUserId = user_id || req.user.id;
  const nda = await db.get('SELECT * FROM nda_requests WHERE user_id = ? AND project_id = ?', [targetUserId, req.params.projectId]);
  if (!nda) return res.status(404).json({ success: false, error: 'NDA nicht gefunden' });
  if (nda.status !== 'requested') return res.status(400).json({ success: false, error: 'NDA muss den Status "angefordert" haben' });

  const projekt = await db.get('SELECT codename FROM projects WHERE id = ?', [req.params.projectId]);
  const { eineFreigeben } = require('../utils/ndaFreigabe');
  const r = await eineFreigeben({
    anfrage: { id: nda.id, project_id: nda.project_id, codename: projekt ? projekt.codename : null },
    actorId: req.user.id, ip: req.ip, db, setStage,
  });
  if (!r.ok) return res.status(400).json({ success: false, error: r.grund });
  res.json({ success: true, data: { status: 'sent' } });
}));

// ─── Signed NDA PDF herunterladen ─────────────────────────────────────────────
router.get('/:projectId/download', authenticate, wrap(async (req, res) => {
  // Admins can pass ?user_id=X
  const targetUserId = (req.query.user_id && ['super_admin', 'advisor'].includes(req.user.role))
    ? parseInt(req.query.user_id)
    : req.user.id;

  const nda = await db.get('SELECT * FROM nda_requests WHERE user_id = ? AND project_id = ?', [targetUserId, req.params.projectId]);
  if (!nda || !nda.online_consent_at) {
    return res.status(404).json({ success: false, error: 'Kein unterzeichnetes NDA-Dokument verfügbar' });
  }

  // Bevorzugt die gespeicherte Datei ausliefern …
  if (nda.signed_pdf_path) {
    const filePath = path.join(NDA_DIR, nda.signed_pdf_path);
    if (fs.existsSync(filePath)) {
      return res.download(filePath, nda.signed_pdf_path);
    }
  }

  // … sonst das signierte PDF aus den gespeicherten Signaturdaten neu
  // erzeugen (robust gegen verlorene Dateien; identischer Inhalt).
  const buyer = await db.get('SELECT * FROM users WHERE id = ?', [targetUserId]);
  const project = await db.get('SELECT * FROM projects WHERE id = ?', [req.params.projectId]);
  const template = await loadNdaTemplate();
  const pdfBuffer = await generateNDA({
    buyer: {
      id: buyer.id,
      first_name: [buyer.title, buyer.first_name].filter(Boolean).join(' '),
      last_name: buyer.last_name,
      company: buyer.company || '',
      position: buyer.position || '',
      email: buyer.email,
      address: buyer.street || '',
      city: [buyer.postal_code, buyer.city].filter(Boolean).join(' '),
      country: 'Deutschland',
      // v0.490: Die Vorlage nennt die Vertragspartei mit Sitz, Register
      // und vertretungsberechtigter Person.
      company_seat: buyer.company_seat || '',
      company_register: buyer.company_register || '',
      company_representative: buyer.company_representative || '',
    },
    project: { codename: project.codename, industry: project.industry, region: project.region },
    template,
    // v0.492: Nur was wirklich gegengezeichnet wurde. Vorher stand hier ein
    // Rueckfall auf den Unterschriftszeitpunkt, und damit waere unter jedem
    // alten Nachdruck ploetzlich eine Unterschrift erschienen, die es nie gab.
    gegenzeichnung: nda.countersigned_at ? gegenzeichnungAus(template, nda.countersigned_at) : null,
    signature: {
      name: nda.consent_name || `${buyer.first_name} ${buyer.last_name}`,
      company: buyer.company || '',
      date: nda.online_consent_at,
      ip: nda.consent_ip || null,
    },
  });
  const filename = nda.signed_pdf_path || `NDA_${project.codename}_${buyer.id}.pdf`;
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"` });
  res.send(pdfBuffer);
}));

// ─── Die Urkunde noch einmal zustellen (v0.492) ─────────────────────────────
//
// Anlass, wörtlich: „Gäbe es die Möglichkeit, einen NDA nochmals zu
// verschicken, könnten wir es vielleicht testen, oder?"
//
// Der Anlass war eine Prüfung, der Nutzen ist größer: Mails gehen verloren,
// landen im Spam oder werden gelöscht. Bisher blieb in dem Fall nur, das PDF
// herunterzuladen und von Hand als Mail zu schicken, und dann fehlt der
// Vorgang im Protokoll.
//
// Zwei Festlegungen:
//
//   1. Standard ist der Versand nur an die Beratung. Wer eine Prüfung macht,
//      soll dabei nicht versehentlich einen Interessenten anschreiben. An
//      beide geht es nur, wenn es ausdrücklich verlangt wird.
//   2. Es wird nichts neu unterzeichnet und nichts geändert. Dieselbe
//      Urkunde, derselbe Fingerabdruck, nur noch einmal zugestellt. Der
//      Vorgang steht danach im Protokoll.
router.post('/:projectId/erneut-senden', authenticate, wrap(async (req, res) => {
  if (!['super_admin', 'advisor'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Nur die Verwaltung kann eine Urkunde erneut zustellen.' });
  }
  const zielPerson = parseInt(req.body.user_id, 10);
  if (!zielPerson) return res.status(400).json({ success: false, error: 'user_id fehlt' });
  const anBeide = req.body.ziel === 'beide';

  const nda = await db.get('SELECT * FROM nda_requests WHERE user_id = ? AND project_id = ?', [zielPerson, req.params.projectId]);
  if (!nda || !nda.online_consent_at) {
    return res.status(404).json({ success: false, error: 'Für diese Person liegt keine unterzeichnete Vereinbarung vor.' });
  }
  const buyer = await db.get('SELECT * FROM users WHERE id = ?', [zielPerson]);
  const project = await db.get('SELECT * FROM projects WHERE id = ?', [req.params.projectId]);
  const template = await loadNdaTemplate();

  // Bevorzugt die abgelegte Datei. Sie ist die Urkunde; ein Nachdruck ist nur
  // der Ersatz, wenn die Datei verloren ging.
  let puffer = null;
  if (nda.signed_pdf_path) {
    const pfad = path.join(NDA_DIR, nda.signed_pdf_path);
    if (fs.existsSync(pfad)) puffer = fs.readFileSync(pfad);
  }
  if (!puffer) {
    puffer = await generateNDA({
      buyer: {
        id: buyer.id,
        first_name: [buyer.title, buyer.first_name].filter(Boolean).join(' '),
        last_name: buyer.last_name,
        company: buyer.company || '',
        position: buyer.position || '',
        email: buyer.email,
        address: buyer.street || '',
        city: [buyer.postal_code, buyer.city].filter(Boolean).join(' '),
        country: 'Deutschland',
        company_seat: buyer.company_seat || '',
        company_register: buyer.company_register || '',
        company_representative: buyer.company_representative || '',
      },
      project: { codename: project.codename, industry: project.industry, region: project.region },
      template,
      gegenzeichnung: nda.countersigned_at ? gegenzeichnungAus(template, nda.countersigned_at) : null,
      signature: {
        name: nda.consent_name || `${buyer.first_name} ${buyer.last_name}`,
        company: buyer.company || '',
        date: nda.online_consent_at,
        ip: nda.consent_ip || null,
      },
    });
  }
  const abdruck = crypto.createHash('sha256').update(puffer).digest('hex');
  const anhang = [{
    filename: `Vertraulichkeitsvereinbarung_${project.codename}.pdf`,
    content: puffer.toString('base64'),
    encoding: 'base64',
    contentType: 'application/pdf',
  }];

  const { sendMail, sendProcessUpdateEmail } = require('../utils/email');
  const archiv = process.env.NDA_ARCHIV_MAIL || 'info@phalanx.de';
  const empfaenger = [archiv];

  await sendMail({
    to: archiv,
    subject: `Erneut zugestellt: Vertraulichkeitsvereinbarung ${project.codename}, ${buyer.first_name} ${buyer.last_name}`,
    html: `<p>Diese Urkunde wurde erneut zugestellt. Unterzeichnet wurde nichts Neues.</p>
<table cellpadding="4" style="font-size:14px">
<tr><td><strong>Mandat</strong></td><td>${project.codename}</td></tr>
<tr><td><strong>Unterzeichnet von</strong></td><td>${nda.consent_name || `${buyer.first_name} ${buyer.last_name}`}</td></tr>
<tr><td><strong>Konto</strong></td><td>${buyer.email}${buyer.company ? `, ${buyer.company}` : ''}</td></tr>
<tr><td><strong>Unterzeichnet am</strong></td><td>${new Date(nda.online_consent_at).toLocaleString('de-DE')}</td></tr>
${nda.countersigned_at ? `<tr><td><strong>Gegengezeichnet</strong></td><td>${nda.countersigned_by || ''}, ${new Date(nda.countersigned_at).toLocaleString('de-DE')}</td></tr>` : ''}
<tr><td><strong>Fingerabdruck</strong></td><td style="font-family:monospace">${abdruck}</td></tr>
<tr><td><strong>Erneut zugestellt</strong></td><td>${new Date().toLocaleString('de-DE')} durch ${req.user.email || req.user.id}</td></tr>
</table>`,
    attachments: anhang,
    meta: { type: 'nda', projectId: project.id, userId: buyer.id },
  }).catch((e) => { console.warn('Archivmail nicht zugestellt:', e.message); });

  if (anBeide) {
    empfaenger.push(buyer.email);
    sendProcessUpdateEmail({
      to: buyer.email, firstName: buyer.first_name, person: buyer,
      title: `Ihre Vertraulichkeitsvereinbarung: ${project.codename}`,
      message: `Hier noch einmal Ihre unterzeichnete Vertraulichkeitsvereinbarung für <strong>${project.codename}</strong> als Anhang. `
        + `An der Vereinbarung ändert sich dadurch nichts.`,
      ctaLabel: 'Zum Mandat', ctaPath: `/projekte/${project.id}`,
      attachments: anhang,
    }).catch(() => {});
  }

  db.auditLog(req.user.id, 'NDA_ERNEUT_GESENDET', 'nda_request', nda.id,
    `an ${empfaenger.join(', ')} | SHA-256: ${abdruck.slice(0, 16)}…`, req.ip);

  res.json({ success: true, data: { empfaenger, fingerabdruck: abdruck } });
}));

module.exports = router;
