// ─────────────────────────────────────────────────────────────────────────────
// Aus dem Fliesstext Suchkriterien machen (v0.469)
//
// Der Abgleich im Deal-Funnel vergleicht `focus_industries`, `focus_regions`
// und die Ticketspanne eines Kontakts mit dem Mandat. Recherchierte Kontakte
// tragen davon nichts. Sie tragen einen Satz wie „Bau, Infrastruktur,
// Immobilien, Technologie", und der Abgleich sieht ihn nicht an. Damit greift
// er bei genau den Kontakten nicht, für die er gedacht war.
//
// Diese Datei übersetzt den Satz in Codes der Taxonomie. Drei Regeln:
//
//   1. Nichts raten. Was sich nicht eindeutig zuordnen lässt, wird gemeldet
//      und bleibt stehen. „Immobilien" hat in unserer Branchenliste keine
//      Entsprechung, also wird daraus auch keine erfunden.
//   2. Nichts überschreiben. Wer schon Kriterien gepflegt hat, behält sie.
//      Die Ableitung füllt nur Leerstellen.
//   3. Ein leeres Ergebnis ist ein Ergebnis. Wenn aus dem Text nichts folgt,
//      wird nichts gesetzt, und das steht im Bericht.
//
// Reine Funktionen, kein Datenbankzugriff, deshalb prüfbar.
// ─────────────────────────────────────────────────────────────────────────────

const TAX = require('../../shared/taxonomie.json');

function normal(text) {
  return String(text == null ? '' : text)
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Zusätzliche Wörter, die im Fliesstext vorkommen und eindeutig auf einen Code
// zeigen. Bewusst knapp gehalten: Jede Zeile hier ist eine Behauptung, die
// jemand verantworten muss. Was fehlt, landet unter „unklar", und das ist der
// gewollte Ausgang, nicht der Notausgang.
const ZUSATZ = {
  bau: ['bau', 'construction', 'baustoffe', 'building materials'],
  maschinenbau: ['industrie', 'industrial', 'industrials', 'manufacturing', 'maschinenbau', 'engineering', 'produktion'],
  automotive: ['automotive', 'mobilitaet', 'mobility'],
  handel: ['handel', 'konsum', 'konsumgueter', 'consumer', 'retail', 'e commerce'],
  it: ['technologie', 'technology', 'tech', 'software', 'it', 'digital', 'internet', 'saas'],
  gesundheit: ['gesundheit', 'health', 'healthcare', 'life sciences', 'pharma', 'medizin', 'medtech'],
  chemie: ['chemie', 'chemicals', 'chemical'],
  lebensmittel: ['lebensmittel', 'food', 'agrar', 'agtech', 'agriculture', 'getraenke', 'beverages'],
  dienstleistung: ['dienstleistung', 'services', 'business services', 'beratung'],
  energie: ['energie', 'energy', 'erneuerbare', 'renewables', 'cleantech'],
  logistik: ['logistik', 'logistics', 'transport', 'shipping'],
  medien: ['medien', 'media', 'verlag', 'publishing'],
  finanzen: ['finanzen', 'financial services', 'finanzdienstleistungen', 'versicherung', 'insurance', 'banking', 'fintech'],
};

function tabelle(liste) {
  const m = new Map();
  for (const e of liste) {
    for (const s of [e.wert, e.de, e.en, ...(e.synonyme || [])]) {
      const n = normal(s);
      if (n) m.set(n, e.wert);
    }
  }
  return m;
}
const BRANCHE = tabelle(TAX.branchen);
const REGION = tabelle(TAX.regionen);
for (const [code, woerter] of Object.entries(ZUSATZ)) {
  for (const w of woerter) if (!BRANCHE.has(normal(w))) BRANCHE.set(normal(w), code);
}

/** Den Fliesstext in Bruchstücke zerlegen, so wie Menschen ihn schreiben. */
function bruchstuecke(text) {
  return String(text || '')
    .split(/[,;/|]|\bund\b|\band\b|\bsowie\b|\bbzw\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Aus einem Fliesstext Branchen und Regionen ableiten.
 *
 * @returns {{branchen: string[], regionen: string[], unklar: string[]}}
 */
function ableiten(text) {
  const branchen = new Set();
  const regionen = new Set();
  const unklar = [];
  for (const roh of bruchstuecke(text)) {
    const n = normal(roh);
    if (!n) continue;
    const b = BRANCHE.get(n);
    const r = REGION.get(n);
    if (b) { branchen.add(b); continue; }
    if (r) { regionen.add(r); continue; }
    // Zweiter Versuch: steht ein bekanntes Wort IM Bruchstück? „Erneuerbare
    // Energien Europa" ist ein Bruchstück und nennt trotzdem eine Branche.
    // Die Endung darf mitwandern: „Versicherungen" ist „Versicherung", und
    // „services" ist „service". Mehr als diese paar Buchstaben wird nicht
    // zugelassen, sonst trifft irgendwann alles irgendetwas.
    const steckt = (wort) => wort.length >= 4 && new RegExp(`(^| )${wort}(e|en|n|s|es)?( |$)`).test(n);
    // Ein Bruchstueck kann beides nennen: „Maschinenbau in Bayern" ist eine
    // Branche UND eine Region. Deshalb wird nach dem ersten Treffer nicht
    // abgebrochen, sondern beide Listen werden gefragt.
    let gefunden = false;
    for (const [wort, code] of BRANCHE) {
      if (steckt(wort)) { branchen.add(code); gefunden = true; break; }
    }
    for (const [wort, code] of REGION) {
      if (steckt(wort)) { regionen.add(code); gefunden = true; break; }
    }
    if (!gefunden) unklar.push(roh);
  }
  return { branchen: [...branchen], regionen: [...regionen], unklar };
}

/** Eine als JSON-Liste oder Text gespeicherte Spalte als Array lesen. */
function liste(v) {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (v == null || v === '') return [];
  try { const p = JSON.parse(v); return Array.isArray(p) ? p.filter(Boolean) : (p ? [p] : []); }
  catch { return String(v).split(/[,;]/).map((s) => s.trim()).filter(Boolean); }
}

/**
 * Was wäre für diesen Kontakt zu tun?
 *
 * Gibt immer eine Zeile für den Bericht zurück, auch wenn nichts zu tun ist.
 * Ein Bericht, der nur Erfolge zeigt, verschweigt die Hälfte.
 *
 * @returns {{id, name, text, branchen, regionen, unklar, aenderung: boolean, grund: string}}
 */
function planen(kontakt) {
  const text = kontakt.investment_focus || '';
  const hatBranchen = liste(kontakt.focus_industries).length > 0;
  const hatRegionen = liste(kontakt.focus_regions).length > 0;
  const name = [kontakt.first_name, kontakt.last_name].filter(Boolean).join(' ') || kontakt.company || `Kontakt ${kontakt.id}`;
  const basis = { id: kontakt.id, name, text, branchen: [], regionen: [], unklar: [] };

  if (!text.trim()) return { ...basis, aenderung: false, grund: 'kein Schwerpunkt hinterlegt' };
  if (hatBranchen && hatRegionen) return { ...basis, aenderung: false, grund: 'Kriterien bereits gepflegt' };

  const a = ableiten(text);
  const branchen = hatBranchen ? [] : a.branchen;
  const regionen = hatRegionen ? [] : a.regionen;
  if (!branchen.length && !regionen.length) {
    return { ...basis, unklar: a.unklar, aenderung: false, grund: 'aus dem Text folgt nichts Eindeutiges' };
  }
  return {
    ...basis, branchen, regionen, unklar: a.unklar, aenderung: true,
    grund: `${branchen.length} Branchen, ${regionen.length} Regionen abgeleitet`,
  };
}

module.exports = { ableiten, planen, bruchstuecke, liste, normal };
