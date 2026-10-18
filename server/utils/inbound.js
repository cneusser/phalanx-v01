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
// Die Datenbank wird erst beim ersten Zugriff geholt (v0.462). Dieses Modul
// enthält reine Funktionen, die ohne Datenbank prüfbar sein sollen: das
// Erkennen eigener Adressen, das Zerlegen von Antwortbezügen, das Kürzen von
// Zitaten. Beim Laden eine Verbindung zu verlangen hiesse, dass sich genau
// diese Teile nur noch mit laufender Datenbank prüfen lassen, und dann werden
// sie irgendwann gar nicht mehr geprüft.
let _db = null;
const db = new Proxy({}, { get: (_, feld) => {
  if (!_db) _db = require('../db/database');
  return _db[feld];
} });

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
async function ingestReply({ from, to, subject, body, messageId, inReplyTo = null, references = null,
  sentAt, source = 'webhook', contactId = null, projectId = null, actorId = null }) {
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

  // Das Mandat ergibt sich seit v0.462 zuerst aus dem Antwortbezug, erst
  // danach aus dem Betreff. Betreffzeilen werden gekürzt, übersetzt und mit
  // „Aw:" versehen; nach dem dritten Hin und Her stimmen sie nicht mehr.
  const project = projectId
    ? await db.get('SELECT id, codename FROM projects WHERE id = ?', [projectId]).catch(() => null)
    : (await mandatFinden({ contact, subject, inReplyTo, references })).projekt;
  const bezug = bezugsIds(inReplyTo, references);

  const msgId = await db.insert(`
    INSERT INTO crm_messages (tenant_id, contact_id, project_id, direction, from_email, to_email, subject, body, message_id, in_reply_to, thread_key, source, created_by, sent_at)
    VALUES (?, ?, ?, 'in', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT DO NOTHING`,
    [contact.tenant_id || 1, contact.id, project?.id || null,
     // Als Absender steht der Kunde, nicht der Weiterleitende. Sonst sähe die
     // Historie aus, als hätte das eigene Haus geschrieben.
     weitergeleitetVon ? (contact.email || fromAddr) : (fromAddr || String(from || '').slice(0, 200)),
     parseAddress(to) || null, String(subject || '').slice(0, 300),
     (weitergeleitetVon ? `[weitergeleitet über ${weitergeleitetVon}]\n` : '') + cleanBody(body),
     messageId || null, inReplyTo || null, bezug[0] || messageId || null,
     source, actorId, sentAt ? new Date(sentAt) : new Date()]);

  // Dieselbe Mail ein zweites Mal: Der eindeutige Index hat sie abgewiesen.
  // Dann ist nichts zu tun, und vor allem keine zweite Wiedervorlage.
  if (!msgId) {
    return { matched: true, doppelt: true, contact: { id: contact.id }, project: project || null };
  }

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

// ─────────────────────────────────────────────────────────────────────────────
// Die ausgehende Seite (v0.462)
//
// Bis hierher kannte die Historie nur eingehende Mails. Das ergibt eine halbe
// Akte: Man sieht, was der Interessent wollte, und nicht, was ihm zugesagt
// wurde. Bei mehreren Beratern an einem Mandat ist das der Punkt, an dem zwei
// Leute dasselbe zweimal beantworten, und zwar verschieden.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gehört diese Adresse dem eigenen Haus?
 *
 * Die Liste steht in der Umgebungskonfiguration (EIGENE_DOMAINS), nicht im
 * Quelltext. Wer eine Domain ergänzt, soll nicht veröffentlichen müssen.
 * Ohne gesetzte Variable gilt keine Adresse als eigene, und dann bleibt alles
 * eingehend wie bisher: Eine fehlende Einstellung darf die Richtung nicht
 * raten.
 */
function eigeneDomains() {
  return String(process.env.EIGENE_DOMAINS || '')
    .split(',').map((d) => d.trim().toLowerCase().replace(/^@/, '')).filter(Boolean);
}
function istEigeneAdresse(adresse) {
  const a = parseAddress(adresse);
  if (!a) return false;
  const domain = a.split('@')[1];
  return eigeneDomains().some((d) => domain === d || domain.endsWith(`.${d}`));
}

/** Message-Ids aus einem References-Kopf, in der Reihenfolge des Kopfes. */
function bezugsIds(inReplyTo, references) {
  const roh = `${inReplyTo || ''} ${references || ''}`;
  return [...new Set((roh.match(/<[^>\s]+>/g) || []).map((s) => s.trim()))];
}

/**
 * Das Mandat zu einer Mail bestimmen.
 *
 * Reihenfolge, und sie ist der Kern dieser Datei:
 *   1. Antwortbezug. Die einzige belastbare Angabe.
 *   2. Codename im Betreff.
 *   3. Genau ein laufendes Mandat dieses Kontakts.
 *   4. Keines.
 *
 * Punkt 4 ist kein Versagen, sondern eine Entscheidung. Eine geratene
 * Zuordnung wandert in die Mandatsakte und wird dort geglaubt; eine fehlende
 * fällt auf und wird nachgetragen.
 */
async function mandatFinden({ contact, subject, inReplyTo, references }) {
  const ids = bezugsIds(inReplyTo, references);
  if (ids.length) {
    const treffer = await db.get(
      `SELECT project_id FROM crm_messages
        WHERE project_id IS NOT NULL AND (message_id = ANY(?) OR thread_key = ANY(?))
        ORDER BY id DESC LIMIT 1`, [ids, ids]).catch(() => null);
    if (treffer && treffer.project_id) {
      const p = await db.get('SELECT id, codename FROM projects WHERE id = ?', [treffer.project_id]).catch(() => null);
      if (p) return { projekt: p, weg: 'Antwortbezug' };
    }
  }
  const ausBetreff = await matchProject(subject);
  if (ausBetreff) return { projekt: ausBetreff, weg: 'Codename im Betreff' };

  const laufende = await db.all(
    `SELECT p.id, p.codename FROM crm_deal_parties dp JOIN projects p ON p.id = dp.project_id
      WHERE dp.contact_id = ? AND dp.party_status <> 'dropped' AND p.status = 'active'`,
    [contact.id]).catch(() => []);
  if (laufende.length === 1) return { projekt: laufende[0], weg: 'einziges laufendes Mandat' };
  return { projekt: null, weg: laufende.length > 1 ? 'mehrere laufende Mandate, deshalb keines' : 'kein Bezug erkennbar' };
}

/**
 * Eine Mail aufnehmen, in beide Richtungen.
 *
 * Ausgehend: Der Kontakt ergibt sich aus dem Empfänger, nicht aus dem
 * Absender. Bei mehreren Empfängern entsteht je bekanntem Kontakt ein
 * eigener Eintrag. Eine Mail an drei Interessenten gehört in drei Akten; eine
 * Sammelakte liesse sich später nicht mehr trennen.
 *
 * Eingehend: unverändert über ingestReply, samt Funnel, Reminder und
 * Wiedervorlage. Das soll bei einer ausgehenden Mail gerade nicht passieren,
 * denn geantwortet hat dabei niemand.
 */
async function ingestMail(mail) {
  const { from, to, subject, body, messageId, inReplyTo, references, sentAt, source = 'webhook', actorId = null } = mail;
  const empfaenger = (Array.isArray(to) ? to : String(to || '').split(/[;,]/))
    .map(parseAddress).filter(Boolean);

  if (!istEigeneAdresse(from)) {
    const r = await ingestReply({ ...mail, to: empfaenger[0] || null });
    return { richtung: 'in', ergebnisse: [r] };
  }

  // Ab hier: ausgehend.
  if (!empfaenger.length) {
    db.auditLog(null, 'OUTBOUND_UNMATCHED', 'crm_contact', null,
      `ohne Empfänger · ${String(subject || '').slice(0, 120)}`, null);
    return { richtung: 'out', ergebnisse: [{ matched: false, reason: 'Kein Empfänger erkennbar' }] };
  }

  const ergebnisse = [];
  for (const adresse of empfaenger) {
    if (istEigeneAdresse(adresse)) continue;            // interne Kopien gehören in keine Akte
    const contact = await matchContact(adresse);
    if (!contact) {
      db.auditLog(null, 'OUTBOUND_UNMATCHED', 'crm_contact', null,
        `${adresse} · ${String(subject || '').slice(0, 120)}`, null);
      ergebnisse.push({ matched: false, adresse, reason: 'Kein Kontakt zu dieser Empfängeradresse' });
      continue;
    }
    const { projekt, weg } = await mandatFinden({ contact, subject, inReplyTo, references });
    const ids = bezugsIds(inReplyTo, references);
    const eintrag = await db.insert(`
      INSERT INTO crm_messages (tenant_id, contact_id, project_id, direction, from_email, to_email,
                                subject, body, message_id, in_reply_to, thread_key, source, created_by, sent_at)
      VALUES (?, ?, ?, 'out', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO NOTHING`,
      [contact.tenant_id || 1, contact.id, projekt ? projekt.id : null,
       parseAddress(from), adresse, String(subject || '').slice(0, 300), cleanBody(body),
       messageId || null, inReplyTo || null, ids[0] || messageId || null,
       source, actorId, sentAt ? new Date(sentAt) : new Date()]).catch(() => null);

    if (!eintrag) {
      ergebnisse.push({ matched: true, doppelt: true, adresse, contact_id: contact.id });
      continue;
    }
    // Letzter Kontakt nachziehen. Bewusst NICHT replied und nicht die
    // Funnel-Stufe: Dass wir geschrieben haben, ist keine Rückmeldung.
    await db.run(
      `UPDATE crm_deal_parties SET last_contact = CURRENT_DATE
        WHERE contact_id = ?${projekt ? ' AND project_id = ?' : ''}`,
      projekt ? [contact.id, projekt.id] : [contact.id]).catch(() => {});

    db.auditLog(actorId, 'OUTBOUND_MESSAGE', 'crm_contact', contact.id,
      `${source} · ${projekt ? projekt.codename : 'ohne Mandat'} (${weg}) · ${String(subject || '').slice(0, 100)}`, null);
    ergebnisse.push({ matched: true, adresse, message_id: eintrag, contact_id: contact.id,
      project: projekt || null, zuordnung: weg });
  }
  return { richtung: 'out', ergebnisse };
}

module.exports = {
  parseAddress, cleanBody, matchProject, matchContact, ingestReply, urspruenglicherAbsender, REPLY_DUE_DAYS,
  istEigeneAdresse, eigeneDomains, bezugsIds, mandatFinden, ingestMail,
};
