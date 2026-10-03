// ─────────────────────────────────────────────────────────────────────────────
// Freitextsuche über mehrere Spalten, unabhängig von der Wortstellung (v0.445).
//
// Anlass: Die Suche nach „Bauer Daniel" fand nichts, die nach „Daniel Bauer"
// schon. Der Grund steckte in einer Zeile, die auf den ersten Blick richtig
// aussieht:
//
//   (last_name ILIKE '%Bauer Daniel%' OR first_name ILIKE '%Bauer Daniel%' …)
//
// Die Eingabe wurde als ein Stück behandelt und gegen jede Spalte einzeln
// gehalten. Kein einzelnes Feld enthält aber beide Namen, und so findet die
// Abfrage nichts, obwohl die Person im Bestand steht. Wer das einmal erlebt,
// traut der Suche danach nicht mehr und sucht Umwege.
//
// Hier wird die Eingabe stattdessen in Wörter zerlegt. Jedes Wort muss
// irgendwo vorkommen, egal in welcher Spalte und in welcher Reihenfolge:
//
//   „Bauer Daniel"  → (… ILIKE '%Bauer%') AND (… ILIKE '%Daniel%')
//
// Damit trifft „Daniel Bauer", „Bauer Daniel", „Bauer, Daniel", und auch
// „bauer gmail" findet die Person über Nachname und Adresse zusammen.
//
// Zwei Festlegungen, die Überraschungen vermeiden:
//
//   · UND zwischen den Wörtern, ODER zwischen den Spalten. Ein zweites Wort
//     soll die Treffermenge verkleinern. Wäre es ODER, würde jede weitere
//     Eingabe die Liste verlängern, und das versteht niemand.
//   · Die Platzhalterzeichen von LIKE werden entschärft. Sonst wirkt ein
//     eingetipptes Prozentzeichen als „alles" und ein Unterstrich als „ein
//     beliebiges Zeichen", und die Suche gibt Treffer aus, die niemand
//     gesucht hat.
// ─────────────────────────────────────────────────────────────────────────────

/** Die Sonderzeichen von LIKE unschädlich machen. */
function entschaerfen(wort) {
  return String(wort).replace(/[\\%_]/g, (z) => `\\${z}`);
}

/**
 * Eine Freitexteingabe in eine Bedingung und ihre Werte übersetzen.
 *
 * @param q        die Eingabe
 * @param spalten  die zu durchsuchenden Spalten, zum Beispiel ['k.last_name', 'k.email']
 * @param maxWorte Schutz vor sehr langen Eingaben
 * @returns {{ bedingung, werte }} oder null, wenn nichts zu suchen ist
 */
function suchBedingung(q, spalten, maxWorte = 6) {
  const worte = String(q == null ? '' : q).trim().split(/\s+/).filter(Boolean).slice(0, maxWorte);
  if (!worte.length || !spalten.length) return null;

  const teile = [];
  const werte = [];
  for (const wort of worte) {
    teile.push(`(${spalten.map((s) => `${s} ILIKE ? ESCAPE '\\'`).join(' OR ')})`);
    for (let i = 0; i < spalten.length; i++) werte.push(`%${entschaerfen(wort)}%`);
  }
  return { bedingung: teile.join(' AND '), werte };
}

module.exports = { suchBedingung, entschaerfen };
