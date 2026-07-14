// ─────────────────────────────────────────────────────────────────────────────
// Sprint 12: Bewertung 2.0: Discounted-Cash-Flow-Modul.
//
// Reine Funktionen (testbar, ohne DB): WACC nach CAPM mit KMU-Zuschlägen,
// Free-Cash-Flow-Projektion aus einer schlanken Planung, Terminal Value nach
// Gordon Growth, Mid-Year-Convention und eine Sensitivitätsmatrix WACC × g.
//
// Bewusst konservativ und offen ausgewiesen: Jeder Parameter ist sichtbar,
// nichts ist eine Blackbox. Ergebnis ist ein Enterprise Value; die Equity-Bridge
// (abzüglich Netto-Finanzschulden) macht der aufrufende Engine-Teil.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULTS = {
  baseRate: 0.03,          // quasi-risikofreier Basiszins (Bundesanleihen, indikativ)
  marketRiskPremium: 0.065, // Marktrisikoprämie (FAUB-Bandbreite 6–8 %)
  beta: 1.0,               // unlevered Beta, Branchen-Default
  sizePremium: 0.04,       // Small-Size-Prämie für KMU
  illiquidity: 0.02,       // Fungibilitätsabschlag als Zuschlag auf den Zins
  debtRate: 0.055,         // Fremdkapitalzins
  taxRate: 0.30,           // Ertragsteuerlast (pauschal)
  debtRatio: 0.0,          // Zielkapitalstruktur; 0 = cash-/debt-free bewertet
  terminalGrowth: 0.01,    // ewiges Wachstum (konservativ, < Inflationsziel)
  years: 5,                // Detailplanungsperiode
};

const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const round = (n) => Math.round(num(n));
const r2 = (n) => Math.round(num(n) * 100) / 100;
const r4 = (n) => Math.round(num(n) * 10000) / 10000;

// WACC = Eigenkapitalkosten × EK-Quote + Fremdkapitalkosten nach Steuern × FK-Quote
// Eigenkapitalkosten (CAPM + KMU-Zuschläge): rf + β × MRP + Size + Illiquidität
function wacc(p = {}) {
  const baseRate = num(p.baseRate, DEFAULTS.baseRate);
  const mrp = num(p.marketRiskPremium, DEFAULTS.marketRiskPremium);
  const beta = num(p.beta, DEFAULTS.beta);
  const size = num(p.sizePremium, DEFAULTS.sizePremium);
  const illiq = num(p.illiquidity, DEFAULTS.illiquidity);
  const debtRate = num(p.debtRate, DEFAULTS.debtRate);
  const tax = num(p.taxRate, DEFAULTS.taxRate);
  const d = Math.min(0.9, Math.max(0, num(p.debtRatio, DEFAULTS.debtRatio)));

  const costOfEquity = baseRate + beta * mrp + size + illiq;
  const costOfDebt = debtRate * (1 - tax);
  const value = costOfEquity * (1 - d) + costOfDebt * d;

  return {
    costOfEquity: r4(costOfEquity),
    costOfDebt: r4(costOfDebt),
    debtRatio: r4(d),
    wacc: r4(value),
    components: {
      baseRate: r4(baseRate), marketRiskPremium: r4(mrp), beta: r2(beta),
      sizePremium: r4(size), illiquidity: r4(illiq), debtRate: r4(debtRate), taxRate: r4(tax),
    },
  };
}

// Free Cash Flow to Firm je Planjahr:
//   EBIT × (1 − s) + AfA − Capex − Δ Working Capital
// Planung schlank: Umsatzwachstum, EBIT-Marge, AfA-/Capex-/NWC-Quoten vom Umsatz.
function projectFcf(plan = {}) {
  const years = Math.max(1, Math.min(10, num(plan.years, DEFAULTS.years)));
  const tax = num(plan.taxRate, DEFAULTS.taxRate);
  let revenue = num(plan.revenueBase);
  let prevRevenue = revenue;

  const growth = num(plan.revenueGrowth, 0.02);          // p. a.
  const margin = num(plan.ebitMargin, 0.1);              // EBIT / Umsatz
  const daPct = num(plan.depreciationPct, 0.03);         // AfA / Umsatz
  const capexPct = num(plan.capexPct, 0.03);             // Capex / Umsatz
  const nwcPct = num(plan.nwcPct, 0.1);                  // gebundenes NWC / Umsatz

  const rows = [];
  for (let i = 1; i <= years; i++) {
    prevRevenue = revenue;
    revenue = revenue * (1 + growth);
    const ebit = revenue * margin;
    const nopat = ebit * (1 - tax);
    const da = revenue * daPct;
    const capex = revenue * capexPct;
    // Working-Capital-Bindung wächst mit dem Umsatz → Mittelabfluss
    const deltaNwc = (revenue - prevRevenue) * nwcPct;
    const fcf = nopat + da - capex - deltaNwc;
    rows.push({
      year: i,
      revenue: round(revenue),
      ebit: round(ebit),
      nopat: round(nopat),
      depreciation: round(da),
      capex: round(capex),
      deltaNwc: round(deltaNwc),
      fcf: round(fcf),
    });
  }
  return rows;
}

// Barwert der Detailphase + Terminal Value (Gordon Growth), Mid-Year-Convention:
// Cashflows fallen unterjährig an → Diskontierung auf t − 0,5.
function discount(rows, waccRate, terminalGrowth, opts = {}) {
  const midYear = opts.midYear !== false;
  const g = num(terminalGrowth, DEFAULTS.terminalGrowth);
  const w = num(waccRate);
  if (!(w > g)) return null;   // ohne w > g ist Gordon Growth nicht definiert

  let pvDetail = 0;
  const detail = rows.map(r => {
    const t = midYear ? r.year - 0.5 : r.year;
    const df = 1 / Math.pow(1 + w, t);
    const pv = r.fcf * df;
    pvDetail += pv;
    return { ...r, discountFactor: r4(df), presentValue: round(pv) };
  });

  const last = rows[rows.length - 1];
  const terminalFcf = last.fcf * (1 + g);
  const terminalValue = terminalFcf / (w - g);
  // Terminal Value liegt am Ende der Detailphase → auf t = years abzinsen
  const tvDf = 1 / Math.pow(1 + w, rows.length);
  const pvTerminal = terminalValue * tvDf;

  const enterpriseValue = pvDetail + pvTerminal;
  return {
    detail,
    pvDetail: round(pvDetail),
    terminalFcf: round(terminalFcf),
    terminalValue: round(terminalValue),
    pvTerminal: round(pvTerminal),
    terminalShare: enterpriseValue > 0 ? r2((pvTerminal / enterpriseValue) * 100) : null,
    enterpriseValue: round(enterpriseValue),
  };
}

// Sensitivitätsmatrix: EV bei WACC ± Schritten × Terminal Growth ± Schritten
function sensitivity(rows, waccRate, terminalGrowth, opts = {}) {
  const wSteps = opts.waccSteps || [-0.02, -0.01, 0, 0.01, 0.02];
  const gSteps = opts.growthSteps || [-0.01, -0.005, 0, 0.005, 0.01];
  const matrix = [];
  for (const dw of wSteps) {
    const w = r4(waccRate + dw);
    const row = { wacc: w, values: [] };
    for (const dg of gSteps) {
      const g = r4(terminalGrowth + dg);
      const res = discount(rows, w, g);
      row.values.push({ growth: g, enterpriseValue: res ? res.enterpriseValue : null });
    }
    matrix.push(row);
  }
  return { waccSteps: wSteps, growthSteps: gSteps, matrix };
}

// Komplettrechnung: Planung → FCF → Barwerte → Equity Bridge → Sensitivität
function evaluateDcf(input = {}) {
  const w = wacc(input);
  const plan = {
    years: input.years, taxRate: input.taxRate,
    revenueBase: input.revenueBase, revenueGrowth: input.revenueGrowth,
    ebitMargin: input.ebitMargin, depreciationPct: input.depreciationPct,
    capexPct: input.capexPct, nwcPct: input.nwcPct,
  };
  const rows = projectFcf(plan);
  const g = num(input.terminalGrowth, DEFAULTS.terminalGrowth);
  const res = discount(rows, w.wacc, g);
  if (!res) {
    return { ok: false, reason: 'WACC muss größer sein als das ewige Wachstum.', wacc: w };
  }
  const netDebt = num(input.netDebt);
  return {
    ok: true,
    wacc: w,
    terminalGrowth: r4(g),
    plan: rows,
    ...res,
    equityValue: round(res.enterpriseValue - netDebt),
    netDebt: round(netDebt),
    sensitivity: sensitivity(rows, w.wacc, g),
    method: 'DCF (FCFF, Mid-Year-Convention, Terminal Value nach Gordon Growth)',
  };
}

module.exports = { DEFAULTS, wacc, projectFcf, discount, sensitivity, evaluateDcf };
