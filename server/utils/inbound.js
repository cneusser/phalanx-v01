// ─────────────────────────────────────────────────────────────────────────────
// Sprint 23: BCC-Ingest: eingehende E-Mails dem Kontakt zuordnen.
//
// Zwei Wege führen hier herein:
//   1) Provider-Webhook (Brevo Inbound, Mailgun, Postmark …) auf /api/inbound/email
//      · Sie setzen die Plattform-Adresse ins BCC, die Antwort landet automatisch
//        beim richtigen Kontakt.
//   2) Manuelle Erfassung aus der Kontaktansicht (funktioniert ohne jede Provider-
//      Konfiguration: Text einfügen, fertig).
//
// Was eine eingehende Antwort auslöst:
//   · Nachricht in der Kontakt-Historie
//   · Beteiligter gilt als „hat geantwortet" (replied = 1), Funnel mindestens
//     Stufe 2 („Rückmeldung")
//   · laufende Reminder zu diesem Kontakt werden gestoppt, niemand bekommt eine
//     Erinnerung, nachdem er geantwortet hat
//   · Wiedervorlage „Antwort beantworten" in zwei Werktagen
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db/database');

const REPLY_DUE_DAYS = 2;

// „Max Meier <max@firma.de>" → max@firma.de
function parseAddress(raw) {
  if (!raw) return null;
  const s = String(raw);
  const m = s.match(/<([^>]+)>/);
  const addr = (m ? m[1] : s).trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr) ? addr : null;
}

// Zitierte Passagen und Signaturen kürzen, in der Historie zählt die Antwort,
// nicht die gesamte Mailhistorie.
function cleanBody(text) {
  const s = String(text || '').replace(/\r\n/g, '\n');
  const cut = s.split(/\n(?:>|Am .+ schrieb|On .+ wrote|-{2,}\s*Ursprüngliche Nachricht|Von:\s)/)[0];
  return cut.trim().slice(0, 4000);
}

// Mandat aus dem Betreff erraten: unsere Vorlagen tragen den Codenamen im Betreff
async function matchProject(subject) {
  const s = String(subject || '');
  if (!s) return null;
  const projects = await db.all('SELECT id, codename FROM projects').catch(() => []);
  const hit = projects.find(p => p.codename && new RegExp(`\\b${p.codename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(s));
  return hit || null;
}

async function matchContact(email) {
  if (!email) return null;
  return db.get('SELECT * FROM crm_contacts WHERE lower(email) = ?', [email]).catch(() => null);
}

// ── Weitergeleitete Mails (v0.451) ──────────────────────────────────────────
//
// Anlass: Eine Kundenmail geht an info@phalanx.de und wird von dort an die
// Plattform weitergeleitet. Dann ist der Absender die eigene Adresse, und die
// Zuordnung über den Absender findet den Kunden nicht. Die Mail landet als
// „unbekannter Absender" im Protokoll und beim Kontakt gar nicht.
//
// Deshalb wird im Text nach dem Kopf der weitergeleiteten Nachricht gesucht.
// Outlook, Apple Mail, Gmail und Thunderbird schreiben ihn in bekannten
// Formen, deutsch wie englisch.
//
// Wichtig ist die Reihenfolge in ingestReply: Der echte Absender hat immer
// Vorrang. Erst wenn zu ihm kein Kontakt existiert, wird im Text gesucht. So
// kann eine zitierte Mail im Text niemals eine direkte Antwort überschreiben,
// und das ist die Zuordnung, die falsch zu machen am teuersten wäre.
const WEITERLEITUNG = [
  /^\s*(?:>\s*)?(?:Von|From)\s*:\s*(.+)$/im,
  /^\s*(?:>\s*)?(?:Gesendet von|Urspr(?:ü|ue)ngliche Nachricht)[\s\S]{0,200}?(?:Von|From)\s*:\s*(.+)$/im,
];

/** Die Adresse des ursprünglichen Absenders aus einer Weiterleitung. */
function urspruenglicherAbsender(text) {
  const inhalt = String(text || '');
  // Nur suchen, wenn der Text überhaupt nach einer Weiterleitung aussieht.
  if (!/(weitergeleitete?\s+nachricht|forwarded message|---+\s*(original|urspr))/i.test(inhalt)
      && !/^\s*(?:>\s*)?(?:Von|From)\s*:/im.test(inhalt)) return null;
  for (const muster of WEITERLEITUNG) {
    const m = inhalt.match(muster);
    const adr = m && parseAddress(m[1]);
    if (adr) return adr;
  }
  return null;
}

// Kernlogik: von Webhook UND manueller Erfassung genutzt
async function ingestReply({ from, to, subject, body, messageId, sentAt, source = 'webhook', contactId = null, projectId = null, actorId = null }) {
  const fromAddr = parseAddress(from);
  let contact = contactId
    ? await db.get('SELECT * FROM crm_contacts WHERE id = ?', [contactId]).catch(() => null)
    : await matchContact(fromAddr);

  // Zweiter Versuch über den ursprünglichen Absender einer Weiterleitung.
  // Bewusst erst hier: Ein direkter Treffer gewinnt immer.
  let weitergeleitetVon = null;
  if (!contact && !contactId) {
    const original = urspruenglicherAbsender(body);
    if (original && original !== fromAddr) {
      contact = await matchContact(original);
      if (contact) weitergeleitetVon = fromAddr || String(from || '').slice(0, 200);
    }
  }

  if (!contact) {
    // Unbekannter Absender: nicht raten, nicht anlegen, nur protokollieren.
    db.auditLog(null, 'INBOUND_UNMATCHED', 'crm_contact', null, `${fromAddr || from} · ${String(subject || '').slice(0, 120)}`, null);
    return { matched: false, reason: 'Kein Kontakt zu dieser Absenderadresse' };
  }

  const project = projectId
    ? await db.get('SELECT id, codename FROM projects WHERE id = ?', [projectId]).catch(() => null)
    : await matchProject(subject);

  const msgId = await db.insert(`
    INSERT INTO crm_messages (tenant_id, contact_id, project_id, direction, from_email, to_email, subject, body, message_id, source, created_by, sent_at)
    VALUES (?, ?, ?, 'in', ?, ?, ?, ?, ?, ?, ?, ?)`,
    [contact.tenant_id || 1, contact.id, project?.id || null,
     // Als Absender steht der Kunde, nicht der Weiterleitende. Sonst sähe die
     // Historie aus, als hätte das eigene Haus geschrieben.
     weitergeleitetVon ? (contact.email || fromAddr) : (fromAddr || String(from || '').slice(0, 200)),
     parseAddress(to) || null, String(subject || '').slice(0, 300),
     (weitergeleitetVon ? `[weitergeleitet über ${weitergeleitetVon}]\n` : '') + cleanBody(body),
     messageId || null, source, actorId, sentAt ? new Date(sentAt) : new Date()]);

  // Der Kontakt hat geantwortet → Funnel und Reminder nachziehen
  if (project?.id) {
    await db.run(`
      UPDATE crm_deal_parties
         SET replied = 1,
             last_contact = CURRENT_DATE,
             funnel_stage = GREATEST(funnel_stage, 2),
             stage_changed_at = CASE WHEN funnel_stage < 2 THEN now() ELSE stage_changed_at END
       WHERE project_id = ? AND contact_id = ?`, [project.id, contact.id]).catch(() => {});
  } else {
    await db.run(`UPDATE crm_deal_parties SET replied = 1, last_contact = CURRENT_DATE WHERE contact_id = ?`,
      [contact.id]).catch(() => {});
  }

  // Keine Erinnerung mehr an jemanden, der geantwortet hat
  await db.run(`
    UPDATE crm_campaign_recipients
       SET status = 'responded', responded_at = now(), skip_reason = 'Antwort eingegangen'
     WHERE contact_id = ? AND status IN ('sent', 'reminded')`, [contact.id]).catch(() => {});

  // Wiedervorlage: Antwort beantworten
  const due = new Date(Date.now() + REPLY_DUE_DAYS * 24 * 3600 * 1000);
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email;
  const taskId = await db.insert(`
    INSERT INTO crm_tasks (tenant_id, title, notes, due_on, contact_id, project_id, source, created_by)
    VALUES (?, ?, ?, ?, ?, ?, 'reply', ?)`,
    [contact.tenant_id || 1,
     `Antwort von ${name} beantworten`,
     String(subject || '').slice(0, 200),
     due.toISOString().slice(0, 10),
     contact.id, project?.id || null, actorId]).catch(() => null);

  db.auditLog(actorId, 'INBOUND_MESSAGE', 'crm_contact', contact.id,
    `${source} · ${project?.codename || 'ohne Mandat'} · ${String(subject || '').slice(0, 100)}`, null);

  return {
    matched: true, message_id: msgId, task_id: taskId,
    contact: { id: contact.id, name }, project: project ? { id: project.id, codename: project.codename } : null,
  };
}

module.exports = { parseAddress, cleanBody, matchProject, matchContact, ingestReply, urspruenglicherAbsender, REPLY_DUE_DAYS };
