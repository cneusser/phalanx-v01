// CapitalMatch – NDA-Route: PostgreSQL/Knex
const express = require('express');
const path = require('path');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const crypto = require('crypto');
const fs = require('fs');
const { generateNDA, saveNDA, NDA_DIR } = require('../utils/ndaGenerator');
const wrap = require('../utils/asyncHandler');
const { setStage } = require('../middleware/gates');
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
    sections: JSON.parse(row.sections_json || '[]'),
  };
}

const { requireCompleteProfile } = require('../utils/profileCompleteness');

// ─── NDA anfordern (setzt vollständiges Profil voraus) ──────────────────────
router.post('/', authenticate, requireCompleteProfile(), wrap(async (req, res) => {
  const { project_id } = req.body;
  if (!project_id) return res.status(400).json({ success: false, error: 'project_id fehlt' });
  const project = await db.get(`SELECT id, codename FROM projects WHERE id = ? AND status = 'active'`, [project_id]);
  if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });
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
  res.json({ success: true, data: nda || { status: null } });
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
  const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);

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
    const pdfFilename = await saveNDA({
      buyer: buyerData,
      project: projectData,
      template,
      signature: { name: consent_name.trim(), company: user.company || '', date: now, ip: consentIp },
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
          signed_pdf_path=?
      WHERE user_id=? AND project_id=?
    `, [now, consent_name.trim(), consentIp, pdfFilename, req.user.id, req.params.projectId]);

    // 4. Zustandsautomat: nda_signed erreicht → IM/Exposé automatisch
    //    freischalten (im_granted, Sprint 3)
    await setStage(req.user.id, req.params.projectId, 'nda_signed', req.user.id, consentIp);
    await setStage(req.user.id, req.params.projectId, 'im_granted', req.user.id, consentIp);
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

    // Investor informieren: Signatur bestätigt + IM freigeschaltet
    const { sendProcessUpdateEmail } = require('../utils/email');
    sendProcessUpdateEmail({
      to: user.email, firstName: user.first_name, person: user,
      title: `NDA unterzeichnet: Informationsmemorandum freigeschaltet (${project.codename})`,
      message: `Ihre Vertraulichkeitsvereinbarung für <strong>${project.codename}</strong> wurde erfolgreich unterzeichnet. Das Informationsmemorandum und die Erstunterlagen sind ab sofort für Sie freigeschaltet. Nach der Datenraum-Freigabe durch unser Team erhalten Sie Zugriff auf die vollständigen Unterlagen.`,
      ctaLabel: 'Unterlagen ansehen', ctaPath: `/projekte/${req.params.projectId}`,
    }).catch(() => {});

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

// ─── Admin: NDA als "Versendet" markieren (requested → sent) ─────────────────
router.put('/:projectId/send', authenticate, wrap(async (req, res) => {
  const { user_id } = req.body;
  if (!['super_admin', 'advisor'].includes(req.user.role)) return res.status(403).json({ success: false, error: 'Keine Berechtigung' });
  const targetUserId = user_id || req.user.id;
  const nda = await db.get('SELECT * FROM nda_requests WHERE user_id = ? AND project_id = ?', [targetUserId, req.params.projectId]);
  if (!nda) return res.status(404).json({ success: false, error: 'NDA nicht gefunden' });
  if (nda.status !== 'requested') return res.status(400).json({ success: false, error: 'NDA muss den Status "angefordert" haben' });
  await db.run(`UPDATE nda_requests SET status='sent', sent_at=now() WHERE user_id=? AND project_id=?`, [targetUserId, req.params.projectId]);
  await setStage(targetUserId, req.params.projectId, 'nda_pending', req.user.id, req.ip);
  db.auditLog(req.user.id, 'NDA_SENT', 'nda_request', nda.id, null, req.ip);
  // Investor informieren: NDA liegt zur Unterzeichnung bereit
  {
    const buyer = await db.get('SELECT email, first_name, last_name FROM users WHERE id = ?', [targetUserId]);
    const proj = await db.get('SELECT codename FROM projects WHERE id = ?', [req.params.projectId]);
    if (buyer) {
      const { sendProcessUpdateEmail } = require('../utils/email');
      sendProcessUpdateEmail({
        to: buyer.email, firstName: buyer.first_name, person: buyer,
        title: `NDA bereit zur Unterzeichnung: ${proj ? proj.codename : 'Mandat'}`,
        message: `Ihre Vertraulichkeitsvereinbarung für das Mandat <strong>${proj ? proj.codename : ''}</strong> liegt bereit und kann jetzt online unterzeichnet werden.`,
        ctaLabel: 'NDA jetzt unterzeichnen', ctaPath: `/projekte/${req.params.projectId}`,
      }).catch(() => {});
    }
  }
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
    },
    project: { codename: project.codename, industry: project.industry, region: project.region },
    template,
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

module.exports = router;
