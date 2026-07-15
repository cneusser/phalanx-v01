// ─────────────────────────────────────────────────────────────────────────────
// v0.271: Eingehende Kaufanfragen aus externen Marktplätzen einlesen.
//
// Portale wie die Deutsche Unternehmerbörse (DUB.de) oder nexxt-change schicken
// pro Anfrage eine E-Mail mit Name, Kontaktdaten und einer Referenz auf das
// Inserat. Diese Datei zerlegt so eine E-Mail (weitergeleitet oder per Copy-and-
// paste eingefügt) in ein strukturiertes Lead-Objekt. Reine Funktion, testbar,
// kein DB-Zugriff.
//
// Erkannt werden:
//   · Quelle (Portal) inklusive lesbarer Bezeichnung für die spätere Ansprache
//   · Inserats-/Referenznummer und ein Hinweis auf das Mandat (Codename)
//   · Name (mit Titel), Firma, Investortyp, E-Mail, Telefon, Adresse
// ─────────────────────────────────────────────────────────────────────────────

// Bekannte Portale. label = so nennen wir die Quelle gegenüber dem Angeschriebenen.
const SOURCES = [
  { key: 'dub', label: 'Deutsche Unternehmerbörse (DUB.de)', match: /dub\.de|deutsche unternehmerb/i },
  { key: 'nexxt', label: 'nexxt-change', match: /nexxt-?change/i },
  { key: 'unternehmensboerse', label: 'Unternehmensbörse', match: /unternehmensb(ö|oe)rse/i },
  { key: 'dealcircle', label: 'DealCircle', match: /dealcircle/i },
  { key: 'biz-trade', label: 'biz-trade', match: /biz-?trade/i },
];

const TITLES = ['Prof. Dr.', 'Prof.', 'Dr.', 'Dipl.-Ing.', 'Dipl.-Kfm.', 'Mag.', 'Dr. Dr.'];

const clean = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

// Eine „Label: Wert"-Zeile suchen (robust gegen Doppelpunkt-Varianten und Leerraum)
function field(text, labels) {
  for (const label of labels) {
    // Wert steht auf derselben Zeile. Wichtig: nach dem Doppelpunkt nur Leerzeichen/
    // Tabs zulassen, KEINE Zeilenumbrüche, sonst „schluckt" ein leeres Feld (z. B.
    // „Firma:") den Wert der nächsten Zeile.
    const re = new RegExp(`(?:^|\\n)[ \\t]*${label}[ \\t]*[:：][ \\t]*([^\\n]+)`, 'i');
    const m = text.match(re);
    if (m && clean(m[1])) return clean(m[1]);
  }
  return '';
}

function detectSource(text) {
  for (const s of SOURCES) if (s.match.test(text)) return { key: s.key, label: s.label };
  return { key: 'other', label: 'einen Unternehmens-Marktplatz' };
}

// „Simon Geserer" → { first_name, last_name }; „Dr. Anna Berg" → title erkannt
function splitName(name) {
  let rest = clean(name);
  let title = '';
  for (const t of TITLES) {
    if (rest.toLowerCase().startsWith(t.toLowerCase() + ' ')) { title = t; rest = clean(rest.slice(t.length)); break; }
  }
  const parts = rest.split(' ').filter(Boolean);
  if (!parts.length) return { title, first_name: '', last_name: '' };
  if (parts.length === 1) return { title, first_name: '', last_name: parts[0] };
  return { title, first_name: parts.slice(0, -1).join(' '), last_name: parts[parts.length - 1] };
}

// Salutation aus dem Investortyp/Text lässt sich nicht sicher ableiten → leer lassen.
function parseLead(raw) {
  const text = String(raw || '').replace(/\r\n/g, '\n');
  const source = detectSource(text);

  // E-Mail: bevorzugt aus dem „E-Mail:"-Feld, sonst erste Adresse, die nicht zum Portal gehört
  let email = field(text, ['E-?Mail', 'E-?Mail-Adresse', 'Email']);
  if (!email) {
    const all = (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])
      .filter(e => !/dub\.de|noreply|no-reply|nexxt|unternehmensb/i.test(e));
    email = all[0] || '';
  }
  email = email.toLowerCase();

  const phone = (field(text, ['Telefon', 'Tel', 'Mobil', 'Telefonnummer']) || (text.match(/\+?\d[\d /()-]{6,}\d/) || [''])[0]).trim();
  const company = field(text, ['Firma', 'Unternehmen']);
  const address = field(text, ['Adresse', 'Anschrift']);
  const investorType = field(text, ['Investortyp', 'Investorentyp', 'Typ']);
  const nameRaw = field(text, ['Name', 'Ansprechpartner']);

  // Referenz und Mandats-Hinweis
  const ref = field(text, ['Interne Referenz', 'Referenz', 'Ihre Referenz']);
  const inserat = (text.match(/Inserat(?:\s*Nr\.?)?\s*[:：]?\s*(\d{3,})/i) || [])[1]
    || (field(text, ['Inserat', 'Inseratsnummer', 'Anzeigennummer']).match(/\d{3,}/) || [])[0] || '';
  // Mandats-Codename: aus der internen Referenz die Buchstabenfolge ziehen
  // („5381 Betongold" → „Betongold"), sonst leer.
  const projectHint = ((ref.match(/[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9-]{2,}/g) || [])
    .filter(w => !/^(nr|inserat|referenz|interne)$/i.test(w)).pop()) || '';

  const { title, first_name, last_name } = splitName(nameRaw || (email ? email.split('@')[0] : ''));

  // Menschlich lesbare Herkunft für die spätere Ansprache
  const refBits = [inserat ? `Inserat ${inserat}` : '', ref && ref !== inserat ? `Referenz ${ref}` : '']
    .filter(Boolean).join(', ');
  const provenance = `über ${source.label}${refBits ? ` (${refBits})` : ''}`;

  return {
    source: source.key,
    sourceLabel: source.label,
    provenance,
    inserat, ref,
    projectHint,
    contact: {
      salutation: '', title, first_name, last_name,
      email, phone: clean(phone), company: clean(company),
      location: address, investor_type: investorType,
    },
    // Für den Admin: was wurde erkannt, was fehlt?
    complete: !!(last_name && (email || phone)),
  };
}

module.exports = { parseLead, detectSource, splitName, SOURCES };
