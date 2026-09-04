// ─────────────────────────────────────────────────────────────────────────────
// LinkedIn-Kandidaten-Import: reine Hilfsfunktionen (ohne Datenbank, testbar).
//
// Genutzt vom In-App-Import (routes/crm.js) und vom CLI-Skript
// (scripts/linkedin-kandidaten-import.js). Die DB-schreibenden Teile liegen dort,
// die Normalisierung und die Zuordnungslogik hier, damit beide Wege identisch
// dublettenfrei arbeiten.
// ─────────────────────────────────────────────────────────────────────────────

// LinkedIn-URL normalisieren: kleingeschrieben, ohne Query/Anker, ohne Slash am
// Ende, Prozent-Kodierung dekodiert. Leerwert -> null.
function normalizeLinkedin(url) {
  let s = String(url || '').trim();
  if (!s) return null;
  try { s = decodeURIComponent(s); } catch { /* ungültige Kodierung ignorieren */ }
  s = s.toLowerCase();
  s = s.replace(/^https?:\/\//, '').replace(/^www\./, '');
  s = s.split(/[?#]/)[0];
  s = s.replace(/\/+$/, '');
  return s || null;
}

// Akademische Titel und Zusätze, die nicht zum Namensschlüssel gehören.
const TITLE_RE = /\b(dr|prof|dipl|ing|mba|msc|bsc|ma|ba|llm|dr\.-ing|h\.c|habil|rer|nat|med|jur|phil|oec)\b/g;

// Namensschlüssel aus Vor- und Nachname: kleingeschrieben, Umlaute normalisiert,
// Titel entfernt, nur Buchstaben und Leerzeichen, zusammengefasst.
function nameKey(first, last) {
  const raw = `${first || ''} ${last || ''}`;
  return String(raw)
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/\./g, ' ')
    .replace(TITLE_RE, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Käufertyp-Codes der Importliste -> erlaubte buyer_type-Werte der Plattform.
// Unbekannte oder generische Werte bleiben leer (null), der Rohwert wandert als
// Tag in die Kontaktakte, damit nichts verloren geht.
const BUYER_TYPE_MAP = {
  pe: 'financial',
  family_office: 'family_office',
  vc_angel: 'venture_capital',
  bank: 'financial',
  advisor_mandate: 'advisor_mandate',
  strategic: 'strategic',
  investor_generisch: null,
};
function mapBuyerType(code) {
  const k = String(code || '').trim().toLowerCase();
  if (!k) return null;
  return Object.prototype.hasOwnProperty.call(BUYER_TYPE_MAP, k) ? BUYER_TYPE_MAP[k] : null;
}

// Tags aus Passung, Prio, Käufertyp-Rohwert plus Herkunft. Immer inkl. 'linkedin'.
function buildTags({ passung, prio, buyerTypeRaw, existing = [] } = {}) {
  const tags = new Set((existing || []).map((t) => String(t)));
  tags.add('linkedin');
  const pr = String(prio || '').trim().toUpperCase();
  if (['A', 'B', 'C'].includes(pr)) tags.add(`prio:${pr}`);
  const pa = String(passung || '').trim();
  if (pa) tags.add(`passung:${pa}`);
  const bt = String(buyerTypeRaw || '').trim().toLowerCase();
  if (bt) tags.add(`kaeufertyp:${bt}`);
  return Array.from(tags);
}

module.exports = { normalizeLinkedin, nameKey, mapBuyerType, buildTags, BUYER_TYPE_MAP };
