// ─────────────────────────────────────────────────────────────────────────────
// v0.306: Unterlagen-Link ohne Registrierung.
//
// Öffentlich erreichbar, aber nur mit einem langen, persönlichen Token. Der
// Empfänger bestätigt vor dem Öffnen mit seinem Namen die Vertraulichkeit. Das
// ersetzt keine unterschriebene NDA, ist aber ein belastbarer Nachweis darüber,
// wer wann worauf zugegriffen hat.
//
// Schutzschichten: Ablaufdatum · optionale Höchstzahl an Abrufen · jederzeitiger
// Widerruf · Wasserzeichen mit dem Namen des Empfängers · Zugriffsprotokoll.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const fs = require('fs');
const db = require('../db/database');
const wrap = require('../utils/asyncHandler');
const { addWatermark } = require('../utils/watermark');

const router = express.Router();

// Link laden und alle Sperren prüfen. Gibt entweder { ok: true, link } zurück
// oder einen sprechenden Grund, warum der Zugriff nicht (mehr) möglich ist.
async function loadLink(token) {
  if (!token || String(token).length < 20) return { ok: false, reason: 'invalid' };
  const link = await db.get(
    `SELECT s.*, p.codename, p.mandate_type
       FROM share_links s JOIN projects p ON p.id = s.project_id
      WHERE s.token = ?`, [String(token)]).catch(() => null);
  if (!link) return { ok: false, reason: 'invalid' };
  if (link.revoked_at) return { ok: false, reason: 'revoked', link };
  if (new Date(link.expires_at).getTime() < Date.now()) return { ok: false, reason: 'expired', link };
  if (link.max_views != null && link.views >= link.max_views) return { ok: false, reason: 'exhausted', link };
  return { ok: true, link };
}

const REASON_TEXT = {
  invalid: 'Dieser Link ist nicht gültig.',
  revoked: 'Dieser Link wurde zurückgezogen.',
  expired: 'Dieser Link ist abgelaufen.',
  exhausted: 'Dieser Link wurde bereits so oft geöffnet, wie vorgesehen war.',
};

// ── Was steckt hinter dem Link? (ohne die Datei preiszugeben) ──────────────
router.get('/:token', wrap(async (req, res) => {
  const { ok, reason, link } = await loadLink(req.params.token);
  if (!ok) {
    return res.status(410).json({
      success: false,
      error: REASON_TEXT[reason] || REASON_TEXT.invalid,
      data: { reason, codename: link?.codename || null },
    });
  }
  let filename = null;
  if (link.scope === 'document' && link.document_id) {
    const doc = await db.get('SELECT filename FROM documents WHERE id = ?', [link.document_id]).catch(() => null);
    filename = doc?.filename || null;
  }
  res.json({
    success: true,
    data: {
      codename: link.codename,
      label: link.label || 'Vertrauliche Unterlage',
      filename,
      expires_at: link.expires_at,
      needs_ack: !link.acked_at,
      acked_name: link.acked_name || null,
    },
  });
}));

// ── Vertraulichkeit bestätigen (Nachweis mit Name, Zeit und IP) ────────────
router.post('/:token/ack', wrap(async (req, res) => {
  const { ok, reason, link } = await loadLink(req.params.token);
  if (!ok) return res.status(410).json({ success: false, error: REASON_TEXT[reason] || REASON_TEXT.invalid });

  const name = String(req.body.name || '').trim();
  if (name.length < 3) return res.status(400).json({ success: false, error: 'Bitte geben Sie Ihren vollständigen Namen an.' });
  if (req.body.accepted !== true) return res.status(400).json({ success: false, error: 'Bitte bestätigen Sie die Vertraulichkeit.' });

  await db.run(
    `UPDATE share_links SET acked_at = COALESCE(acked_at, now()), acked_name = COALESCE(acked_name, ?), acked_ip = COALESCE(acked_ip, ?)
      WHERE id = ?`, [name, req.ip, link.id]);
  db.activityLog(null, 'SHARE_LINK_ACK', 'share_link', link.id, req.ip);
  res.json({ success: true, data: { acked: true } });
}));

// ── Datei ausliefern (mit Wasserzeichen auf den Empfänger) ─────────────────
router.get('/:token/file', wrap(async (req, res) => {
  const { ok, reason, link } = await loadLink(req.params.token);
  if (!ok) return res.status(410).json({ success: false, error: REASON_TEXT[reason] || REASON_TEXT.invalid });
  if (!link.acked_at) {
    return res.status(403).json({ success: false, error: 'Bitte bestätigen Sie zuerst die Vertraulichkeit.' });
  }

  let buffer = null; let filename = 'Unterlage.pdf'; let mime = 'application/pdf';

  if (link.scope === 'document' && link.document_id) {
    const doc = await db.get('SELECT * FROM documents WHERE id = ?', [link.document_id]).catch(() => null);
    if (!doc || !doc.file_path || !fs.existsSync(doc.file_path)) {
      return res.status(404).json({ success: false, error: 'Die Unterlage ist nicht mehr hinterlegt.' });
    }
    buffer = fs.readFileSync(doc.file_path);
    filename = doc.filename || filename;
    mime = doc.file_type || mime;
  } else if (link.scope === 'expose') {
    const expose = await db.get('SELECT pdf_item_id FROM exposes WHERE project_id = ?', [link.project_id]).catch(() => null);
    if (!expose || !expose.pdf_item_id) {
      return res.status(404).json({ success: false, error: 'Für dieses Mandat ist kein Exposé-PDF hinterlegt.' });
    }
    const item = await db.get(
      'SELECT * FROM safe_items WHERE id = ? AND is_folder = 0 AND deleted_at IS NULL', [expose.pdf_item_id]).catch(() => null);
    if (!item || !item.storage_key) {
      return res.status(404).json({ success: false, error: 'Das Exposé-PDF ist nicht mehr hinterlegt.' });
    }
    buffer = await require('../providers/storage').getStorage().get(item.storage_key);
    filename = item.name || `Expose_${link.codename}.pdf`;
  } else {
    return res.status(400).json({ success: false, error: 'Dieser Link verweist auf keine Unterlage.' });
  }

  // Wasserzeichen auf den bestätigten Empfänger, damit Weitergabe zurückverfolgbar ist
  const isPdf = String(filename).toLowerCase().endsWith('.pdf') || String(mime).includes('pdf');
  if (isPdf) {
    try {
      buffer = await addWatermark(buffer, { name: link.acked_name || 'Empfänger', email: link.recipient_email || '' });
    } catch (e) {
      console.warn('[share] Wasserzeichen fehlgeschlagen, liefere Original:', e.message);
    }
  }

  await db.run('UPDATE share_links SET views = views + 1, last_viewed_at = now() WHERE id = ?', [link.id]);
  db.activityLog(null, 'SHARE_LINK_DOWNLOAD', 'share_link', link.id, req.ip);

  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(buffer);
}));

module.exports = router;
