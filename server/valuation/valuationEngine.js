// ─────────────────────────────────────────────────────────────────────────────
// Sprint 6: Bewertungs-Engine (indikativ, testbar, ohne Seiteneffekte).
//
// Zwei Verfahren + Werte-Korridor:
//   1. Multiplikatorverfahren: bereinigtes Ø-EBIT × Branchen-Multiple.
//      Qualitätsfaktoren verschieben innerhalb des Multiple-Bandes.
//   2. Vereinfachtes Ertragswertverfahren (§ 199 ff. BewG, Faktor 13,75) als
//      Vergleichswert (Hinweis: steuerlicher Wert, tendenziell zu hoch).
//   + Umsatz-Multiple als Plausibilitäts-Bandbreite.
//
// Kernbotschaft: Wert ≠ Marktpreis. Ergebnis ist ein KORRIDOR, keine Punktzahl.
// Alles rein indikativ, keine Bewertung nach IDW S1.
// ─────────────────────────────────────────────────────────────────────────────

const KAP_FAKTOR_BEWG = 13.75; // § 203 BewG (fester Kapitalisierungsfaktor)

// Qualitätsfaktoren: jeder Wert ∈ {-1, 0, +1}. Summe skaliert die Position
// innerhalb des Multiple-Bandes (min … max). Positiv = näher an max.
const QUALITY_KEYS = [
  'owner_dependence',   // Inhaberabhängigkeit (−1 stark abhängig … +1 unabhängig)
  'customer_concentration', // Kundenkonzentration (−1 Klumpen … +1 breit gestreut)
  'recurring_revenue',  // wiederkehrende Umsätze
  'investment_backlog', // Investitionsstau (−1 hoch … +1 kein Stau)
  'second_level',       // zweite Führungsebene / Team
];

function clampNum(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

// Durchschnitt der vorhandenen (nicht-leeren) Jahreswerte
function avg(values) {
  const nums = (values || []).map(clampNum).filter((n) => n !== 0 || n === 0);
  const valid = (values || []).map(clampNum);
  if (!valid.length) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

// Position 0..1 innerhalb des Bandes aus Qualitätssumme (−5..+5)
function qualityPosition(quality) {
  let sum = 0;
  for (const k of QUALITY_KEYS) sum += Math.max(-1, Math.min(1, clampNum(quality?.[k])));
  // −5..+5 → 0..1, Mittelpunkt 0,5
  return Math.max(0, Math.min(1, 0.5 + sum / 10));
}

function round(n) {
  return Math.round(clampNum(n));
}

// Größenklasse aus Ø-Umsatz ableiten (DUB-Logik):
//   Micro < 5 Mio. €, Small 5–50 Mio. €, Mid > 50 Mio. €.
// Liefert das passende EBIT-Band der Multiples-Zeile.
function pickSizeBand(avgRevenue, multiple) {
  let key, label;
  if (avgRevenue > 50e6) { key = 'mid'; label = 'Mid-Cap (> 50 Mio. € Umsatz)'; }
  else if (avgRevenue >= 5e6) { key = 'small'; label = 'Small-Cap (5–50 Mio. € Umsatz)'; }
  else { key = 'micro'; label = 'Micro-Cap (< 5 Mio. € Umsatz)'; }
  const min = clampNum(multiple[`${key}_ebit_min`]);
  const max = clampNum(multiple[`${key}_ebit_max`]);
  return { key, label, min, max };
}

/**
 * @param {object} input
 *   revenues: [z1,z2,z3]  Umsatz der letzten Jahre
 *   ebits:    [e1,e2,e3]  EBIT der letzten Jahre
 *   ownerSalaryAdjustment: kalkulatorisches GF-Gehalt (mindert bereinigtes EBIT, falls bisher nicht enthalten), als jährlicher Betrag, wird vom Ø-EBIT abgezogen
 *   oneOffs:  Einmaleffekte (werden vom Ø-EBIT abgezogen; positiv = Sondererträge raus)
 *   netDebt:  Nettofinanzverbindlichkeiten (für Equity-Value-Hinweis, optional)
 *   quality:  { owner_dependence, ... } je ∈ {-1,0,1}
 * @param {object} multiple  Zeile aus valuation_multiples
 * @returns {object} Ergebnis mit Korridor
 */
function evaluate(input, multiple) {
  const revenues = (input.revenues || []).map(clampNum);
  const ebits = (input.ebits || []).map(clampNum);
  const avgRevenue = avg(revenues);
  const rawAvgEbit = avg(ebits);

  // Bereinigtes nachhaltiges EBIT
  const ownerAdj = clampNum(input.ownerSalaryAdjustment);   // z. B. fehlendes GF-Gehalt → abziehen
  const oneOffs = clampNum(input.oneOffs);                   // Sondereffekte → abziehen
  const adjustedEbit = rawAvgEbit - ownerAdj - oneOffs;

  // Größenklasse (Micro/Small/Mid) aus Ø-Umsatz → EBIT-Band der Klasse
  const sizeBand = pickSizeBand(avgRevenue, multiple);

  // Multiplikatorverfahren mit Qualitätsposition im Band
  const pos = qualityPosition(input.quality);
  const emMin = sizeBand.min;
  const emMax = sizeBand.max;
  const emAvg = Math.round(((emMin + emMax) / 2) * 100) / 100;
  const chosenMultiple = emMin + (emMax - emMin) * pos;

  const ebitValueLow = adjustedEbit * emMin;
  const ebitValueMid = adjustedEbit * chosenMultiple;
  const ebitValueHigh = adjustedEbit * emMax;

  // Umsatz-Multiple (Plausibilitätsband)
  const revValueLow = avgRevenue * clampNum(multiple.revenue_multiple_min);
  const revValueHigh = avgRevenue * clampNum(multiple.revenue_multiple_max);

  // Vereinfachtes Ertragswertverfahren (§199 BewG), Vergleichswert
  const simplifiedIncomeValue = adjustedEbit > 0 ? adjustedEbit * KAP_FAKTOR_BEWG : 0;

  // Korridor: konservativ / Basis / optimistisch (auf EBIT-Verfahren zentriert,
  // Umsatzband als Leitplanke). Nur sinnvoll bei positivem bereinigtem EBIT.
  const positive = adjustedEbit > 0;
  const corridor = {
    conservative: round(positive ? Math.min(ebitValueLow, ebitValueMid) : 0),
    base: round(positive ? ebitValueMid : 0),
    optimistic: round(positive ? Math.max(ebitValueHigh, ebitValueMid) : 0),
  };

  // Optionaler Equity-Value-Hinweis (Enterprise Value − Netto-Finanzschulden)
  const netDebt = clampNum(input.netDebt);
  const equityHint = positive ? {
    conservative: round(corridor.conservative - netDebt),
    base: round(corridor.base - netDebt),
    optimistic: round(corridor.optimistic - netDebt),
  } : null;

  return {
    inputsSummary: {
      avgRevenue: round(avgRevenue),
      rawAvgEbit: round(rawAvgEbit),
      adjustedEbit: round(adjustedEbit),
      ownerSalaryAdjustment: round(ownerAdj),
      oneOffs: round(oneOffs),
      qualityPosition: Math.round(pos * 100) / 100,
    },
    sizeBand: { key: sizeBand.key, label: sizeBand.label },
    methods: {
      multiple: {
        band: { min: emMin, avg: emAvg, max: emMax },
        sizeBandLabel: sizeBand.label,
        chosenMultiple: Math.round(chosenMultiple * 100) / 100,
        valueLow: round(ebitValueLow),
        valueMid: round(ebitValueMid),
        valueHigh: round(ebitValueHigh),
      },
      revenueMultiple: {
        band: { min: clampNum(multiple.revenue_multiple_min), max: clampNum(multiple.revenue_multiple_max) },
        valueLow: round(revValueLow),
        valueHigh: round(revValueHigh),
      },
      simplifiedIncome: {
        factor: KAP_FAKTOR_BEWG,
        value: round(simplifiedIncomeValue),
        note: 'Steuerlicher Vergleichswert (§199 BewG), in der Praxis meist zu hoch.',
      },
    },
    corridor,           // Enterprise Value (indikativ)
    equityHint,         // nach Abzug Netto-Finanzschulden (falls angegeben)
    positive,
    disclaimer: 'Indikative Orientierung, keine Bewertung nach IDW S1 und keine Rechts- oder Steuerberatung. Der Unternehmenswert entspricht nicht dem am Markt erzielbaren Preis.',
    multipleSource: multiple.source || 'Phalanx – indikative Schätzung',
    industryLabel: multiple.label || null,
  };
}

module.exports = { evaluate, qualityPosition, QUALITY_KEYS, KAP_FAKTOR_BEWG };
