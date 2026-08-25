// ─────────────────────────────────────────────────────────────────────────────
// Newsletter / Rundmail über ALLE aktuellen Mandate (mandatsübergreifend).
//
// Zwei Zielgruppen (DSGVO-Leitplanken wie in campaigns.js):
//   • 'consented'  : nur eingewilligte Kontakte (consent_status = 'opt_in').
//                    CTA führt in den Marktplatz.
//   • 'reconsent'  : alle aktiven Kontakte ohne Widerspruch. Bitte um (erneute)
//                    Bestätigung des Zugangs, CTA führt auf die Einwilligungsseite
//                    mit persönlichem Token (Double-Opt-in).
// Nie an consent_status = 'opt_out' oder contact_status = 'do_not_contact'.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db/database');
const { salutationFor, signatureFor } = require('./campaigns');

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const AUDIENCES = ['consented', 'reconsent'];

// Aktive, im Marktplatz sichtbare Mandate (nicht invite_only, kein Entwurf).
async function activeMandates() {
  return db.all(`
    SELECT id, codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, sector_emoji
    FROM projects
    WHERE status = 'active' AND COALESCE(visibility, 'public') <> 'invite_only'
    ORDER BY created_at DESC`).catch(() => []);
}

// Empfänger je Zielgruppe. Widerspruch wird immer ausgeschlossen.
function recipientWhere(audience) {
  if (audience === 'consented') {
    return `email IS NOT NULL AND consent_status = 'opt_in' AND COALESCE(contact_status,'') <> 'do_not_contact'`;
  }
  // reconsent: alle ohne ausdrücklichen Widerspruch (unknown + opt_in)
  return `email IS NOT NULL AND COALESCE(consent_status,'unknown') <> 'opt_out' AND COALESCE(contact_status,'') <> 'do_not_contact'`;
}

const trunc = (s, n) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
};

// Ein Mandat als Karte (nichts, was das Unternehmen identifiziert).
function mandateCard(m) {
  const facts = [m.industry, m.region,
    m.revenue_band && m.revenue_band !== 'k. A.' ? `Umsatz ${m.revenue_band}` : null,
    m.deal_type].filter(Boolean).join(' · ');
  return `<table style="width:100%;border-collapse:collapse;margin:10px 0;background:#F7FAFD;border:1px solid #E1EAF3;border-radius:8px;">
    <tr>
      <td style="padding:12px 14px;vertical-align:top;font-size:20px;width:34px;">${esc(m.sector_emoji || '•')}</td>
      <td style="padding:12px 14px 12px 0;">
        <div style="font-size:14px;font-weight:700;color:#0D2A4A;">${esc(m.codename)}</div>
        <div style="font-size:12px;color:#6B7C8F;margin:2px 0 6px;">${esc(facts)}</div>
        <div style="font-size:13px;line-height:1.55;color:#333;">${esc(trunc(m.short_description, 210))}</div>
      </td>
    </tr>
  </table>`;
}

function legalFor(audience, profileToken) {
  const base = process.env.FRONTEND_URL || 'https://www.capitalmatch.de';
  const link = profileToken
    ? ` Ihre gespeicherten Angaben können Sie jederzeit <a href="${base}/profil-pflege?token=${profileToken}" style="color:#8A8A8A;">einsehen, korrigieren oder löschen lassen</a>.`
    : '';
  if (audience === 'reconsent') {
    return `Sie erhalten diese Nachricht, weil Sie im Rahmen unserer M&amp;A-Tätigkeit als möglicher Interessent geführt werden ` +
      `(Art. 6 Abs. 1 lit. f DSGVO). Ohne Ihre ausdrückliche Bestätigung legen wir kein Konto an und senden keine Unterlagen. ` +
      `Sie können der Ansprache jederzeit widersprechen, eine formlose Antwort auf diese E-Mail genügt.${link}`;
  }
  return `Sie erhalten diese Nachricht als eingewilligter Kontakt von CapitalMatch (Phalanx GmbH). ` +
    `Sie können der weiteren Ansprache jederzeit widersprechen, eine formlose Antwort auf diese E-Mail genügt.${link}`;
}

// Baut die fertige Newsletter-Mail für einen Kontakt.
function buildNewsletterMail({ contact, mandates, inviter, audience, subject, introText, consentToken, profileToken }) {
  const cards = (mandates || []).map(mandateCard).join('');
  const introHtml = String(introText || '')
    .split(/\n\s*\n/)
    .map(p => `<p style="font-size:13.5px;line-height:1.65;color:#333;">${esc(p.trim()).replace(/\n/g, '<br/>')}</p>`)
    .join('');

  const base = process.env.FRONTEND_URL || 'https://www.capitalmatch.de';
  const isReconsent = audience === 'reconsent';

  const consentBlock = isReconsent ? `
    <div style="margin-top:14px;padding:12px 16px;background:#F4F8FC;border-left:3px solid #5B8FC9;font-size:12.5px;color:#44546A;line-height:1.6;">
      <strong style="color:#0D2A4A;">Ihre Bestätigung (DSGVO):</strong> Mit dem Button bestätigen Sie Ihren Zugang und Ihre Einwilligung.
      Erst danach ist Ihr Konto aktiv. Zurücknehmen können Sie die Einwilligung jederzeit, mit Wirkung für die Zukunft.
    </div>` : '';

  const ctaLabel = isReconsent ? 'Zugang bestätigen und Registrierung abschließen' : 'Alle Mandate im Marktplatz ansehen';
  const ctaPath = isReconsent
    ? (consentToken ? `/einwilligung?token=${consentToken}` : `/registrieren`)
    : `/projekte`;

  const secondary = profileToken
    ? `<a href="${base}/profil-pflege?token=${profileToken}" style="color:#5B8FC9;">Suchprofil und Kontaktdaten pflegen</a>. Dann treffen unsere Hinweise künftig genauer.`
    : null;

  const title = subject || (isReconsent ? 'Bitte bestätigen Sie kurz Ihren Zugang' : 'Aktuelle Mandate im Überblick');

  return {
    to: contact.email,
    subject: subject || (isReconsent ? '[CapitalMatch] Bitte bestätigen Sie kurz Ihren Zugang' : '[CapitalMatch] Aktuelle Mandate im Überblick'),
    title,
    salutation: salutationFor(contact),
    bodyHtml: `${introHtml}
      <p style="margin:16px 0 4px;font-weight:700;color:#0D2A4A;font-size:13.5px;">Aktuelle Mandate</p>
      ${cards || '<p style="font-size:13px;color:#6B7C8F;">Zurzeit sind keine Mandate im offenen Marktplatz sichtbar.</p>'}
      ${consentBlock}`,
    ctaLabel,
    ctaPath,
    secondaryHtml: secondary,
    signatureHtml: signatureFor(inviter),
    legalHtml: legalFor(audience, profileToken),
  };
}

// Standardtexte, falls keine (editierbare) Vorlage in der DB liegt.
const DEFAULTS = {
  consented: {
    subject: '[CapitalMatch] Aktuelle Mandate im Überblick',
    intro:
      'auf CapitalMatch sind in den vergangenen Wochen mehrere Mandate dazugekommen. ' +
      'Weil Sie eingewilligt und freigeschaltet sind, bekommen Sie den Überblick aus erster Hand.\n\n' +
      'Passt eines der Mandate in Ihr Suchraster, sehen Sie sich das anonyme Kurzprofil an und fordern Sie mit einem Klick die vertraulichen Unterlagen an.',
  },
  reconsent: {
    subject: '[CapitalMatch] Bitte bestätigen Sie kurz Ihren Zugang',
    intro:
      'wir haben CapitalMatch, unsere Plattform für Unternehmensnachfolge und M&A, technisch erneuert und die Sicherheit erhöht. ' +
      'Damit Sie weiterhin Mandate sehen und Unterlagen anfordern können, bitten wir Sie um eine kurze Bestätigung Ihres Zugangs. Das dauert eine Minute.\n\n' +
      'Ein Auszug, was aktuell auf der Plattform liegt:',
  },
};

module.exports = { AUDIENCES, activeMandates, recipientWhere, buildNewsletterMail, DEFAULTS, mandateCard };
