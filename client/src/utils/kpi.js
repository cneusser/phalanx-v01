// Kennzahlen-Kacheln der Mandate zeigen bewusst Freitext ("€ 3,5 Mio.", "~26 %"),
// damit Bandbreiten und Zusätze möglich sind. Steht in einem Feld versehentlich
// eine nackte Zahl, würde sie roh erscheinen ("10" statt "10 %", "7500000" statt
// "€ 7,5 Mio."). Dieser Helfer fängt genau diesen Fall ab: Nur wenn der Wert
// ausschließlich aus einer Zahl besteht, wird formatiert; alles andere bleibt
// unverändert stehen.
const NUR_ZAHL = /^-?\d+(?:[.,]\d+)?$/;

function geldText(n) {
  const de = (x, max) => x.toLocaleString('de-DE', { maximumFractionDigits: max });
  const a = Math.abs(n);
  if (a >= 1e9) return `€ ${de(n / 1e9, 2)} Mrd.`;
  if (a >= 1e6) return `€ ${de(n / 1e6, 2)} Mio.`;
  if (a >= 1000) return `€ ${de(n / 1000, 0)} Tsd.`;
  return `€ ${de(n, 0)}`;
}

// art: 'geld' | 'prozent' | 'text'
export function kpiWert(value, art = 'text') {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (!NUR_ZAHL.test(s)) return s;            // bereits formatiert: unverändert lassen
  const n = Number(s.replace(',', '.'));
  if (!Number.isFinite(n)) return s;
  if (art === 'prozent') return `${n.toLocaleString('de-DE')} %`;
  if (art === 'geld') return geldText(n);
  return s;
}

export default kpiWert;
