// ─────────────────────────────────────────────────────────────────────────────
// Ein ZIP-Strom, unabhängig davon, wie das Paket gerade heisst (v0.482)
//
// Gefunden hat das der neue Prüfstand, beim allerersten Durchlauf des
// Testdrehbuchs, Punkt 4.9: „das Archiv eines Ordners lässt sich ziehen"
// antwortete mit 500. Im Protokoll stand ein Satz:
//
//     TypeError: archiver is not a function
//
// Der Grund: `archiver` liefert in Fassung 8 keine aufrufbare Funktion mehr,
// sondern benannte Ausfuhren, darunter `ZipArchive`. Der Aufruf
// `archiver('zip', …)` an zwei Stellen in safe.js lief damit in einen
// Serverfehler, und zwar bei jedem Versuch, einen Ordner oder den ganzen
// Datenraum als Archiv zu laden.
//
// Das ist der zweite Beleg für den Wert dieses Prüfstands, und einer gegen
// mich: Die Umstellung kam aus einer Paketaktualisierung, und keine der
// bestehenden Prüfungen konnte sie sehen, weil sie alle nur Quelltext lesen.
// Eine Textprüfung findet `archiver('zip', …)` und hält es für richtig.
//
// Diese Datei nimmt beide Formen. Das ist hier keine Bequemlichkeit: Wer die
// Fassung des Pakets später wieder ändert, soll nicht in dieselbe Falle laufen.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Einen ZIP-Strom anlegen.
 *
 * @param {{zlib?: object}} optionen
 * @returns ein Objekt mit append(), pipe(), finalize(), on(), pointer()
 */
function zipStrom(optionen = { zlib: { level: 6 } }) {
  const paket = require('archiver');
  // Fassung 7 und früher: aufrufbar.
  if (typeof paket === 'function') return paket('zip', optionen);
  // Fassung 8: benannte Ausfuhren.
  if (paket && typeof paket.ZipArchive === 'function') return new paket.ZipArchive(optionen);
  // Manche Bündler legen die alte Form unter `default` ab.
  if (paket && typeof paket.default === 'function') return paket.default('zip', optionen);
  throw new Error('Das Paket „archiver" liefert keine bekannte Form. Archive sind derzeit nicht möglich.');
}

module.exports = { zipStrom };
