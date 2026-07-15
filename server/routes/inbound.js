// ─────────────────────────────────────────────────────────────────────────────
// Inbound-Webhook für eingehende E-Mails (BCC-Ingest).
//
// Einrichtung: Beim Mailprovider (Brevo Inbound Parsing, Mailgun Routes, Postmark
// Inbound) eine Adresse wie inbox@capitalmatch.de auf diesen Endpoint routen:
//
//     POST https://www.capitalmatch.de/api/inbound/email?secret=<INBOUND_SECRET>
//
// Sie setzen diese Adresse ins BCC Ihrer Mails an Kontakte, Antworten (Reply-All)
// landen dann automatisch in der Kontakt-Historie.
//
// Ohne gesetztes INBOUND_SECRET ist der Endpoint deaktiviert (fail closed).
// Die gängigen Provider-Formate werden erkannt; unbekannte Absender werden NICHT
// angelegt, sondern nur protokolliert.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const wrap = require('../utils/asyncHandler');
const { ingestReply } = require('../utils/inbound');
const db = require('../db/database');
const { parseLead } = require('../utils/leadParser');
const { ingestLead } = require('../utils/leadIngest');
const router = express.Router();

// HTML grob zu Text machen (Fallback, wenn nur RawHtmlBody vorliegt)
const htmlToText = (html) => String(html || '')
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li|h\d)>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

// Provider-Formate auf ein gemeinsames Objekt bringen
function normalize(b) {
  const first = (v) => Array.isArray(v) ? v[0] : v;
  const addr = (v) => {
    const x = first(v);
    if (!x) return null;
    if (typeof x === 'string') return x;
    return x.Email || x.email || x.address || x.Address || null;
  };
  return {
    from: addr(b.From) || addr(b.from) || addr(b.sender) || b['from'] || null,
    to: addr(b.To) || addr(b.to) || addr(b.recipient) || b['recipients'] || null,
    subject: b.Subject || b.subject || '',
    body: b.TextBody || b.text || b['body-plain'] || b['stripped-text'] || b.RawTextBody || b.html || b.HtmlBody || '',
    messageId: b.MessageID || b['message-id'] || b.messageId || b.uuid || null,
    sentAt: b.Date || b.date || b.SentAtDate || null,
  };
}

router.post('/email', wrap(async (req, res) => {
  const secret = process.env.INBOUND_SECRET;
  if (!secret) return res.status(503).json({ success: false, error: 'Inbound ist nicht konfiguriert.' });

  const given = req.query.secret || req.get('x-inbound-secret');
  if (given !== secret) return res.status(401).json({ success: false, error: 'Nicht autorisiert' });

  const mail = normalize(req.body || {});
  if (!mail.from) return res.status(400).json({ success: false, error: 'Absender fehlt' });

  const r = await ingestReply({ ...mail, source: 'webhook' });
  // Dem Provider immer 200 geben, damit er nicht endlos wiederholt
  res.json({ success: true, data: r });
}));

// ── Marktplatz-Anfrage per weitergeleiteter E-Mail (Brevo Inbound Parsing) ────
// Brevo POSTet ein { items: [ { From, Subject, RawTextBody, ExtractedMarkdownMessage,
// RawHtmlBody } ] }. Jede Mail wird geparst und als Lead in den Funnel gelegt.
// Einrichtung siehe README/Changelog. Absicherung über denselben INBOUND_SECRET.
router.post('/lead', wrap(async (req, res) => {
  const secret = process.env.INBOUND_SECRET;
  if (!secret) return res.status(503).json({ success: false, error: 'Inbound ist nicht konfiguriert.' });
  const given = req.query.secret || req.get('x-inbound-secret');
  if (given !== secret) return res.status(401).json({ success: false, error: 'Nicht autorisiert' });

  const body = req.body || {};
  const items = Array.isArray(body.items) ? body.items : [body];
  const results = [];

  for (const it of items) {
    // Vollständigen Rohtext bevorzugen (enthält die Kontaktfelder). Der von Brevo
    // „extrahierte" Text lässt die Signatur weg und kann Felder verlieren.
    const text = it.RawTextBody || it.rawTextBody || it.TextBody || it.text
      || htmlToText(it.RawHtmlBody || it.html) || it.ExtractedMarkdownMessage || '';
    const subject = it.Subject || it.subject || '';
    const combined = subject ? `Betreff: ${subject}\n${text}` : text;
    if (combined.trim().length < 20) { results.push({ skipped: 'zu wenig Inhalt' }); continue; }

    try {
      const lead = parseLead(combined);
      const r = await ingestLead(db, { tenant: 1, lead, actorId: null, auditLog: db.auditLog });
      // Automatische Erstansprache, wenn per INBOUND_AUTO_OUTREACH=1 gewünscht und
      // ein Mandat zugeordnet werden konnte.
      let approach = null;
      if (process.env.INBOUND_AUTO_OUTREACH === '1' && r.project_id) {
        approach = await require('../utils/outreach').sendFirstApproach(db, {
          tenant: 1, contactId: r.contact_id, projectId: r.project_id, actorId: null,
        }).catch(() => null);
      }
      results.push({ contact_id: r.contact_id, created: r.created, project_id: r.project_id, source: lead.sourceLabel, approached: !!(approach && approach.sent) });
    } catch (e) {
      results.push({ error: e.message });
    }
  }

  // Immer 200, sonst wiederholt Brevo endlos
  res.json({ success: true, data: { processed: results.length, results } });
}));

module.exports = router;
