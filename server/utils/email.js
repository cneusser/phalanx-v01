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

  // Versand über zentralen sendMail (Brevo-API bevorzugt, kein throw —
  // Download bleibt auch bei Mail-Fehler erfolgreich)
  await sendMail({ to, subject, html });
}

// Absenderadresse: MAIL_FROM (z. B. bei Brevo/Versanddiensten nötig, wo der
// SMTP-Login von der Absenderadresse abweicht), Fallback: SMTP_USER
const fromAddress = () => process.env.MAIL_FROM || process.env.SMTP_USER;

// ── Versand via Brevo-HTTPS-API (Port 443) ──────────────────────────────────
// Railway blockiert ausgehende SMTP-Ports (25/465/587) auf Free/Hobby-Plänen.
// Deshalb bevorzugt die Plattform die Brevo-REST-API, wenn BREVO_API_KEY
// gesetzt ist. SMTP bleibt als Fallback (lokal / Pro-Plan) erhalten.
async function sendViaBrevoApi({ to, subject, html, attachments }) {
  const payload = {
    sender: { name: 'CapitalMatch Plattform', email: fromAddress() },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };
  // Anhänge (Base64) — Brevo erwartet [{ content, name }]
  if (attachments && attachments.length) {
    payload.attachment = attachments.map(a => ({
      content: a.encoding === 'base64' ? a.content : Buffer.from(a.content).toString('base64'),
      name: a.filename,
    }));
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Brevo API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

// ── Generischer Versand (Brevo-API bevorzugt, sonst SMTP) ───────────────────
// Optional: attachments [{ filename, content, encoding, contentType }]
async function sendMail({ to, subject, html, attachments }) {
  try {
    if (process.env.BREVO_API_KEY) {
      await sendViaBrevoApi({ to, subject, html, attachments });
      console.log(`✉️  E-Mail gesendet (Brevo-API): "${subject}" an ${to}`);
      return true;
    }
    const transporter = createTransporter();
    if (!transporter) {
      console.log(`✉️  [Kein BREVO_API_KEY / SMTP nicht konfiguriert] E-Mail NICHT gesendet: "${subject}" an ${to}`);
      return false;
    }
    const smtpAttachments = (attachments || []).map(a => ({
      filename: a.filename,
      content: a.encoding === 'base64' ? Buffer.from(a.content, 'base64') : a.content,
      contentType: a.contentType,
    }));
    await transporter.sendMail({ from: `"CapitalMatch Plattform" <${fromAddress()}>`, to, subject, html, attachments: smtpAttachments });
    console.log(`✉️  E-Mail gesendet (SMTP): "${subject}" an ${to}`);
    return true;
  } catch (err) {
    console.error('⚠️  E-Mail-Versand fehlgeschlagen:', err.message);
    return false;
  }
}

// Phalanx-Firmendaten (offizieller Briefkopf) — auch als Impressum in den Mails.
const PHALANX_IMPRINT = {
  tagline: 'Werte sichern. Wachstum finanzieren. Weitblick etablieren.',
  name: 'Phalanx GmbH',
  street: 'Helene-Lange-Straße 28',
  city: 'D-91056 Erlangen',
  tel: '+49 9131-9 20 60 75',
  email: 'info@phalanx.de',
  web: 'www.phalanx.de',
  ceo: 'Geschäftsführer: Christian Neusser',
  court: 'Registergericht Fürth HRB 14306',
  vat: 'USt-IdNr. DE 273 832 962',
};

// Werblicher CTA-Button (optional)
const ctaButton = (label, url) => label && url ? `
  <p style="text-align:center; margin: 26px 0 6px;">
    <a href="${url}" style="background:#0D2A4A;color:#fff;padding:13px 30px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">${label}</a>
  </p>` : '';

// Zentrales Mail-Layout: Phalanx-Header, Fließtext, werblicher Abbinder + Impressum-Footer.
const mailShell = (title, bodyHtml, opts = {}) => {
  const p = PHALANX_IMPRINT;
  const promo = opts.promo !== false ? `
    <div style="margin-top: 26px; padding: 16px 18px; background: #0D2A4A; border-radius: 8px; color: #fff;">
      <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">CapitalMatch — Ihr digitaler Marktplatz für Unternehmenstransaktionen</div>
      <div style="font-size: 12.5px; color: rgba(255,255,255,0.85); line-height: 1.6;">Kauf, Verkauf, Nachfolge und Wachstumsfinanzierung — diskret, strukturiert und persönlich begleitet von der Phalanx GmbH. Sprechen Sie uns an, wir stehen Ihnen zur Verfügung.</div>
    </div>` : '';
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 620px; margin: 0 auto; color: #1a1a1a;">
    <div style="background: #0D2A4A; padding: 22px 26px; border-radius: 8px 8px 0 0;">
      <div style="color: #fff; font-size: 20px; font-weight: 800; letter-spacing: -0.01em;">CapitalMatch</div>
      <div style="color: #8AB4D4; margin: 2px 0 0; font-size: 12px;">eine Marke der Phalanx GmbH · ${p.tagline}</div>
    </div>
    <div style="background: #fff; padding: 26px; border: 1px solid #DDE8F3; border-top: none; font-size: 14px; line-height: 1.65;">
      <h1 style="color: #0D2A4A; margin: 0 0 14px; font-size: 17px;">${title}</h1>
      ${bodyHtml}
      ${promo}
    </div>
    <div style="background: #F4F8FC; padding: 16px 26px; border: 1px solid #DDE8F3; border-top: none; border-radius: 0 0 8px 8px; font-size: 11px; color: #6B6B6B; line-height: 1.7;">
      <div style="color:#5B8FC9; font-weight:700; margin-bottom:6px;">${p.tagline} &nbsp;·&nbsp; <a href="https://${p.web}" style="color:#5B8FC9; text-decoration:none;">${p.web}</a></div>
      <strong style="color:#0D2A4A;">${p.name}</strong> · ${p.street} · ${p.city}<br/>
      Tel ${p.tel} · <a href="mailto:${p.email}" style="color:#6B6B6B;">${p.email}</a> · ${p.ceo} · ${p.court} · ${p.vat}
    </div>
  </div>`;
};

// Passwort-Reset-Link an den Nutzer
async function sendPasswordResetEmail({ to, firstName, resetUrl, expires }) {
  return sendMail({
    to,
    subject: '[CapitalMatch] Passwort zurücksetzen',
    html: mailShell('Passwort zurücksetzen', `
      <p>Hallo ${firstName || ''},</p>
      <p>für Ihr CapitalMatch-Konto wurde ein Passwort-Reset angefordert. Klicken Sie auf den folgenden Button, um ein neues Passwort zu vergeben:</p>
      ${ctaButton('Neues Passwort vergeben', resetUrl)}
      <p style="font-size:12px;color:#888;">Der Link ist gültig bis ${new Date(expires).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}. Falls Sie den Reset nicht angefordert haben, ignorieren Sie diese E-Mail.</p>
    `, { promo: false }),
  });
}

// E-Mail-Verifizierung: Link zum Abschluss der Registrierung
async function sendEmailVerification({ to, firstName, verifyUrl }) {
  return sendMail({
    to,
    subject: '[CapitalMatch] Bitte bestätigen Sie Ihre E-Mail-Adresse',
    html: mailShell('E-Mail-Adresse bestätigen', `
      <p>Hallo ${firstName || ''},</p>
      <p>willkommen bei CapitalMatch! Bitte bestätigen Sie Ihre E-Mail-Adresse, um Ihre Registrierung abzuschließen. Erst danach wird Ihr Zugang geprüft und freigeschaltet.</p>
      ${ctaButton('E-Mail-Adresse bestätigen', verifyUrl)}
      <p style="font-size:12px;color:#888;">Der Link ist 48 Stunden gültig. Falls Sie sich nicht registriert haben, ignorieren Sie diese E-Mail einfach.</p>
    `),
  });
}

// Bestätigung an den Nutzer direkt nach der Registrierung
async function sendRegistrationConfirmationEmail({ to, firstName }) {
  return sendMail({
    to,
    subject: '[CapitalMatch] Ihre Registrierung ist eingegangen',
    html: mailShell('Registrierung eingegangen', `
      <p>Hallo ${firstName || ''},</p>
      <p>vielen Dank für Ihre Registrierung auf der CapitalMatch-Plattform. Ihr Konto wird nun von unserem Team geprüft — Sie erhalten eine weitere E-Mail, sobald Ihr Zugang freigeschaltet ist. Das dauert in der Regel weniger als einen Werktag.</p>
      <p style="font-size:12px;color:#888;">Hinweis zum Datenschutz: Sie haben bei der Registrierung eingewilligt, dass wir Ihre Angaben zur Verwaltung Ihres Zugangs und zur projektbezogenen Ansprache speichern und nutzen. Sie können diese Einwilligung jederzeit widerrufen und die Löschung Ihrer Daten verlangen (datenschutz@phalanx.de). Details in unserer Datenschutzerklärung.</p>
    `),
  });
}

// Freischaltungs-Info an den Nutzer nach Admin-Approval
async function sendAccountApprovedEmail({ to, firstName }) {
  const loginUrl = `${process.env.FRONTEND_URL || 'https://www.capitalmatch.de'}/login`;
  return sendMail({
    to,
    subject: '[CapitalMatch] Ihr Zugang ist freigeschaltet',
    html: mailShell('Zugang freigeschaltet', `
      <p>Hallo ${firstName || ''},</p>
      <p>gute Nachrichten: Ihr CapitalMatch-Konto wurde geprüft und freigeschaltet. Sie können sich ab sofort anmelden und Mandate einsehen, NDAs anfordern und Unterlagen abrufen.</p>
      <p style="text-align:center; margin: 24px 0;">
        <a href="${loginUrl}" style="background:#1A4D8A;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">Jetzt anmelden</a>
      </p>
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

// Generische Prozess-Benachrichtigung an den Investor (jeder Funnel-Schritt)
async function sendProcessUpdateEmail({ to, firstName, title, message, ctaLabel, ctaPath }) {
  const url = `${process.env.FRONTEND_URL || 'https://www.capitalmatch.de'}${ctaPath || ''}`;
  return sendMail({
    to,
    subject: `[CapitalMatch] ${title}`,
    html: mailShell(title, `
      <p>Hallo ${firstName || ''},</p>
      <p>${message}</p>
      ${ctaLabel ? `<p style="text-align:center; margin: 24px 0;">
        <a href="${url}" style="background:#1A4D8A;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">${ctaLabel}</a>
      </p>` : ''}
      <p style="font-size:12px;color:#888;">Diese Nachricht wurde automatisch von der CapitalMatch-Plattform gesendet.</p>
    `),
  });
}

// ── CRM-Kampagnen-Mail (M&A-Ansprache) ──────────────────────────────────────
// Vollständige Anrede, sachlicher Fließtext, ein klarer Haupt-CTA, optionaler
// Sekundär-Link, Beraterunterschrift und ein rechtlicher Abbinder (Herkunft der
// Daten, Widerspruchsmöglichkeit). Bewusst ohne Werbeblock — eine Erstansprache
// im M&A-Kontext ist eine geschäftliche Mitteilung, keine Kampagnen-Werbung.
async function sendCampaignEmail({ to, subject, title, salutation, bodyHtml, ctaLabel, ctaPath, secondaryHtml, signatureHtml, legalHtml }) {
  const base = process.env.FRONTEND_URL || 'https://www.capitalmatch.de';
  const url = ctaPath ? `${base}${ctaPath}` : null;
  return sendMail({
    to,
    subject,
    html: mailShell(title, `
      <p style="margin:0 0 14px;">${salutation || 'Guten Tag,'}</p>
      ${bodyHtml}
      ${ctaLabel && url ? `<p style="text-align:center; margin: 26px 0 10px;">
        <a href="${url}" style="background:#0D2A4A;color:#fff;padding:13px 30px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">${ctaLabel}</a>
      </p>` : ''}
      ${secondaryHtml ? `<p style="text-align:center;margin:0 0 18px;font-size:12.5px;color:#5B8FC9;">${secondaryHtml}</p>` : ''}
      ${signatureHtml ? `<div style="margin-top:22px;padding-top:14px;border-top:1px solid #E6EDF5;font-size:13.5px;color:#333;">${signatureHtml}</div>` : ''}
      ${legalHtml ? `<div style="margin-top:16px;font-size:11.5px;color:#8A8A8A;line-height:1.6;">${legalHtml}</div>` : ''}
    `, { promo: false }),
  });
}

module.exports = {
  sendDownloadNotification,
  sendCampaignEmail,
  sendMail,
  sendPasswordResetEmail,
  sendRegistrationNotification,
  sendRegistrationConfirmationEmail,
  sendAccountApprovedEmail,
  sendProcessUpdateEmail,
  sendEmailVerification,
};
