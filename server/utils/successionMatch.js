// ─────────────────────────────────────────────────────────────────────────────
// Gemeinsame Matching-Logik: Nachfolge-Profil gegen Nachfolge-Mandat.
// Wird von der Route (/succession) und der Benachrichtigung (notify) genutzt,
// damit beide Seiten identisch bewerten.
// ─────────────────────────────────────────────────────────────────────────────

// Mandate, die eine Nachfolge sind (Käuferseite: MBI/MBO/Nachfolge).
const SUCCESSION_DEAL_TYPES = ['Nachfolge', 'MBO', 'MBI'];
const UMSATZ_RANGE = { '<1': [0, 1], '1-3': [1, 3], '3-10': [3, 10], '10-30': [10, 30], '>30': [30, Infinity] };
const DE_REGIONS = ['baden-württemberg', 'bayern', 'berlin', 'brandenburg', 'bremen', 'hamburg', 'hessen',
  'mecklenburg-vorpommern', 'niedersachsen', 'nordrhein-westfalen', 'rheinland-pfalz', 'saarland',
  'sachsen', 'sachsen-anhalt', 'schleswig-holstein', 'thüringen', 'deutschland', 'bundesweit'];

function isSuccessionDeal(dealType) {
  return SUCCESSION_DEAL_TYPES.includes(dealType);
}

// Größte in „Mio." genannte Zahl aus einem Umsatz-Freitext ziehen (z. B. „€ 1,5-2 Mio." → 2).
function revenueMio(str) {
  const nums = String(str || '').replace(/\./g, '').replace(/,/g, '.').match(/\d+(\.\d+)?/g);
  if (!nums) return null;
  return Math.max(...nums.map(Number));
}

// Transparentes Scoring mit Gewichten. Nur gefüllte Profilfelder zählen.
const WEIGHTS = { base: 10, branche: 45, region: 30, umsatz: 15 };

function scoreMatch(profile, p) {
  const reasons = [];
  let score = WEIGHTS.base; // Grundgewicht: es ist ein Nachfolge-Mandat

  const branchen = profile.branchenfokus || [];
  const ind = String(p.industry || '').toLowerCase();
  if (branchen.length && ind && branchen.some(b => {
    const x = String(b).toLowerCase();
    return ind.includes(x) || x.includes(ind.split(/[ /]/)[0]);
  })) { score += WEIGHTS.branche; reasons.push('Branche passt'); }

  const regionen = [...(profile.ziel_regionen || []), ...(profile.ziel_laender || [])];
  const reg = String(p.region || '').toLowerCase();
  const laender = (profile.ziel_laender || []).map(x => String(x).toLowerCase());
  const regCountry = /österreich/.test(reg) ? 'österreich' : /schweiz/.test(reg) ? 'schweiz'
    : (DE_REGIONS.some(d => reg.includes(d)) || /dach/.test(reg)) ? 'deutschland' : null;
  const regionMatch = (regionen.length && reg && regionen.some(r => {
    const x = String(r).toLowerCase();
    return reg.includes(x) || x.includes(reg);
  })) || (regCountry && laender.includes(regCountry)) || (/dach/.test(reg) && laender.length > 0);
  if (regionMatch) { score += WEIGHTS.region; reasons.push('Region passt'); }

  if (profile.umsatz_band && UMSATZ_RANGE[profile.umsatz_band]) {
    // Bevorzugt die strukturierte Umsatzklasse des Mandats (exakter Bandvergleich),
    // sonst den Freitext-Umsatz auslesen (Rückwärtskompatibilität).
    let umsatzMatch = false;
    if (p.revenue_class && UMSATZ_RANGE[p.revenue_class]) {
      umsatzMatch = p.revenue_class === profile.umsatz_band;
    } else {
      const rv = revenueMio(p.revenue_band);
      const [lo, hi] = UMSATZ_RANGE[profile.umsatz_band];
      umsatzMatch = rv != null && rv >= lo && rv <= hi;
    }
    if (umsatzMatch) { score += WEIGHTS.umsatz; reasons.push('Umsatz passt'); }
  }
  return { score: Math.min(score, 100), reasons };
}

// Reicht das Match für eine aktive Benachrichtigung? Mindestens Branche oder Region.
function isStrongMatch({ reasons }) {
  return reasons.includes('Branche passt') || reasons.includes('Region passt');
}

module.exports = { SUCCESSION_DEAL_TYPES, UMSATZ_RANGE, isSuccessionDeal, revenueMio, scoreMatch, isStrongMatch, WEIGHTS };
