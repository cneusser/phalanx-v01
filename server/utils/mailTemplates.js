// ─────────────────────────────────────────────────────────────────────────────
// Sprint 22: Prozess-Mailvorlagen: Platzhalter füllen, Text zu HTML rendern,
// CTA-Ziel auflösen. Reine Funktionen, damit sie testbar bleiben.
// ─────────────────────────────────────────────────────────────────────────────
const { salutationFor, signatureFor, factsTable } = require('./campaigns');

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Im Admin sichtbare Platzhalter-Hilfe
const PLACEHOLDERS = [
  ['{{anrede}}', 'Vollständige Anrede, z. B. „Sehr geehrter Herr Dr. Meier,"'],
  ['{{vorname}}', 'Vorname des Kontakts'],
  ['{{nachname}}', 'Nachname des Kontakts'],
  ['{{unternehmen}}', 'Unternehmen des Kontakts'],
  ['{{position}}', 'Verantwortung / Position'],
  ['{{mandat}}', 'Codename des Mandats, z. B. FARADAY'],
  ['{{branche}}', 'Branche des Mandats'],
  ['{{region}}', 'Region des Mandats'],
  ['{{umsatz}}', 'Umsatzband des Mandats'],
  ['{{ebitda}}', 'EBITDA-Band des Mandats'],
  ['{{transaktionsart}}', 'Deal-Typ, z. B. Nachfolge'],
  ['{{berater}}', 'Ihr Name (Absender)'],
  ['{{berater_mail}}', 'Ihre E-Mail-Adresse'],
  ['{{frist}}', 'Frist / Datum: vor dem Versand eingebbar'],
  ['{{datum}}', 'Heutiges Datum'],
  ['{{herkunft}}', 'Woher der Kontakt stammt, z. B. „über die Deutsche Unternehmerbörse (DUB.de), Inserat 17392" (leer, wenn unbekannt)'],
  ['{{warum}}', 'Individuelle Begründung je Empfänger: warum passt genau dieses Mandat zu ihm? Vor dem Versand je Kontakt eingebbar'],
];

// Fertiger Herkunftssatz für die Ansprache eines eingelesenen Marktplatz-Leads.
function herkunftSatz(contact = {}) {
  if (!contact.lead_source) return '';
  const ref = contact.lead_ref ? ` (${contact.lead_ref})` : '';
  return `Ihre Anfrage haben wir über ${contact.lead_source}${ref} erhalten.`;
}

const CTA_TARGETS = ['project', 'consent', 'profile', 'none'];

function buildContext({ contact = {}, project = {}, inviter = {}, frist = '', warum = '' }) {
  const d = new Date();
  return {
    anrede: salutationFor(contact),
    vorname: contact.first_name || '',
    nachname: contact.last_name || '',
    unternehmen: contact.company_name || contact.companies || '',
    position: contact.responsibility || '',
    mandat: project.codename || '',
    branche: project.industry || '',
    region: project.region || '',
    umsatz: project.revenue_band && project.revenue_band !== 'k. A.' ? project.revenue_band : 'auf Anfrage',
    ebitda: project.ebitda_band && project.ebitda_band !== 'k. A.' ? project.ebitda_band : 'auf Anfrage',
    transaktionsart: project.deal_type || '',
    berater: [inviter.title, inviter.first_name, inviter.last_name].filter(Boolean).join(' ') || 'Christian Neusser',
    berater_mail: inviter.email || 'neusser@phalanx.de',
    berater_tel: '+49 9131-9 20 60 75',
    frist: frist || 'k. A.',
    datum: d.toLocaleDateString('de-DE'),
    herkunft: herkunftSatz(contact),
    // Individuelle Begründung je Empfänger (Mailmerge), vor dem Versand eingebbar
    warum: warum || '',
  };
}

// {{platzhalter}} ersetzen; unbekannte Platzhalter werden entfernt (kein „{{x}}" in der Mail)
function render(text, ctx) {
  return String(text || '').replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, k) => {
    const v = ctx[String(k).toLowerCase()];
    return v == null ? '' : String(v);
  });
}

// Fließtext (Absätze durch Leerzeile) → HTML-Absätze
function bodyToHtml(text) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map(p => `<p style="font-size:13.5px;line-height:1.65;color:#333;">${esc(p.trim()).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

function ctaPathFor(target, { project, inviteToken, profileToken }) {
  if (target === 'consent' && inviteToken) return `/einwilligung?token=${inviteToken}`;
  if (target === 'profile' && profileToken) return `/profil-pflege?token=${profileToken}`;
  if (target === 'project' && project?.id) return `/projekte/${project.id}`;
  // Fallback: lieber auf das Mandat als ins Leere
  return project?.id ? `/projekte/${project.id}` : null;
}

// Fertige Mail aus einer Vorlage bauen (für Versand UND Vorschau identisch)
function buildFromTemplate({ template, contact, project, inviter, inviteToken, profileToken, frist, warum, overrideSubject, overrideBody, withFacts = true }) {
  const ctx = buildContext({ contact, project, inviter, frist, warum });
  const subject = render(overrideSubject || template.subject, ctx);
  const bodyText = render(overrideBody || template.body, ctx);
  const target = CTA_TARGETS.includes(template.cta_target) ? template.cta_target : 'project';
  const ctaPath = target === 'none' ? null : ctaPathFor(target, { project, inviteToken, profileToken });

  // Herkunft automatisch voranstellen, wenn der Kontakt aus einem Marktplatz kam
  // und die Vorlage sie nicht selbst über {{herkunft}} platziert.
  const provenance = ctx.herkunft && !/\{\{\s*herkunft\s*\}\}/i.test(overrideBody || template.body)
    ? `<p style="font-size:13.5px;line-height:1.65;color:#333;">${ctx.herkunft}</p>`
    : '';

  return {
    to: contact.email,
    subject,
    title: render(template.name, ctx),
    salutation: ctx.anrede,
    bodyHtml: provenance + bodyToHtml(bodyText) + (withFacts ? factsTable(project) : ''),
    ctaLabel: ctaPath ? (render(template.cta_label, ctx) || 'Mandat ansehen') : null,
    ctaPath,
    signatureHtml: signatureFor(inviter),
    legalHtml:
      'Wir schreiben Sie im Rahmen eines laufenden M&amp;A-Prozesses an, an dem Sie als Interessent beteiligt sind ' +
      '(Art. 6 Abs. 1 lit. f DSGVO). Sie können der weiteren Ansprache jederzeit widersprechen, eine formlose Antwort ' +
      'auf diese E-Mail genügt.',
    // für die Vorschau im Admin/Funnel
    previewText: bodyText,
  };
}

module.exports = { PLACEHOLDERS, CTA_TARGETS, buildContext, render, bodyToHtml, ctaPathFor, buildFromTemplate };
