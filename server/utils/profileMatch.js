// ─────────────────────────────────────────────────────────────────────────────
// Gemeinsamer Abgleich Suchprofil ↔ Mandat. Genutzt vom Sofort-Versand bei
// Publish (routes/admin.js) und vom täglichen/wöchentlichen Digest (utils/digest.js),
// damit beide Wege identisch matchen.
//
// criteria_json unterstützt zwei Formen (mischbar, rückwärtskompatibel):
//   • Einzelwert:  { industry, region, deal_type, mandate_type, revenue_band, ebitda_band }
//   • Liste:       { industries:[], regions:[], deal_types:[] }  (leer = beliebig)
//   • Freitext:    { search }  (sucht in Codename + Kurzbeschreibung)
// Ein Feld schränkt nur ein, wenn es gesetzt (bzw. nicht leer) ist.
// ─────────────────────────────────────────────────────────────────────────────
const tax = require('./taxonomie');

// Branche und Region wurden bisher mit Zeichengleichheit verglichen. Das ging
// nie auf: das Suchprofil bot "Maschinenbau" an, das Mandat trug
// "C28 – Maschinenbau". Wer filterte, bekam deshalb gar nichts.
//
// Jetzt zählt ein Eintrag als Treffer, wenn er entweder zeichengleich ist
// (alte Konfigurationen bleiben gültig) oder über die Taxonomie passt. Ein
// Eintrag, den die Taxonomie nicht kennt, wird nicht geraten, sondern
// weiterhin nur zeichengleich geprüft.
function trifft(liste, wert, art) {
  if (!liste.length) return true;                 // nichts gewählt heißt: alles
  if (liste.includes(wert)) return true;
  const passt = art === 'branche' ? tax.brancheTrifft : tax.regionTrifft;
  const zuCode = art === 'branche' ? tax.brancheAus : tax.regionAus;
  return liste.some((eintrag) => {
    const code = tax[art === 'branche' ? 'brancheVon' : 'regionVon'](eintrag) ? eintrag : zuCode(eintrag);
    return code ? passt(code, wert) : false;
  });
}

function asList(v) {
  if (Array.isArray(v)) return v.filter((x) => x != null && String(x).trim() !== '').map((x) => String(x));
  if (v != null && String(v).trim() !== '') return [String(v)];
  return [];
}

function matchesProfile(c, p) {
  c = c || {};
  const inList = (list, val) => !list.length || list.includes(val);

  if (!trifft(asList(c.industries).concat(asList(c.industry)), p.industry, 'branche')) return false;
  if (!trifft(asList(c.regions).concat(asList(c.region)), p.region, 'region')) return false;
  if (!inList(asList(c.deal_types).concat(asList(c.deal_type)), p.deal_type)) return false;
  if (c.mandate_type && c.mandate_type !== p.mandate_type) return false;
  if (c.revenue_band && c.revenue_band !== p.revenue_band) return false;
  if (c.ebitda_band && c.ebitda_band !== p.ebitda_band) return false;
  if (c.search) {
    const s = String(c.search).toLowerCase();
    if (!(`${p.codename} ${p.short_description || ''}`.toLowerCase().includes(s))) return false;
  }
  return true;
}

module.exports = { matchesProfile, asList };
