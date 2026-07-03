/**
 * CapitalMatch — E-Mail-Benachrichtigungen
 *
 * Sendet bei jedem Dokumenten-Download eine E-Mail an den Admin.
 *
 * Konfiguration via Umgebungsvariablen (in Railway setzen):
 *   SMTP_HOST     – z.B. smtp.gmail.com
 *   SMTP_PORT     – z.B. 587
 *   SMTP_USER     – Absender-E-Mail
 *   SMTP_PASS     – App-Passwort (Gmail: 2FA aktiv + App-Passwort erstellen)
 *   NOTIFICATION_EMAIL – Empfänger, Standard: neusser@phalanx.de
 *
 * Falls SMTP nicht konfiguriert, wird die Benachrichtigung nur in den
 * Server-Logs ausgegeben (kein Absturz).
 */

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch {
  // nodemailer nicht installiert – graceful degradation
}

function createTransporter() {
  if (!nodemailer) return null;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: parseInt(SMTP_PORT || '587', 10) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

/**
 * Sendet eine Benachrichtigung, wenn ein Dokument heruntergeladen wurde.
 *
 * @param {object} opts
 * @param {string} opts.documentName   – Dateiname des Dokuments
 * @param {string} opts.projectName    – Name / Codename des Projekts
 * @param {string} opts.accessLevel    – public | nda | approved
 * @param {object} opts.user           – { first_name, last_name, email, company }
 * @param {string} opts.ip             – IP-Adresse des Downloaders
 * @param {Date}   [opts.timestamp]    – Zeitpunkt (default: jetzt)
 */
async function sendDownloadNotification(opts) {
  const {
    documentName,
    projectName,
    accessLevel,
    user,
    ip,
    timestamp = new Date(),
  } = opts;

  const to = process.env.NOTIFICATION_EMAIL || 'neusser@phalanx.de';
  const ts = timestamp.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
  const levelLabel = accessLevel === 'nda' ? 'NDA-Dokument' : accessLevel === 'approved' ? 'Freigegebenes Dokument' : 'Teaser';

  // Immer in die Logs schreiben (Railway-Dashboard zeigt dies)
  console.log(`📥 DOWNLOAD | ${ts} | Dokument: "${documentName}" | Projekt: ${projectName} | Typ: ${levelLabel} | Von: ${user.first_name} ${user.last_name} <${user.email}> | Firma: ${user.company || '—'} | IP: ${ip}`);

  // E-Mail senden (nur wenn SMTP konfiguriert)
  const transporter = createTransporter();
  if (!transporter) {
    if (!process.env.SMTP_HOST) {
      // Kein Warning-Spam – SMTP ist optional
    }
    return;
  }

  const subject = `[CapitalMatch] Download: ${documentName} — ${user.first_name} ${user.last_name}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
      <div style="background: #1A4D8A; padding: 20px 24px; border-radius: 6px 6px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 18px;">
          📥 Neuer Dokument-Download
        </h1>
        <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 13px;">
          CapitalMatch — Benachrichtigung
        </p>
      </div>
      <div style="background: #fff; padding: 24px; border: 1px solid #DDE8F3; border-top: none; border-radius: 0 0 6px 6px;">

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #888; width: 140px; vertical-align: top;">Zeitpunkt</td>
            <td style="padding: 8px 0; font-weight: 600;">${ts}</td>
          </tr>
          <tr style="background: #F4F8FC;">
            <td style="padding: 8px 6px; color: #888; vertical-align: top;">Dokument</td>
            <td style="padding: 8px 6px; font-weight: 600;">${documentName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888; vertical-align: top;">Projekt</td>
            <td style="padding: 8px 0;">${projectName}</td>
          </tr>
          <tr style="background: #F4F8FC;">
            <td style="padding: 8px 6px; color: #888; vertical-align: top;">Dokumenttyp</td>
            <td style="padding: 8px 6px;">
              <span style="background: ${accessLevel === 'nda' ? '#FEF3C7' : '#D1FAE5'}; color: ${accessLevel === 'nda' ? '#92400E' : '#065F46'}; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                ${levelLabel}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888; vertical-align: top; border-top: 2px solid #EBF7FC;">Name</td>
            <td style="padding: 8px 0; border-top: 2px solid #EBF7FC; font-weight: 600;">${user.first_name} ${user.last_name}</td>
          </tr>
          <tr style="background: #F4F8FC;">
            <td style="padding: 8px 6px; color: #888; vertical-align: top;">E-Mail</td>
            <td style="padding: 8px 6px;"><a href="mailto:${user.email}" style="color: #1A4D8A;">${user.email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888; vertical-align: top;">Unternehmen</td>
            <td style="padding: 8px 0;">${user.company || '—'}</td>
          </tr>
          <tr style="background: #F4F8FC;">
            <td style="padding: 8px 6px; color: #888; vertical-align: top;">IP-Adresse</td>
            <td style="padding: 8px 6px; font-family: monospace; font-size: 12px;">${ip}</td>
          </tr>
        </table>

        <div style="margin-top: 20px; padding: 12px; background: #EBF7FC; border-radius: 4px; font-size: 12px; color: #555;">
          Diese Benachrichtigung wurde automatisch von der CapitalMatch-Plattform gesendet.
          Den vollständigen Audit-Trail finden Sie im Admin-Bereich unter „Aktivitäten".
        </div>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"CapitalMatch Plattform" <${fromAddress()}>`,
      to,
      subject,
      html,
    });
    console.log(`✉️  Benachrichtigung gesendet an ${to}`);
  } catch (err) {
    console.error('⚠️  E-Mail-Versand fehlgeschlagen:', err.message);
    // Kein throw – Download trotzdem erfolgreich
  }
}

// Absenderadresse: MAIL_FROM (z. B. bei Brevo/Versanddiensten nötig, wo der
// SMTP-Login von der Absenderadresse abweicht), Fallback: SMTP_USER
const fromAddress = () => process.env.MAIL_FROM || process.env.SMTP_USER;

// ── Generischer Versand (nur wenn SMTP konfiguriert) ────────────────────────
async function sendMail({ to, subject, html }) {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`✉️  [SMTP nicht konfiguriert] E-Mail NICHT gesendet: "${subject}" an ${to}`);
    return false;
  }
  try {
    await transporter.sendMail({ from: `"CapitalMatch Plattform" <${fromAddress()}>`, to, subject, html });
    console.log(`✉️  E-Mail gesendet: "${subject}" an ${to}`);
    return true;
  } catch (err) {
    console.error('⚠️  E-Mail-Versand fehlgeschlagen:', err.message);
    return false;
  }
}

const mailShell = (title, bodyHtml) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
    <div style="background: #1A4D8A; padding: 20px 24px; border-radius: 6px 6px 0 0;">
      <h1 style="color: #fff; margin: 0; font-size: 18px;">${title}</h1>
      <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 13px;">CapitalMatch — eine Marke der Phalanx GmbH</p>
    </div>
    <div style="background: #fff; padding: 24px; border: 1px solid #DDE8F3; border-top: none; border-radius: 0 0 6px 6px; font-size: 14px; line-height: 1.6;">
      ${bodyHtml}
    </div>
  </div>`;

// Passwort-Reset-Link an den Nutzer
async function sendPasswordResetEmail({ to, firstName, resetUrl, expires }) {
  return sendMail({
    to,
    subject: '[CapitalMatch] Passwort zurücksetzen',
    html: mailShell('Passwort zurücksetzen', `
      <p>Hallo ${firstName || ''},</p>
      <p>für Ihr CapitalMatch-Konto wurde ein Passwort-Reset angefordert. Klicken Sie auf den folgenden Button, um ein neues Passwort zu vergeben:</p>
      <p style="text-align:center; margin: 24px 0;">
        <a href="${resetUrl}" style="background:#1A4D8A;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">Neues Passwort vergeben</a>
      </p>
      <p style="font-size:12px;color:#888;">Der Link ist gültig bis ${new Date(expires).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}. Falls Sie den Reset nicht angefordert haben, ignorieren Sie diese E-Mail.</p>
    `),
  });
}

// Hinweis an den Admin bei neuer Registrierung
async function sendRegistrationNotification({ firstName, lastName, email, company, role }) {
  const to = process.env.NOTIFICATION_EMAIL || 'neusser@phalanx.de';
  return sendMail({
    to,
    subject: `[CapitalMatch] Neue Registrierung: ${firstName} ${lastName}`,
    html: mailShell('Neue Registrierung — Freigabe erforderlich', `
      <p><strong>${firstName} ${lastName}</strong> (${role}) hat sich registriert und wartet auf Freigabe.</p>
      <p>E-Mail: <a href="mailto:${email}">${email}</a><br/>Unternehmen: ${company || '—'}</p>
      <p>Freigabe im Admin-Bereich unter „Nutzer".</p>
    `),
  });
}

module.exports = { sendDownloadNotification, sendMail, sendPasswordResetEmail, sendRegistrationNotification };
