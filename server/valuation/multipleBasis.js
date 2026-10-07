// ─────────────────────────────────────────────────────────────────────────────
// Welche Kennzahl wird mit dem Multiple multipliziert? (v0.448)
//
// Anlass: Die DUB KMU-Multiples sind EBITDA-Multiples. Die Seite sagt es
// zweimal, und die Beispielrechnung dort lautet „bereinigter EBITDA 0,5 Mio. €
// x EBITDA-Faktor 5,0". Beide Engines dieses Hauses multiplizierten aber den
// EBIT. Das galt auch für den Stand Q2/2026, der ebenfalls EBITDA-Zahlen
// enthielt.
//
// Der Fehler ist nicht klein. EBIT und EBITDA unterscheiden sich um die
// Abschreibungen; bei einem anlagenintensiven Betrieb ist das ein Viertel des
// Ergebnisses und mehr. Ein EBITDA-Multiple auf den EBIT angewandt ergibt
// einen zu niedrigen Unternehmenswert, und zwar systematisch in eine Richtung.
// Das ist in einer Bewertung die unangenehmste Art von Fehler: Er sieht nach
// Vorsicht aus.
//
// Diese Datei hat eine einzige Aufgabe: die richtige Basis zu bestimmen und zu
// sagen, woher sie stammt. Sie rät nichts. Fehlen die Abschreibungen, wird mit
// dem EBIT gerechnet UND das Ergebnis trägt den Hinweis, dass es zu niedrig
// ist. Eine geschätzte Abschreibungsquote wäre bequemer und falsch: Sie sähe
// aus wie eine Angabe des Unternehmens.
// ─────────────────────────────────────────────────────────────────────────────

const zahl = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const mittel = (a) => (a && a.length ? a.reduce((s, v) => s + zahl(v), 0) / a.length : 0);

/**
 * Die Basis für das Multiplikatorverfahren.
 *
 * @param input          der Fragebogen
 * @param bereinigtEbit  das bereits bereinigte EBIT (Gehalt, Einmaleffekte, Miete)
 * @returns {{ basis, kennzahl, afa, herkunft, hinweis }}
 */
function basisFuerMultiple(input, bereinigtEbit) {
  const ebitdas = (input.ebitdas || []).map(zahl).filter((v) => v !== 0);
  const rohEbit = mittel((input.ebits || []).map(zahl));

  // 1. Bester Fall: Das Unternehmen hat EBITDA angegeben. Die Bereinigungen
  //    wirken auf beide Kennzahlen gleich, deshalb wird die Differenz zwischen
  //    rohem und bereinigtem EBIT übernommen.
  if (ebitdas.length) {
    const rohEbitda = mittel(ebitdas);
    const korrektur = bereinigtEbit - rohEbit;
    return {
      basis: rohEbitda + korrektur,
      kennzahl: 'ebitda',
      afa: Math.round(rohEbitda - rohEbit),
      herkunft: 'EBITDA aus den Angaben',
      hinweis: null,
    };
  }

  // 2. Zweitbester Fall: EBIT und Abschreibungen liegen vor.
  const afa = zahl(input.depreciation);
  if (afa > 0) {
    return {
      basis: bereinigtEbit + afa,
      kennzahl: 'ebitda',
      afa: Math.round(afa),
      herkunft: 'EBITDA aus EBIT zuzüglich Abschreibungen',
      hinweis: null,
    };
  }

  // 3. Rückfall: nur EBIT. Gerechnet wird, aber das Ergebnis sagt, was fehlt.
  return {
    basis: bereinigtEbit,
    kennzahl: 'ebit',
    afa: null,
    herkunft: 'EBIT, Abschreibungen fehlen',
    hinweis: 'Die Multiples sind EBITDA-Multiples. Ohne Angabe der Abschreibungen wurde '
      + 'ersatzweise mit dem EBIT gerechnet; der Unternehmenswert fällt dadurch zu niedrig aus. '
      + 'Bitte Abschreibungen oder EBITDA nachtragen.',
  };
}

module.exports = { basisFuerMultiple };
