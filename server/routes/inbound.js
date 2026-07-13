// ─────────────────────────────────────────────────────────────────────────────
// Inbound-Webhook für eingehende E-Mails (BCC-Ingest).
//
// Einrichtung: Beim Mailprovider (Brevo Inbound Parsing, Mailgun Routes, Postmark
// Inbound) eine Adresse wie inbox@capitalmatch.de auf diesen Endpoint routen:
//
//     POST https://www.capitalmatch.de/api/inbound/email?secret=<INBOUND_SECRET>
//
// Sie setzen diese Adresse ins BCC Ihrer Mails an Kontakte — Antworten (Reply-All)
// landen dann automatisch in der Kontakt-Historie.
//
// Ohne gesetztes INBOUND_SECRET ist der Endpoint deaktiviert (fail closed).
// Die gängigen Provider-Formate werden erkannt; unbekannte Absender werden NICHT
// angelegt, sondern nur protokolliert.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const wrap = require('../utils/asyncHandler');
const { ingestReply } = require('../utils/inbound');
const router = express.Router();

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

module.exports = router;
