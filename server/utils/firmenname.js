// ─────────────────────────────────────────────────────────────────────────────
// Firmennamen vergleichbar machen (v0.447 herausgelöst).
//
// Stand bisher in routes/crm.js. Beim Bau der Adress-Schnittstelle habe ich die
// Regel dort ein zweites Mal geschrieben und dabei eine andere Liste von
// Rechtsformen erwischt. Genau das wäre der Fehler gewesen, vor dem der
// Kommentar daneben warnt: Dieselbe Firma wird an zwei Stellen verschieden
// normalisiert, und die Zuordnung trifft mal und mal nicht.
//
// Deshalb eine Datei, eine Regel. Wer eine Rechtsform ergänzt, ergänzt sie für
// alle.
// ─────────────────────────────────────────────────────────────────────────────

/** Rechtsformen, die beim Vergleich nicht mitzählen. */
const LEGAL_FORMS = /\b(gmbh|ag|kg|ohg|gbr|ug|se|mbh|co|kgaa|ek|ltd|inc|llc|bv|nv|sa|sarl|spa|srl|plc|holding)\b/g;

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[&+]/g, ' und ')
    .replace(/\./g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(LEGAL_FORMS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { normalizeName, LEGAL_FORMS };
