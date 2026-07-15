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

module.exports = { sendFirstApproach };
