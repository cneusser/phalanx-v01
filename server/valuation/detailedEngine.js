// ─────────────────────────────────────────────────────────────────────────────
// Sprint 7 — Engine der ausführlichen Bewertung (rein, testbar, ohne Seiteneffekte).
//
// Aufbauend auf Sprint 6 (Branchen-/Größenklassen-Multiple). Zusätzlich:
//   1. Bereinigung des nachhaltigen EBIT (GF-Gehalt, Einmaleffekte, Gesellschafter-Miete)
//   2. Multiplikatorverfahren mit Scorecard-Anpassung + Größenabschlag
//   3. Vereinfachtes Ertragswertverfahren (§199 BewG, Faktor 13,75) — Vergleichswert
//   4. Ertragswert mit risikogerechtem Kapitalisierungszins (Basiszins + Marktrisiko
//      + Scorecard-Risikozuschlag) — KMUrechner-Logik
//   5. Kapitaldienstfähigkeits-Check aus Käufersicht (Modul 2): finanzierbarer Preis
//   6. Substanzwert (optional) als Untergrenze
//   + Werte-Korridor, Methodenvergleich, Sensitivität (±1 Multiple-Punkt).
//
// Alles INDIKATIV, kein IDW-S1-Gutachten.
// ─────────────────────────────────────────────────────────────────────────────

const KAP_FAKTOR_BEWG = 13.75;   // §203 BewG
const TAX_RATE = 0.30;           // pauschale Ertragsteuerlast (indikativ)
const BASE_RATE = 0.03;          // quasi-risikofreier Basiszins (indikativ)
const MARKET_RISK = 0.06;        // allgemeiner Marktrisikozuschlag (indikativ)

// Scorecard-Faktoren: je Wert ∈ {-2,-1,0,+1,+2}. Positiv = werttreibend.
const SCORECARD_KEYS = [
  'owner_dependence',       // Inhaberabhängigkeit
  'customer_concentration', // Kundenkonzentration
  'second_level',           // zweite Führungsebene / Team
  'market_position',        // Marktposition / Wettbewerb
  'cyclicality',            // Saisonalität / Zyklizität
  'investment_backlog',     // Investitionsstau
  'digitalization',         // Digitalisierung / Prozessreife
];

// Pro Scorecard-Punkt: Multiple-Delta und Risikozuschlag-Delta.
const MULTIPLE_PER_POINT = 0.20;  // je Punkt ±0,20× auf das Multiple
const RISK_PER_POINT = 0.004;     // je (negativem) Punkt +0,4 %-Punkte Risikozuschlag

function num(v, def = 0) { const n = Number(v); return Number.isFinite(n) ? n : def; }
function round(n) { return Math.round(num(n)); }
function r2(n) { return Math.round(num(n) * 100) / 100; }

function avg(values) {
  const arr = (values || []).map(v => num(v)).filter(v => v !== null);
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Größenklasse (Micro/Small/Mid) aus Ø-Umsatz — identisch zu Sprint 6.
function pickSizeBand(avgRevenue, m) {
  let key, label;
  if (avgRevenue > 50e6) { key = 'mid'; label = 'Mid-Cap (> 50 Mio. € Umsatz)'; }
  else if (avgRevenue >= 5e6) { key = 'small'; label = 'Small-Cap (5–50 Mio. € Umsatz)'; }
  else { key = 'micro'; label = 'Micro-Cap (< 5 Mio. € Umsatz)'; }
  return { key, label, min: num(m[`${key}_ebit_min`]), max: num(m[`${key}_ebit_max`]) };
}

function scorecardSum(scorecard) {
  let sum = 0;
  for (const k of SCORECARD_KEYS) sum += Math.max(-2, Math.min(2, num(scorecard?.[k])));
  return sum;   // −14 .. +14
}

// Annuitätenfaktor: Barwert-Faktor für gleichbleibende Jahresrate
function annuityFactor(rate, years) {
  if (rate <= 0) return years;
  return (1 - Math.pow(1 + rate, -years)) / rate;
}

/**
 * @param {object} input  Fragebogen
 *   revenues, ebits, ebitdas: Arrays (Ist-Jahre + optional Planjahr)
 *   ownerSalaryAdjustment, oneOffs, shareholderRentAddback: Bereinigungen (€/Jahr)
 *   netDebt: Netto-Finanzverbindlichkeiten (€)
 *   scorecard: { owner_dependence, ... } je ∈ {-2..2}
 *   assetValue, assetDebt: Substanzwert (optional)
 *   buyerYears (Default 7), buyerInterest (Default 0,065): Kapitaldienst-Parameter
 * @param {object} multiple  Zeile aus valuation_multiples (Branche×Größenklasse)
 */
function evaluateDetailed(input, multiple) {
  const revenues = (input.revenues || []).map(v => num(v));
  const ebits = (input.ebits || []).map(v => num(v));
  const avgRevenue = avg(revenues);
  const rawAvgEbit = avg(ebits);

  // 1) Bereinigtes nachhaltiges EBIT
  const ownerAdj = num(input.ownerSalaryAdjustment);
  const oneOffs = num(input.oneOffs);
  const rentAdd = num(input.shareholderRentAddback);   // Überzahlung an Gesellschafter → addback
  const adjustedEbit = rawAvgEbit - ownerAdj - oneOffs + rentAdd;

  // Größenklasse + Basis-Multiple-Band
  const sizeBand = pickSizeBand(avgRevenue, multiple);
  const bandMid = (sizeBand.min + sizeBand.max) / 2;

  // 2) Multiplikatorverfahren mit Scorecard-Anpassung + Größenabschlag
  const scSum = scorecardSum(input.scorecard);
  const scoreDelta = scSum * MULTIPLE_PER_POINT;
  const sizeDiscount = adjustedEbit > 0 && adjustedEbit < 1e6 ? 0.9 : 1.0; // < 1 Mio. € EBIT
  // gewähltes Multiple: Bandmitte ± Scorecard, geklemmt auf [min×0,8 … max×1,2]
  let chosen = (bandMid + scoreDelta) * sizeDiscount;
  chosen = Math.max(sizeBand.min * 0.8, Math.min(sizeBand.max * 1.2, chosen));
  const positive = adjustedEbit > 0;

  const evMultiple = positive ? adjustedEbit * chosen : 0;
  // Sensitivität ±1 Multiple-Punkt
  const evMultipleLow = positive ? adjustedEbit * Math.max(0, chosen - 1) : 0;
  const evMultipleHigh = positive ? adjustedEbit * (chosen + 1) : 0;

  // 3) Vereinfachtes Ertragswertverfahren (§199 BewG)
  const bewgValue = positive ? adjustedEbit * KAP_FAKTOR_BEWG : 0;

  // 4) Ertragswert mit risikogerechtem Zins
  const riskPremium = Math.max(0, -scSum) * RISK_PER_POINT; // schlechte Scores → höherer Zins
  const capRate = BASE_RATE + MARKET_RISK + riskPremium;
  const netEarnings = adjustedEbit * (1 - TAX_RATE);
  const incomeValue = positive ? netEarnings / capRate : 0;

  // 5) Kapitaldienstfähigkeit (Käufersicht): finanzierbarer Kaufpreis
  const buyerYears = num(input.buyerYears) || 7;
  const buyerInterest = num(input.buyerInterest) || 0.065;
  const freeCashForDebt = netEarnings; // vereinfachte Cash-Näherung (nach Steuern)
  const financeablePrice = positive ? freeCashForDebt * annuityFactor(buyerInterest, buyerYears) : 0;

  // 6) Substanzwert (optional) als Untergrenze (Enterprise-nah)
  const substanceValue = Math.max(0, num(input.assetValue) - num(input.assetDebt));

  // Enterprise-Value-Korridor: zentriert auf Multiplikator, Ertragswert als 2. Meinung.
  // Sensitivität (±1 Multiple-Punkt) und Ertragswert spannen die Bänder. Der
  // Substanzwert wird NICHT in den Ertragskorridor gezwungen, sondern separat als
  // Untergrenze ausgewiesen (siehe methods.substance + substanceExceedsIncome).
  const base = evMultiple;
  let low = Math.min(evMultipleLow, incomeValue);
  let high = Math.max(evMultipleHigh, incomeValue);
  if (low > base) low = base;
  if (high < base) high = base;

  const corridor = {
    conservative: round(positive ? low : 0),
    base: round(positive ? base : 0),
    optimistic: round(positive ? high : 0),
  };
  // Hinweis-Flag: substanzstarkes Unternehmen (Substanz > ertragsorientierter Basiswert)
  const substanceExceedsBase = positive && substanceValue > base;

  // Equity-Bridge: Enterprise Value − Netto-Finanzschulden
  const netDebt = num(input.netDebt);
  const equity = positive ? {
    conservative: round(corridor.conservative - netDebt),
    base: round(corridor.base - netDebt),
    optimistic: round(corridor.optimistic - netDebt),
  } : null;

  // Kapitaldienst-Ampel: ist der Basis-Korridor aus Käufersicht tragfähig?
  const dscr = financeablePrice > 0 && corridor.base > 0 ? r2(financeablePrice / corridor.base) : null;
  const affordability = dscr == null ? 'n/a' : (dscr >= 1 ? 'tragfähig' : (dscr >= 0.8 ? 'grenzwertig' : 'ambitioniert'));

  return {
    inputsSummary: {
      avgRevenue: round(avgRevenue),
      rawAvgEbit: round(rawAvgEbit),
      ownerSalaryAdjustment: round(ownerAdj),
      oneOffs: round(oneOffs),
      shareholderRentAddback: round(rentAdd),
      adjustedEbit: round(adjustedEbit),
      scorecardSum: scSum,
    },
    sizeBand: { key: sizeBand.key, label: sizeBand.label },
    methods: {
      multiple: {
        band: { min: sizeBand.min, max: sizeBand.max },
        chosenMultiple: r2(chosen),
        scoreDelta: r2(scoreDelta),
        sizeDiscount,
        valueLow: round(evMultipleLow),
        value: round(evMultiple),
        valueHigh: round(evMultipleHigh),
      },
      simplifiedIncome: { factor: KAP_FAKTOR_BEWG, value: round(bewgValue),
        note: 'Steuerlicher Vergleichswert (§199 BewG) — in der Praxis meist zu hoch.' },
      income: {
        capRate: r2(capRate * 100),          // in %
        baseRate: r2(BASE_RATE * 100), marketRisk: r2(MARKET_RISK * 100), riskPremium: r2(riskPremium * 100),
        netEarnings: round(netEarnings), value: round(incomeValue),
      },
      substance: { assetValue: round(num(input.assetValue)), assetDebt: round(num(input.assetDebt)), value: round(substanceValue), exceedsBase: substanceExceedsBase },
    },
    affordability: {
      buyerYears, buyerInterest: r2(buyerInterest * 100),
      freeCashForDebt: round(freeCashForDebt),
      financeablePrice: round(financeablePrice),
      dscr, verdict: affordability,
    },
    corridor,
    equity,
    netDebt: round(netDebt),
    positive,
    disclaimer: 'Indikative Orientierung, keine Bewertung nach IDW S1 und keine Rechts- oder Steuerberatung. Der Unternehmenswert entspricht nicht dem am Markt erzielbaren Preis.',
    multipleSource: multiple.source || 'Phalanx – indikative Schätzung',
    industryLabel: multiple.label || null,
  };
}

module.exports = { evaluateDetailed, SCORECARD_KEYS, KAP_FAKTOR_BEWG, pickSizeBand, scorecardSum };
