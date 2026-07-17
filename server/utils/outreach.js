// ─────────────────────────────────────────────────────────────────────────────
// v0.273: Automatische Erstansprache eines Kontakts zu einem Mandat.
//
// Wird nach der Übernahme eines Marktplatz-Leads (Admin-Dialog oder Brevo-Webhook)
// aufgerufen, wenn „direkt ansprechen" gewünscht ist. Die Funktion tut genau das,
// was der Sammel-Versand im Funnel tut, nur für einen Kontakt:
//   · Einwilligungs-Token (Double-Opt-in) und Pflege-Link sicherstellen
//   · eine (wiederverwendbare) Kampagne je Mandat führen, damit die 7/21-Tage-
//     Reminder automatisch greifen
//   · die Erstansprache versenden (buildInviteMail nennt auch die Herkunft)
//
// DSGVO: nie an opt_out / do_not_contact. Eine Kaufanfrage über einen Marktplatz
// ist berechtigtes Interesse (Art. 6 Abs. 1 lit. f); die Mail holt zugleich die
// Einwilligung für die weitere Kommunikation ein.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');
const campaigns = require('./campaigns');

const INVITE_DAYS = 21;
const PROFILE_DAYS = 30;

async function sendFirstApproach(q, { tenant = 1, contactId, projectId, actorId = null, inviter = null } = {}) {
  if (!contactId || !projectId) return { sent: false, reason: 'Kontakt oder Mandat fehlt' };

  const contact = await q.get('SELECT * FROM crm_contacts WHERE id = ?', [contactId]).catch(() => null);
  if (!contact || !contact.email) return { sent: false, reason: 'keine E-Mail' };
  if (contact.consent_status === 'opt_out' || contact.contact_status === 'do_not_contact') {
    return { sent: false, reason: 'Widerspruch' };
  }
  const project = await q.get('SELECT * FROM projects WHERE id = ?', [projectId]).catch(() => null);
  if (!project) return { sent: false, reason: 'Mandat nicht gefunden' };

  const needsConsent = contact.consent_status !== 'opt_in';

  // Einwilligungs-Token: offenen Vorgang wiederverwenden, sonst neu
  let inviteId = null, inviteToken = null;
  if (needsConsent) {
    const open = await q.get(
      `SELECT id, token FROM crm_invitations WHERE contact_id = ? AND status IN ('invited','opened')
        AND (expires_at IS NULL OR expires_at > now()) ORDER BY id DESC LIMIT 1`, [contactId]).catch(() => null);
    if (open) { inviteId = open.id; inviteToken = open.token; }
    else {
      inviteToken = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + INVITE_DAYS * 24 * 3600 * 1000);
      inviteId = await q.insert(
        `INSERT INTO crm_invitations (tenant_id, contact_id, project_id, email, token, invited_by, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`, [tenant, contactId, projectId, contact.email, inviteToken, actorId, expires]);
    }
  }

  // Pflege-/Abmelde-Link immer beilegen
  let profileId = null, profileToken = null;
  const active = await q.get(
    `SELECT id, token FROM crm_profile_links WHERE contact_id = ? AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now()) ORDER BY id DESC LIMIT 1`, [contactId]).catch(() => null);
  if (active) { profileId = active.id; profileToken = active.token; }
  else {
    profileToken = crypto.randomBytes(32).toString('hex');
    const pExp = new Date(Date.now() + PROFILE_DAYS * 24 * 3600 * 1000);
    profileId = await q.insert(
      `INSERT INTO crm_profile_links (tenant_id, contact_id, token, requires_approval, created_by, expires_at)
       VALUES (?, ?, ?, 0, ?, ?)`, [tenant, contactId, profileToken, actorId, pExp]);
  }

  // Kampagne je Mandat wiederverwenden (Reminder-Automatik hängt daran)
  let camp = await q.get(
    `SELECT id FROM crm_campaigns WHERE project_id = ? AND purpose = 'invite' AND name = ? LIMIT 1`,
    [projectId, `Automatische Ansprache ${project.codename}`]).catch(() => null);
  const campaignId = camp ? camp.id : await q.insert(
    `INSERT INTO crm_campaigns (tenant_id, project_id, name, purpose, reminders_enabled, status, created_by, sent_at)
     VALUES (?, ?, ?, 'invite', 1, 'sent', ?, now())`,
    [tenant, projectId, `Automatische Ansprache ${project.codename}`, actorId]);

  await q.run(
    `INSERT INTO crm_campaign_recipients (tenant_id, campaign_id, contact_id, email, invitation_id, profile_link_id, status, sent_at)
     VALUES (?, ?, ?, ?, ?, ?, 'sent', now())
     ON CONFLICT (campaign_id, contact_id) DO NOTHING`,
    [tenant, campaignId, contactId, contact.email, inviteId, profileId]).catch(() => {});

  const inviterUser = inviter
    || (actorId ? await q.get('SELECT title, first_name, last_name, email FROM users WHERE id = ?', [actorId]).catch(() => null) : null);

  const { sendCampaignEmail } = require('./email');
  await sendCampaignEmail({
    ...campaigns.buildInviteMail({
      contact, project, inviter: inviterUser,
      inviteToken, profileToken, needsConsent,
    }),
    meta: { type: 'campaign', templateKey: 'invite', contactId, projectId, actorId, tenantId: tenant },
  }).catch(() => {});

  // Funnel: mindestens „angesprochen", Mailzähler hoch
  await q.run(
    `UPDATE crm_deal_parties SET funnel_stage = GREATEST(funnel_stage, 1), mails_sent = COALESCE(mails_sent,0) + 1,
        last_contact = CURRENT_DATE WHERE project_id = ? AND contact_id = ?`, [projectId, contactId]).catch(() => {});

  return { sent: true, campaignId, needsConsent };
}

// ── Automatische NDA-Einladung nach der Registrierung ────────────────────────
// Registriert sich ein per Mandats-Einladung angesprochener Kontakt, soll er ohne
// weiteres Zutun die Vertraulichkeitsvereinbarung zu genau diesem Mandat erhalten.
// Ablauf: Interesse setzen (Funnel rückt auf „NDA"), eine NDA-Anfrage anlegen und
// eine Mail mit dem Link zum digitalen Zeichnen schicken. Die spätere Freigabe des
// Datenraums bleibt manuell (Aufgabe des Beraters).
async function sendNdaInviteAfterRegister(dbh, { userId, projectId } = {}) {
  try {
    if (!userId || !projectId) return { sent: false, reason: 'Nutzer oder Mandat fehlt' };
    const project = await dbh.get('SELECT id, codename, status FROM projects WHERE id = ?', [projectId]).catch(() => null);
    if (!project || project.status !== 'active') return { sent: false, reason: 'Mandat nicht aktiv' };
    const user = await dbh.get('SELECT id, email, salutation, title, first_name, last_name FROM users WHERE id = ?', [userId]).catch(() => null);
    if (!user || !user.email) return { sent: false, reason: 'keine E-Mail' };

    // Interesse setzen → Funnel rückt (dealSync) auf „NDA" (ohne Unterschrift Stufe 3)
    try { await require('../middleware/gates').setStage(userId, projectId, 'requested', userId, null); } catch { /* darf den Ablauf nicht stoppen */ }

    // NDA-Anfrage anlegen, falls noch keine besteht (Grundlage fürs Online-Zeichnen)
    const existing = await dbh.get('SELECT id, status FROM nda_requests WHERE user_id = ? AND project_id = ?', [userId, projectId]).catch(() => null);
    if (!existing) {
      await dbh.insert(
        `INSERT INTO nda_requests (user_id, project_id, status, requested_at) VALUES (?, ?, 'requested', now())`,
        [userId, projectId]).catch(() => {});
    }

    const base = process.env.FRONTEND_URL || 'https://www.capitalmatch.de';
    const { sendProcessUpdateEmail } = require('./email');
    await sendProcessUpdateEmail({
      to: user.email, person: user,
      title: `Ihr Zugang ist da: NDA für ${project.codename} zeichnen`,
      message:
        `willkommen auf CapitalMatch, Ihr Konto ist aktiv. CapitalMatch ist unsere Plattform zur Abwicklung dieses ` +
        `Mandats, hier laufen Unterlagen und Kommunikation zusammen.<br/><br/>` +
        `Als nächster Schritt steht die Vertraulichkeitsvereinbarung zum Mandat <strong>${project.codename}</strong> für Sie ` +
        `bereit. Sie zeichnen sie direkt auf der Plattform, ohne Ausdruck und ohne Postweg. Sobald sie unterschrieben ist, ` +
        `erhalten Sie das Information Memorandum; den vollständigen Datenraum geben wir nach einer kurzen Prüfung frei.`,
      ctaLabel: 'NDA jetzt zeichnen', ctaPath: `/projekte/${projectId}`,
      meta: { type: 'process', templateKey: 'nda_invite_auto', projectId, userId },
    }).catch(() => {});

    if (dbh.auditLog) dbh.auditLog(userId, 'NDA_INVITE_AUTO', 'project', projectId, `Automatische NDA-Einladung nach Registrierung`, null);
    return { sent: true };
  } catch (e) {
    console.warn('[outreach.sendNdaInviteAfterRegister]', e.message);
    return { sent: false, reason: e.message };
  }
}

// ── Verkäufer/Mandant zur Plattform einladen ─────────────────────────────────
// Anders als die Käufer-Ansprache: der Mandant bekommt Zugang zum Prozessstand
// seines eigenen Mandats (wer interessiert ist, wie weit), ohne Kontaktdaten
// Dritter. Läuft über denselben Einwilligungs-/Registrierungsweg; bei der
// Registrierung wird die Rolle „seller" gesetzt (siehe /invite/:token/register).
async function sendSellerInvite(q, { tenant = 1, contactId, projectId, actorId = null, inviter = null } = {}) {
  if (!contactId || !projectId) return { sent: false, reason: 'Kontakt oder Mandat fehlt' };
  const contact = await q.get('SELECT * FROM crm_contacts WHERE id = ?', [contactId]).catch(() => null);
  if (!contact || !contact.email) return { sent: false, reason: 'keine E-Mail' };
  if (contact.consent_status === 'opt_out' || contact.contact_status === 'do_not_contact') return { sent: false, reason: 'Widerspruch' };
  const project = await q.get('SELECT * FROM projects WHERE id = ?', [projectId]).catch(() => null);
  if (!project) return { sent: false, reason: 'Mandat nicht gefunden' };

  let token = null;
  const open = await q.get(
    `SELECT id, token FROM crm_invitations WHERE contact_id = ? AND status IN ('invited','opened')
      AND (expires_at IS NULL OR expires_at > now()) ORDER BY id DESC LIMIT 1`, [contactId]).catch(() => null);
  if (open) { token = open.token; }
  else {
    token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + INVITE_DAYS * 24 * 3600 * 1000);
    await q.insert(
      `INSERT INTO crm_invitations (tenant_id, contact_id, project_id, email, token, invited_by, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [tenant, contactId, projectId, contact.email, token, actorId, expires]);
  }

  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const code = esc(project.codename);
  const { sendCampaignEmail } = require('./email');
  await sendCampaignEmail({
    to: contact.email,
    subject: `[Vertraulich] ${code}: Ihr Zugang als Mandant`,
    title: `${code}: Ihr Zugang zum Prozessstand`,
    salutation: campaigns.salutationFor(contact),
    bodyHtml:
      `<p>für Ihr Mandat <strong>${code}</strong> richten wir Ihnen auf CapitalMatch einen persönlichen Zugang ein. ` +
      `Dort sehen Sie jederzeit, wie weit der Prozess ist: welche Interessenten es gibt und auf welcher Stufe sie stehen. ` +
      `Kontaktdaten der Interessenten zeigen wir aus Vertraulichkeitsgründen nicht.</p>` +
      `<p>Mit dem Button bestätigen Sie kurz Ihre Einwilligung und legen Ihr Konto an. Danach ist der Prozessstand für Sie einsehbar.</p>`,
    ctaLabel: 'Zugang einrichten',
    ctaPath: `/einwilligung?token=${token}`,
    signatureHtml: campaigns.signatureFor(inviter),
    legalHtml: 'Diesen Zugang richten wir im Rahmen Ihres Mandats bei uns ein (Art. 6 Abs. 1 lit. b DSGVO). Sie können der Nutzung jederzeit widersprechen.',
    meta: { type: 'invite', templateKey: 'seller_invite', contactId, projectId, actorId, tenantId: tenant },
  }).catch(() => {});

  return { sent: true };
}

module.exports = { sendFirstApproach, sendNdaInviteAfterRegister, sendSellerInvite };
