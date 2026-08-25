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
function asList(v) {
  if (Array.isArray(v)) return v.filter((x) => x != null && String(x).trim() !== '').map((x) => String(x));
  if (v != null && String(v).trim() !== '') return [String(v)];
  return [];
}

function matchesProfile(c, p) {
  c = c || {};
  const inList = (list, val) => !list.length || list.includes(val);

  if (!inList(asList(c.industries).concat(asList(c.industry)), p.industry)) return false;
  if (!inList(asList(c.regions).concat(asList(c.region)), p.region)) return false;
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
