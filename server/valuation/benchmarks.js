// ─────────────────────────────────────────────────────────────────────────────
// Sprint 12: Benchmarking: Wo steht das Unternehmen gegenüber seiner Branche?
//
// Verglichen werden vier Kennzahlen, die im M&A-Gespräch tatsächlich zählen:
//   · EBIT-Marge          (Ertragskraft)
//   · Umsatzwachstum p.a. (Momentum)
//   · Personalkostenquote (Effizienz, optional)
//   · Kundenkonzentration (Risiko, optional: kommt aus der Scorecard)
//
// Die Branchenwerte liegen in valuation_benchmarks (Migration mit Seed) und sind
// im Admin pflegbar. Die Einordnung ist bewusst grob (unter/im/über Markt), 
// eine Perzentil-Genauigkeit würde eine Präzision vortäuschen, die die Datenlage
// bei KMU nicht hergibt.
// ─────────────────────────────────────────────────────────────────────────────

const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const r2 = (n) => Math.round(num(n) * 100) / 100;

// Ein Wert gegen ein Branchenband (p25 / Median / p75)
function classify(value, band, higherIsBetter = true) {
  if (value == null || !band) return null;
  const p25 = num(band.p25), median = num(band.median), p75 = num(band.p75);
  let level;
  if (higherIsBetter) {
    if (value >= p75) level = 'top';
    else if (value >= median) level = 'above';
    else if (value >= p25) level = 'below';
    else level = 'weak';
  } else {
    if (value <= p25) level = 'top';
    else if (value <= median) level = 'above';
    else if (value <= p75) level = 'below';
    else level = 'weak';
  }
  const label = {
    top: 'oberes Viertel', above: 'über dem Median',
    below: 'unter dem Median', weak: 'unteres Viertel',
  }[level];
  const color = { top: 'green', above: 'green', below: 'amber', weak: 'red' }[level];
  return {
    value: r2(value), p25: r2(p25), median: r2(median), p75: r2(p75),
    level, label, color,
    deltaMedian: r2(value - median),
  };
}

// Durchschnittliches jährliches Wachstum (CAGR) aus einer Umsatzreihe
function cagr(revenues) {
  const vals = (revenues || []).map(v => num(v)).filter(v => v > 0);
  if (vals.length < 2) return null;
  const first = vals[0], last = vals[vals.length - 1];
  const periods = vals.length - 1;
  return (Math.pow(last / first, 1 / periods) - 1) * 100;   // in %
}

/**
 * @param {object} metrics  { ebitMargin (%), revenueGrowth (%), personnelRatio (%) }
 * @param {object} bench    Zeile aus valuation_benchmarks für die Branche
 */
function compare(metrics = {}, bench = null) {
  if (!bench) return { available: false, note: 'Für diese Branche liegen noch keine Benchmarks vor.' };

  const items = [];
  const ebit = classify(metrics.ebitMargin, { p25: bench.ebit_margin_p25, median: bench.ebit_margin_median, p75: bench.ebit_margin_p75 }, true);
  // metric = Name der Kennzahl, label (aus classify) = Einordnung („oberes Viertel“ …)
  if (ebit) items.push({ key: 'ebit_margin', metric: 'EBIT-Marge (%)', ...ebit });

  const growth = classify(metrics.revenueGrowth, { p25: bench.growth_p25, median: bench.growth_median, p75: bench.growth_p75 }, true);
  if (growth) items.push({ key: 'revenue_growth', metric: 'Umsatzwachstum p. a. (%)', ...growth });

  if (metrics.personnelRatio != null && bench.personnel_ratio_median != null) {
    const pers = classify(metrics.personnelRatio,
      { p25: bench.personnel_ratio_p25, median: bench.personnel_ratio_median, p75: bench.personnel_ratio_p75 }, false);
    if (pers) items.push({ key: 'personnel_ratio', metric: 'Personalkostenquote (%)', ...pers });
  }

  // Gesamteinordnung: „über Markt" nur bei echter Mehrheit, sonst ehrlich „gemischt"
  const good = items.filter(i => i.color === 'green').length;
  const verdict = !items.length ? null
    : good > items.length / 2 ? 'über Markt'
      : good > 0 ? 'gemischt' : 'unter Markt';

  return {
    available: true,
    industry: bench.industry,
    source: bench.source || 'Phalanx: indikative Branchenwerte',
    items,
    verdict,
    note: 'Branchenwerte sind Orientierungsgrößen für KMU im DACH-Raum, keine amtliche Statistik.',
  };
}

module.exports = { classify, cagr, compare };
