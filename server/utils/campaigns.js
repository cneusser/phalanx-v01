// ─────────────────────────────────────────────────────────────────────────────
// Sprint 21: CRM III: Mandats-Kampagnen, Reminder-Automatik, Projekt-Updates.
//
// Drei Bausteine:
//   1) buildInviteMail  : professionelle Erstansprache zu einem Mandat: anonymes
//                          Kurzprofil, Einwilligung (Double-Opt-in) und Pflege-Link
//                          in EINER Mail.
//   2) runReminders     : Nachfass nach 7 und 21 Tagen, solange keine Reaktion
//                          vorliegt. Danach endgültig Schluss (kein Dauerfeuer).
//   3) notifyProjectChange: Änderungen am Mandat an die aktiven Beteiligten,
//                          die eingewilligt haben und noch im Prozess sind.
//
// DSGVO-Leitplanken (gelten überall in dieser Datei):
//   · nie an consent_status = 'opt_out' oder contact_status = 'do_not_contact'
//   · Reminder enden nach der zweiten Erinnerung ODER bei jeder Reaktion
//   · Projekt-Updates nur an eingewilligte, aktive Beteiligte, max. 1×/24 h
//   · jede Mail nennt Herkunft der Daten und den Weg zum Widerspruch
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db/database');

const REMINDER_DAYS = [7, 21];          // Tage nach Erstversand
const MAX_REMINDERS = REMINDER_DAYS.length;
const UPDATE_COOLDOWN_H = 24;           // frühestens wieder nach 24 h ein Update-Mailing
const DAY = 24 * 3600 * 1000;

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// „Sehr geehrter Herr Dr. Meier,": mit sauberem Rückfall auf „Guten Tag,"
function salutationFor(k) {
  const last = (k.last_name || '').trim();
  const t = (k.title || '').trim();
  if (!last) return 'Guten Tag,';
  if (k.salutation === 'Herr') return `Sehr geehrter Herr ${esc([t, last].filter(Boolean).join(' '))},`;
  if (k.salutation === 'Frau') return `Sehr geehrte Frau ${esc([t, last].filter(Boolean).join(' '))},`;
  return `Guten Tag ${esc([t, k.first_name, last].filter(Boolean).join(' '))},`;
}

// Beraterunterschrift (Phalanx)
function signatureFor(u) {
  const name = [u?.title, u?.first_name, u?.last_name].filter(Boolean).join(' ') || 'Christian Neusser';
  return `Mit freundlichen Grüßen<br/><strong>${esc(name)}</strong><br/>
    <span style="color:#666;">Phalanx GmbH · M&amp;A und Corporate Finance</span><br/>
    <span style="color:#666;">Tel. +49 9131-9 20 60 75 · <a href="mailto:${esc(u?.email || 'info@phalanx.de')}" style="color:#5B8FC9;text-decoration:none;">${esc(u?.email || 'info@phalanx.de')}</a></span>`;
}

// Rechtlicher Abbinder: Herkunft der Daten + Widerspruch
function legalFor(profileToken) {
  const base = process.env.FRONTEND_URL || 'https://www.capitalmatch.de';
  const link = profileToken
    ? ` Ihre gespeicherten Angaben können Sie jederzeit <a href="${base}/profil-pflege?token=${profileToken}" style="color:#8A8A8A;">hier einsehen, korrigieren oder löschen lassen</a>.`
    : '';
  return `Wir schreiben Sie an, weil Sie im Rahmen unserer M&amp;A-Tätigkeit als möglicher Interessent für Transaktionen ` +
         `dieser Art geführt werden (Art. 6 Abs. 1 lit. f DSGVO). Sie können der Ansprache jederzeit und ohne Angabe von ` +
         `Gründen widersprechen: eine formlose Antwort auf diese E-Mail genügt.${link}`;
}

// Anonyme Eckdaten des Mandats (nichts, was das Unternehmen identifiziert)
function factsTable(p) {
  const rows = [
    ['Branche', p.industry],
    ['Region', p.region],
    ['Umsatz', p.revenue_band && p.revenue_band !== 'k. A.' ? p.revenue_band : null],
    ['EBITDA', p.ebitda_band && p.ebitda_band !== 'k. A.' ? p.ebitda_band : null],
    ['Transaktionsart', p.deal_type],
  ].filter(([, v]) => v);
  if (!rows.length) return '';
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;background:#F7FAFD;border:1px solid #E1EAF3;border-radius:6px;">
    ${rows.map(([l, v]) => `<tr>
      <td style="padding:7px 12px;font-size:12.5px;color:#6B7C8F;width:38%;border-bottom:1px solid #EDF2F7;">${esc(l)}</td>
      <td style="padding:7px 12px;font-size:13px;color:#0D2A4A;font-weight:700;border-bottom:1px solid #EDF2F7;">${esc(v)}</td>
    </tr>`).join('')}
  </table>`;
}

// ── 1) Erstansprache ────────────────────────────────────────────────────────
// needsConsent = true  → Double-Opt-in-Seite (Einwilligung, dann Konto + Teaser)
// needsConsent = false → Kontakt hat bereits eingewilligt/ein Konto: direkt zum Mandat
function buildInviteMail({ contact, project, inviter, intro, subject, inviteToken, profileToken, needsConsent }) {
  const code = esc(project.codename);
  const title = needsConsent
    ? `${code}: vertrauliche Vorabinformation`
    : `${code}: neues Mandat in Ihrem Suchraster`;

  // Herkunft: Kam der Kontakt über einen Marktplatz (DUB.de u. a.) zu uns, sagen
  // wir das gleich zu Beginn, damit klar ist, warum und woher wir schreiben.
  const provenanceHtml = contact.lead_source
    ? `<p>Sie haben über <strong>${esc(contact.lead_source)}</strong>${contact.lead_ref ? ` (${esc(contact.lead_ref)})` : ''}
        Interesse an einer Transaktion bekundet. Genau dazu melden wir uns.</p>`
    : '';

  const introHtml = intro
    ? `<p>${esc(intro).replace(/\n/g, '<br/>')}</p>`
    : `<p>wir begleiten im Auftrag unseres Mandanten eine Transaktion, die zu Ihrem Profil passt. Vorgestellt wird das
        Vorhaben zunächst anonym; wer dahintersteht, erfahren Sie nach Unterzeichnung einer Vertraulichkeitsvereinbarung.</p>
       <p>CapitalMatch ist unsere eigene Plattform, über die wir solche Mandate abwickeln: Teaser, Vertraulichkeits-
        vereinbarung, Unterlagen und die Kommunikation an einem Ort. Wenn Sie sich dort registrieren, läuft der Prozess
        für uns beide schneller und sauberer, und Sie behalten Ihre Unterlagen jederzeit im Blick.</p>`;

  const steps = `
    <p style="margin:16px 0 6px;font-weight:700;color:#0D2A4A;font-size:13.5px;">So geht es weiter</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;color:#333;">
      <tr><td style="padding:3px 8px 3px 0;color:#5B8FC9;font-weight:700;white-space:nowrap;">1.</td><td style="padding:3px 0;">Sie bestätigen und registrieren sich, dauert eine Minute</td></tr>
      <tr><td style="padding:3px 8px 3px 0;color:#5B8FC9;font-weight:700;">2.</td><td style="padding:3px 0;"><strong>Direkt danach erhalten Sie automatisch die Vertraulichkeitsvereinbarung zu diesem Mandat</strong>, digital zu zeichnen</td></tr>
      <tr><td style="padding:3px 8px 3px 0;color:#5B8FC9;font-weight:700;">3.</td><td style="padding:3px 0;">Nach Ihrer Unterschrift schalten wir Information Memorandum und Datenraum frei</td></tr>
      <tr><td style="padding:3px 8px 3px 0;color:#5B8FC9;font-weight:700;">4.</td><td style="padding:3px 0;">Management-Gespräch, indikatives Angebot, Due Diligence</td></tr>
    </table>`;

  const consentBlock = needsConsent ? `
    <div style="margin-top:18px;padding:12px 16px;background:#F4F8FC;border-left:3px solid #5B8FC9;font-size:12.5px;color:#44546A;line-height:1.6;">
      <strong style="color:#0D2A4A;">Ihre Bestätigung (DSGVO):</strong> Solange Sie nicht ausdrücklich zustimmen,
      legen wir kein Konto an und schicken Ihnen keine Unterlagen. Mit dem Button erteilen Sie Ihre Einwilligung.
      Zurücknehmen können Sie sie jederzeit, mit Wirkung für die Zukunft.
    </div>` : '';

  const base = process.env.FRONTEND_URL || 'https://www.capitalmatch.de';
  const secondary = profileToken
    ? `<a href="${base}/profil-pflege?token=${profileToken}" style="color:#5B8FC9;">Suchprofil und Kontaktdaten prüfen</a>. Dann sprechen wir Sie künftig nur zu Mandaten an, die wirklich passen.`
    : null;

  return {
    to: contact.email,
    subject: subject || `[Vertraulich] ${title}`,
    title,
    salutation: salutationFor(contact),
    bodyHtml: `${provenanceHtml}${introHtml}${factsTable(project)}
      ${project.short_description ? `<p style="font-size:13.5px;color:#333;">${esc(project.short_description)}</p>` : ''}
      ${steps}${consentBlock}`,
    ctaLabel: needsConsent ? 'Einwilligung bestätigen und Kurzprofil ansehen' : 'Mandat ansehen',
    ctaPath: needsConsent ? `/einwilligung?token=${inviteToken}` : `/projekte/${project.id}`,
    secondaryHtml: secondary,
    signatureHtml: signatureFor(inviter),
    legalHtml: legalFor(profileToken),
  };
}

// ── 2) Reminder ─────────────────────────────────────────────────────────────
function buildReminderMail({ contact, project, inviter, inviteToken, profileToken, needsConsent, round }) {
  const code = esc(project.codename);
  const last = round >= MAX_REMINDERS;
  const title = last ? `${code}: letzte Nachfrage` : `${code}: kurze Erinnerung`;

  const body = last
    ? `<p>vor drei Wochen haben wir Ihnen das Mandat <strong>${code}</strong> vorgestellt. Gehört haben wir seitdem
        nichts. Wir lesen das als Desinteresse, und das ist völlig in Ordnung.</p>
       <p><strong>Zu diesem Mandat melden wir uns nicht wieder.</strong> Wenn sich Ihre Einschätzung doch ändert,
        genügt eine kurze Nachricht. Der Zugang bleibt bis zum Ende des Prozesses offen.</p>`
    : `<p>kurz zurück zu unserer Ansprache zum Mandat <strong>${code}</strong>. Der Prozess läuft, die ersten
        Gespräche stehen im Kalender. Wer jetzt einsteigt, verliert nichts.</p>
       <p>Ein Klick genügt, wenn Sie ${needsConsent ? 'die anonymen Eckdaten sehen möchten' : 'einen Blick in die Unterlagen werfen möchten'}.
        Wenn nicht, sagen Sie bitte kurz ab. Dann nehmen wir Sie aus dem Prozess und Sie haben Ruhe.</p>`;

  const base = process.env.FRONTEND_URL || 'https://www.capitalmatch.de';
  return {
    to: contact.email,
    subject: `[Vertraulich] ${title}`,
    title,
    salutation: salutationFor(contact),
    bodyHtml: `${body}${factsTable(project)}`,
    ctaLabel: needsConsent ? 'Einwilligung bestätigen und Kurzprofil ansehen' : 'Mandat ansehen',
    ctaPath: needsConsent ? `/einwilligung?token=${inviteToken}` : `/projekte/${project.id}`,
    secondaryHtml: profileToken
      ? `<a href="${base}/profil-pflege?token=${profileToken}" style="color:#5B8FC9;">Kein Interesse an Mandaten dieser Art?</a> Hier stellen Sie Ihr Profil ein oder melden sich ab.`
      : null,
    signatureHtml: signatureFor(inviter),
    legalHtml: legalFor(profileToken),
  };
}

// ── 3) Projekt-Update ───────────────────────────────────────────────────────
function buildUpdateMail({ contact, project, inviter, changes, note, profileToken }) {
  const code = esc(project.codename);
  const list = (changes || []).length
    ? `<ul style="margin:12px 0;padding-left:18px;font-size:13.5px;color:#333;">
        ${changes.map(c => `<li style="margin-bottom:5px;">${esc(c)}</li>`).join('')}
      </ul>`
    : '';
  return {
    to: contact.email,
    subject: `[Vertraulich] ${code}: Aktualisierung im Prozess`,
    title: `${code}: Aktualisierung`,
    salutation: salutationFor(contact),
    bodyHtml: `
      <p>Sie sind am Prozess <strong>${code}</strong> beteiligt. Es hat sich etwas geändert, das Ihre Einschätzung betreffen kann:</p>
      ${note ? `<p style="background:#F4F8FC;border-left:3px solid #5B8FC9;padding:10px 14px;font-size:13.5px;color:#333;">${esc(note).replace(/\n/g, '<br/>')}</p>` : ''}
      ${list}
      <p style="font-size:13.5px;color:#333;">Die neuen Angaben liegen auf der Plattform für Sie bereit. Rufen Sie an, wenn etwas unklar ist.</p>`,
    ctaLabel: 'Aktualisierte Angaben ansehen',
    ctaPath: `/projekte/${project.id}`,
    signatureHtml: signatureFor(inviter),
    legalHtml: legalFor(profileToken),
  };
}

// ── Reminder-Lauf ───────────────────────────────────────────────────────────
// Fällig = Erstversand liegt REMINDER_DAYS[reminder_count] Tage zurück.
// Reaktion (Einwilligung, Registrierung, Widerspruch, Statuswechsel der Partei)
// beendet die Serie sofort.
function reminderDue(row, now = Date.now()) {
  if (!row.reminders_enabled) return false;
  if (row.reminder_count >= MAX_REMINDERS) return false;
  const sent = row.sent_at ? new Date(row.sent_at).getTime() : null;
  if (!sent) return false;
  const dueAfter = REMINDER_DAYS[row.reminder_count] * DAY;
  return (now - sent) >= dueAfter;
}

// Echte Reaktion auf das Mailing: Einwilligung/Registrierung, Absage, Antwort per
// Mail oder Widerspruch. Bewusst NICHT: „der Kontakt ist im Funnel aktiv geführt".
// Das ist ein manuell gesetzter Status des Beraters, keine Reaktion auf die Mail.
// Sonst gälte jeder aktive Kontakt als „reagiert", auch ohne je geantwortet zu haben.
function reactionOf(row) {
  if (row.consent_status === 'opt_out' || row.contact_status === 'do_not_contact') return 'Widerspruch';
  if (['consented', 'registered'].includes(row.invite_status)) return 'Einwilligung erteilt';
  if (row.invite_status === 'declined') return 'abgelehnt';
  if (row.replied) return 'Antwort erhalten';
  return null;
}

async function runReminders() {
  const now = Date.now();
  const rows = await db.all(`
    SELECT r.id, r.campaign_id, r.contact_id, r.email, r.status, r.reminder_count, r.sent_at,
           r.invitation_id, r.profile_link_id,
           c.project_id, c.reminders_enabled, c.created_by,
           k.salutation, k.title, k.first_name, k.last_name, k.consent_status, k.contact_status,
           i.token AS invite_token, i.status AS invite_status,
           pl.token AS profile_token,
           dp.party_status, dp.replied,
           p.id AS pid, p.codename, p.industry, p.region, p.revenue_band, p.ebitda_band, p.deal_type, p.short_description
    FROM crm_campaign_recipients r
    JOIN crm_campaigns c ON c.id = r.campaign_id
    LEFT JOIN crm_contacts k ON k.id = r.contact_id
    LEFT JOIN crm_invitations i ON i.id = r.invitation_id
    LEFT JOIN crm_profile_links pl ON pl.id = r.profile_link_id
    LEFT JOIN crm_deal_parties dp ON dp.project_id = c.project_id AND dp.contact_id = r.contact_id
    LEFT JOIN projects p ON p.id = c.project_id
    WHERE r.status IN ('sent', 'reminded') AND c.reminders_enabled = 1`);
  if (!rows.length) return 0;

  const { sendCampaignEmail } = require('./email');
  let sent = 0;

  for (const row of rows) {
    // a) Echte Reaktion oder Widerspruch → Serie beenden
    const reaction = reactionOf(row);
    if (reaction) {
      await db.run(
        `UPDATE crm_campaign_recipients SET status = ?, skip_reason = ?, responded_at = now() WHERE id = ?`,
        [reaction === 'Widerspruch' ? 'skipped' : 'responded', reaction, row.id]).catch(() => {});
      continue;
    }
    // a2) Kein echtes Signal, aber der Kontakt wird im Funnel aktiv geführt (oder ist
    // ausgestiegen): keine Reminder mehr, aber das zählt NICHT als Reaktion.
    if (row.party_status && ['active', 'dropped'].includes(row.party_status)) {
      await db.run(
        `UPDATE crm_campaign_recipients SET status = 'suppressed', skip_reason = 'wird im Funnel geführt' WHERE id = ?`,
        [row.id]).catch(() => {});
      continue;
    }
    if (!row.email || !row.pid) continue;

    // b) Serie ausgereizt → endgültig Schluss
    if (row.reminder_count >= MAX_REMINDERS) {
      await db.run(`UPDATE crm_campaign_recipients SET status = 'no_response' WHERE id = ?`, [row.id]).catch(() => {});
      continue;
    }
    if (!reminderDue(row, now)) continue;

    const inviter = row.created_by
      ? await db.get('SELECT title, first_name, last_name, email FROM users WHERE id = ?', [row.created_by]) : null;
    const needsConsent = !!row.invite_token && !['consented', 'registered'].includes(row.invite_status);

    const mail = buildReminderMail({
      contact: row, project: { ...row, id: row.pid }, inviter,
      inviteToken: row.invite_token, profileToken: row.profile_token,
      needsConsent, round: row.reminder_count + 1,
    });
    await sendCampaignEmail({ ...mail, meta: { type: 'campaign', templateKey: 'reminder', contactId: row.contact_id, projectId: row.project_id, tenantId: row.tenant_id || 1 } }).catch(() => {});

    const nextCount = row.reminder_count + 1;
    await db.run(
      `UPDATE crm_campaign_recipients
         SET reminder_count = ?, last_reminder_at = now(),
             status = ${nextCount >= MAX_REMINDERS ? `'no_response'` : `'reminded'`}
       WHERE id = ?`, [nextCount, row.id]).catch(() => {});
    if (row.invitation_id) {
      await db.run(
        `UPDATE crm_invitations SET reminder_count = COALESCE(reminder_count,0) + 1, last_reminder_at = now() WHERE id = ?`,
        [row.invitation_id]).catch(() => {});
    }
    await db.run(
      `UPDATE crm_deal_parties SET mails_sent = COALESCE(mails_sent,0) + 1, last_contact = CURRENT_DATE
        WHERE project_id = ? AND contact_id = ?`, [row.project_id, row.contact_id]).catch(() => {});
    db.auditLog(null, 'CRM_CAMPAIGN_REMINDER', 'crm_contact', row.contact_id,
      `Mandat #${row.project_id} · Erinnerung ${nextCount}/${MAX_REMINDERS} → ${row.email}`, null);
    sent++;
  }
  return sent;
}

// ── Projekt-Änderung an aktive Beteiligte ───────────────────────────────────
// „aktiv" = eingewilligt, kein Widerspruch, noch im Prozess (nicht ausgestiegen)
// und mindestens angesprochen (funnel_stage ≥ 1).
async function activeParticipants(projectId) {
  return db.all(`
    SELECT dp.contact_id, dp.party_status,
           k.salutation, k.title, k.first_name, k.last_name, k.email, k.consent_status, k.contact_status,
           (SELECT token FROM crm_profile_links pl WHERE pl.contact_id = dp.contact_id AND pl.status = 'active'
             ORDER BY pl.id DESC LIMIT 1) AS profile_token
    FROM crm_deal_parties dp
    JOIN crm_contacts k ON k.id = dp.contact_id
    WHERE dp.project_id = ?
      AND dp.funnel_stage >= 1
      AND dp.party_status IN ('open', 'active', 'unclear')
      AND k.email IS NOT NULL
      AND k.consent_status = 'opt_in'
      AND COALESCE(k.contact_status, '') <> 'do_not_contact'`, [projectId]);
}

async function notifyProjectChange(projectId, changes, { actorId = null, note = null, force = false } = {}) {
  const project = await db.get(
    `SELECT id, codename, status, industry, region, revenue_band, ebitda_band, deal_type FROM projects WHERE id = ?`,
    [projectId]);
  if (!project || project.status !== 'active') return { sent: 0, reason: 'Mandat nicht aktiv' };
  if (!force && !(changes || []).length && !note) return { sent: 0, reason: 'nichts Berichtenswertes' };

  // Frequenzbremse: höchstens ein Update-Mailing je Mandat und Tag
  if (!force) {
    const recent = await db.get(
      `SELECT id FROM crm_campaigns
        WHERE project_id = ? AND purpose = 'update' AND created_at > now() - interval '${UPDATE_COOLDOWN_H} hours'`,
      [projectId]);
    if (recent) return { sent: 0, reason: 'Update-Mail lief bereits in den letzten 24 h' };
  }

  const recipients = await activeParticipants(projectId);
  if (!recipients.length) return { sent: 0, reason: 'keine aktiven, eingewilligten Beteiligten' };

  const inviter = actorId ? await db.get('SELECT title, first_name, last_name, email FROM users WHERE id = ?', [actorId]) : null;
  const tenant = await db.get('SELECT tenant_id FROM projects WHERE id = ?', [projectId]);
  const campaignId = await db.insert(`
    INSERT INTO crm_campaigns (tenant_id, project_id, name, purpose, subject, intro, reminders_enabled, status, created_by, sent_at)
    VALUES (?, ?, ?, 'update', ?, ?, 0, 'sent', ?, now())`,
    [tenant?.tenant_id || 1, projectId, `Update ${project.codename}`,
     `${project.codename}: Aktualisierung im Prozess`, note || (changes || []).join(' · '), actorId]);

  const { sendCampaignEmail } = require('./email');
  let sent = 0;
  for (const r of recipients) {
    await sendCampaignEmail({ ...buildUpdateMail({
      contact: r, project, inviter, changes, note, profileToken: r.profile_token,
    }), meta: { type: 'campaign', templateKey: 'update', contactId: r.contact_id, projectId, tenantId: tenant?.tenant_id || 1 } }).catch(() => {});
    await db.run(`
      INSERT INTO crm_campaign_recipients (tenant_id, campaign_id, contact_id, email, status, sent_at)
      VALUES (?, ?, ?, ?, 'responded', now())
      ON CONFLICT (campaign_id, contact_id) DO NOTHING`,
      [tenant?.tenant_id || 1, campaignId, r.contact_id, r.email]).catch(() => {});
    await db.run(
      `UPDATE crm_deal_parties SET mails_sent = COALESCE(mails_sent,0) + 1, last_contact = CURRENT_DATE
        WHERE project_id = ? AND contact_id = ?`, [projectId, r.contact_id]).catch(() => {});
    sent++;
  }
  db.auditLog(actorId, 'CRM_PROJECT_UPDATE_MAIL', 'project', projectId,
    `${sent} aktive Beteiligte informiert${changes && changes.length ? ' · ' + changes.join(', ') : ''}`, null);
  return { sent, campaignId };
}

// Welche Felder rechtfertigen überhaupt eine Mail? (Kosmetik wie Emoji nicht.)
const MATERIAL_FIELDS = {
  codename: 'Mandatsbezeichnung',
  industry: 'Branche',
  region: 'Region',
  revenue_band: 'Umsatzband',
  ebitda_band: 'EBITDA-Band',
  deal_type: 'Transaktionsart',
  short_description: 'Kurzbeschreibung',
  stage: 'Prozessphase',
  investment_needed: 'Kapitalbedarf',
  equity_stake: 'Anteil',
};

function materialChanges(before, after) {
  const out = [];
  for (const [f, label] of Object.entries(MATERIAL_FIELDS)) {
    const a = before?.[f] == null ? '' : String(before[f]);
    const b = after?.[f] == null ? '' : String(after[f]);
    if (b && a !== b) {
      out.push(f === 'short_description' ? `${label} überarbeitet` : `${label}: ${a || 'k. A.'} → ${b}`);
    }
  }
  return out;
}

// ── Scheduler ───────────────────────────────────────────────────────────────
function startScheduler() {
  if (process.env.CAMPAIGN_REMINDERS_ENABLED === '0') return;
  const tick = () => runReminders()
    .then(n => { if (n) console.log(`📨 Kampagnen-Reminder: ${n} Erinnerung(en) versendet`); })
    .catch(e => console.warn('Kampagnen-Reminder fehlgeschlagen:', e.message));
  setTimeout(tick, 90 * 1000);
  setInterval(tick, 60 * 60 * 1000);
}

module.exports = {
  REMINDER_DAYS, MAX_REMINDERS, MATERIAL_FIELDS,
  salutationFor, signatureFor, factsTable,
  buildInviteMail, buildReminderMail, buildUpdateMail,
  reminderDue, reactionOf, runReminders,
  activeParticipants, notifyProjectChange, materialChanges,
  startScheduler,
};
