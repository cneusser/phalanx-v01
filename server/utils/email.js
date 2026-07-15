/**
 * CapitalMatch: E-Mail-Benachrichtigungen
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
  console.log(`📥 DOWNLOAD | ${ts} | Dokument: "${documentName}" | Projekt: ${projectName} | Typ: ${levelLabel} | Von: ${user.first_name} ${user.last_name} <${user.email}> | Firma: ${user.company || 'k. A.'} | IP: ${ip}`);

  const subject = `[CapitalMatch] Download: ${documentName}, ${user.first_name} ${user.last_name}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
      <div style="background: #1A4D8A; padding: 20px 24px; border-radius: 6px 6px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 18px;">
          📥 Neuer Dokument-Download
        </h1>
        <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 13px;">
          CapitalMatch: Benachrichtigung
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
            <td style="padding: 8px 0;">${user.company || 'k. A.'}</td>
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

  // Versand über zentralen sendMail (Brevo-API bevorzugt, kein throw, 
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
  // Anhänge (Base64): Brevo erwartet [{ content, name }]
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
// Ausgangsbuch: jede Mail wird protokolliert (Empfänger, Betreff, Art, HTML) und
// im Audit-Trail als MAIL_SENT vermerkt: damit im Admin nachvollziehbar ist,
// welche Art von Mail wann an wen ging. Fehler hierbei dürfen den Versand nie stören.
async function logMail({ to, subject, html, meta = {}, status = 'sent', error = null }) {
  try {
    const db = require('../db/database');
    const id = await db.insert(`
      INSERT INTO email_log (tenant_id, to_email, subject, mail_type, template_key,
                             contact_id, user_id, project_id, body_html, status, error, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [meta.tenantId || 1, String(to || '').slice(0, 200), String(subject || '').slice(0, 300),
       meta.type || 'system', meta.templateKey || null,
       meta.contactId || null, meta.userId || null, meta.projectId || null,
       String(html || '').slice(0, 100000), status, error ? String(error).slice(0, 300) : null,
       meta.actorId || null]);
    db.auditLog(meta.actorId || null, status === 'sent' ? 'MAIL_SENT' : 'MAIL_FAILED', 'email', id,
      `${meta.type || 'system'} · ${String(subject || '').slice(0, 90)} → ${to}`, null);
  } catch { /* Protokoll darf den Versand nie blockieren */ }
}

async function sendMail({ to, subject, html, attachments, meta }) {
  try {
    if (process.env.BREVO_API_KEY) {
      await sendViaBrevoApi({ to, subject, html, attachments });
      console.log(`✉️  E-Mail gesendet (Brevo-API): "${subject}" an ${to}`);
      logMail({ to, subject, html, meta });
      return true;
    }
    const transporter = createTransporter();
    if (!transporter) {
      console.log(`✉️  [Kein BREVO_API_KEY / SMTP nicht konfiguriert] E-Mail NICHT gesendet: "${subject}" an ${to}`);
      logMail({ to, subject, html, meta, status: 'failed', error: 'Kein Mailversand konfiguriert' });
      return false;
    }
    const smtpAttachments = (attachments || []).map(a => ({
      filename: a.filename,
      content: a.encoding === 'base64' ? Buffer.from(a.content, 'base64') : a.content,
      contentType: a.contentType,
    }));
    await transporter.sendMail({ from: `"CapitalMatch Plattform" <${fromAddress()}>`, to, subject, html, attachments: smtpAttachments });
    console.log(`✉️  E-Mail gesendet (SMTP): "${subject}" an ${to}`);
    logMail({ to, subject, html, meta });
    return true;
  } catch (err) {
    console.error('⚠️  E-Mail-Versand fehlgeschlagen:', err.message);
    logMail({ to, subject, html, meta, status: 'failed', error: err.message });
    return false;
  }
}

// Phalanx-Firmendaten (offizieller Briefkopf), auch als Impressum in den Mails.
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

// Anrede bilden. Regel (Wunsch CN, v0.268):
//   · Ist eine Anrede (Herr/Frau) hinterlegt, sprechen wir formell an, mit Titel
//     und Nachnamen: „Sehr geehrter Herr Dr. Meier,".
//   · Fehlt die Anrede, bleibt es beim höflichen „Guten Tag Vorname Nachname,".
//   · Wir bleiben immer beim Sie.
// Akzeptiert sowohl DB-Zeilen (first_name/last_name) als auch camelCase (firstName).
function greetingLine(person = {}) {
  const t = String(person.title || '').trim();
  const first = String(person.first_name ?? person.firstName ?? '').trim();
  const last = String(person.last_name ?? person.lastName ?? '').trim();
  const sal = String(person.salutation || '').trim();
  if (last && sal === 'Herr') return `Sehr geehrter Herr ${[t, last].filter(Boolean).join(' ')},`;
  if (last && sal === 'Frau') return `Sehr geehrte Frau ${[t, last].filter(Boolean).join(' ')},`;
  const name = [first, last].filter(Boolean).join(' ');
  return name ? `Guten Tag ${name},` : 'Guten Tag,';
}

// Reicht die Anrede nicht aus (kein salutation dabei), holen wir sie über die
// E-Mail-Adresse aus der users-Tabelle nach. So sprechen wir auch registrierte
// Nutzer förmlich an, ohne dass jede Aufrufstelle salutation/title mitliefern muss.
// Hat der übergebene person-Datensatz bereits eine Anrede (z. B. CRM-Kontakt),
// bleibt er unverändert.
async function resolvePerson(person, to) {
  if (person && person.salutation) return person;
  try {
    const email = (person && person.email) || to;
    if (!email) return person || {};
    const db = require('../db/database');
    const u = await db.get(
      'SELECT salutation, title, first_name, last_name FROM users WHERE lower(email) = lower(?) LIMIT 1',
      [String(email)]);
    if (u && (u.salutation || u.last_name)) {
      return {
        first_name: (person && person.first_name) || u.first_name,
        last_name: (person && person.last_name) || u.last_name,
        salutation: u.salutation || (person && person.salutation) || null,
        title: u.title || (person && person.title) || null,
      };
    }
  } catch { /* Nachschlagen darf den Versand nie stören */ }
  return person || {};
}

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
      <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">CapitalMatch, der Marktplatz für Unternehmenstransaktionen</div>
      <div style="font-size: 12.5px; color: rgba(255,255,255,0.85); line-height: 1.6;">Kauf, Verkauf, Nachfolge, Wachstumsfinanzierung. Diskret, strukturiert und persönlich begleitet von der Phalanx GmbH. Rufen Sie an, wenn Sie ein Vorhaben besprechen möchten.</div>
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
async function sendPasswordResetEmail({ to, firstName, person, resetUrl, expires }) {
  const greet = greetingLine(await resolvePerson(person || { first_name: firstName }, to));
  return sendMail({
    to,
    subject: '[CapitalMatch] Passwort zurücksetzen',
    html: mailShell('Passwort zurücksetzen', `
      <p>${greet}</p>
      <p>jemand hat für Ihr CapitalMatch-Konto ein neues Passwort angefordert. Über den Button vergeben Sie es:</p>
      ${ctaButton('Neues Passwort vergeben', resetUrl)}
      <p style="font-size:12px;color:#888;">Der Link gilt bis ${new Date(expires).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}. Waren Sie das nicht, ignorieren Sie diese Mail einfach. Ihr Passwort bleibt dann unverändert.</p>
    `, { promo: false }),
  });
}

// E-Mail-Verifizierung: Link zum Abschluss der Registrierung
async function sendEmailVerification({ to, firstName, person, verifyUrl }) {
  const greet = greetingLine(await resolvePerson(person || { first_name: firstName }, to));
  return sendMail({
    to,
    subject: '[CapitalMatch] Bitte bestätigen Sie Ihre E-Mail-Adresse',
    html: mailShell('E-Mail-Adresse bestätigen', `
      <p>${greet}</p>
      <p>willkommen bei CapitalMatch. Ein Klick fehlt noch: Bestätigen Sie Ihre Adresse, danach prüfen wir Ihren Zugang und schalten ihn frei.</p>
      ${ctaButton('E-Mail-Adresse bestätigen', verifyUrl)}
      <p style="font-size:12px;color:#888;">Der Link gilt 48 Stunden. Haben Sie sich nicht registriert, ignorieren Sie diese Mail einfach.</p>
    `),
  });
}

// Bestätigung an den Nutzer direkt nach der Registrierung
async function sendRegistrationConfirmationEmail({ to, firstName, person }) {
  const greet = greetingLine(await resolvePerson(person || { first_name: firstName }, to));
  return sendMail({
    to,
    subject: '[CapitalMatch] Ihre Registrierung ist eingegangen',
    html: mailShell('Registrierung eingegangen', `
      <p>${greet}</p>
      <p>danke für Ihre Registrierung. Wir sehen uns Ihr Konto jetzt an und melden uns, sobald der Zugang freigeschaltet ist. In der Regel dauert das keinen ganzen Werktag.</p>
      <p style="font-size:12px;color:#888;">Datenschutz: Bei der Registrierung haben Sie eingewilligt, dass wir Ihre Angaben für die Verwaltung Ihres Zugangs und für die projektbezogene Ansprache speichern. Diese Einwilligung können Sie jederzeit widerrufen und Ihre Daten löschen lassen (datenschutz@phalanx.de). Einzelheiten stehen in unserer Datenschutzerklärung.</p>
    `),
  });
}

// Freischaltungs-Info an den Nutzer nach Admin-Approval
async function sendAccountApprovedEmail({ to, firstName, person }) {
  const loginUrl = `${process.env.FRONTEND_URL || 'https://www.capitalmatch.de'}/login`;
  const greet = greetingLine(await resolvePerson(person || { first_name: firstName }, to));
  return sendMail({
    to,
    subject: '[CapitalMatch] Ihr Zugang ist freigeschaltet',
    html: mailShell('Zugang freigeschaltet', `
      <p>${greet}</p>
      <p>Ihr Konto ist geprüft und offen. Ab sofort sehen Sie die Mandate, fordern NDAs an und rufen Unterlagen ab.</p>
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
    html: mailShell('Neue Registrierung: Freigabe erforderlich', `
      <p><strong>${firstName} ${lastName}</strong> (${role}) hat sich registriert und wartet auf Freigabe.</p>
      <p>E-Mail: <a href="mailto:${email}">${email}</a><br/>Unternehmen: ${company || 'k. A.'}</p>
      <p>Freigabe im Admin-Bereich unter „Nutzer".</p>
    `),
  });
}

// Generische Prozess-Benachrichtigung an den Investor (jeder Funnel-Schritt)
async function sendProcessUpdateEmail({ to, firstName, person, title, message, ctaLabel, ctaPath, meta }) {
  const url = `${process.env.FRONTEND_URL || 'https://www.capitalmatch.de'}${ctaPath || ''}`;
  const greet = greetingLine(await resolvePerson(person || { first_name: firstName }, to));
  return sendMail({
    to,
    subject: `[CapitalMatch] ${title}`,
    meta: { type: 'process', ...(meta || {}) },
    html: mailShell(title, `
      <p>${greet}</p>
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
// Daten, Widerspruchsmöglichkeit). Bewusst ohne Werbeblock, eine Erstansprache
// im M&A-Kontext ist eine geschäftliche Mitteilung, keine Kampagnen-Werbung.
async function sendCampaignEmail({ to, subject, title, salutation, bodyHtml, ctaLabel, ctaPath, secondaryHtml, signatureHtml, legalHtml, meta }) {
  const base = process.env.FRONTEND_URL || 'https://www.capitalmatch.de';
  const url = ctaPath ? `${base}${ctaPath}` : null;
  return sendMail({
    to,
    subject,
    meta: { type: 'campaign', ...(meta || {}) },
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
  logMail,
  greetingLine,
  resolvePerson,
  sendCampaignEmail,
  sendMail,
  sendPasswordResetEmail,
  sendRegistrationNotification,
  sendRegistrationConfirmationEmail,
  sendAccountApprovedEmail,
  sendProcessUpdateEmail,
  sendEmailVerification,
};
