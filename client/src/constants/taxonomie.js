/**
 * Branchen und Regionen für die Oberfläche.
 *
 * Dieselbe Datei wie auf dem Server (shared/taxonomie.json), damit es nicht
 * wieder zwei Wahrheiten gibt. Bis v0.415 gab es vier Branchenlisten mit vier
 * Schreibweisen, und weil der Abgleich Zeichengleichheit verlangte, lieferte
 * ein gesetzter Branchenfilter gar keine Treffer mehr.
 *
 * Gespeichert wird ab hier der Code. Angezeigt wird die Beschriftung in der
 * gewählten Sprache. Ein Bestandswert, den es als Code nicht gibt, wird
 * unverändert angezeigt und beim Speichern nicht angetastet.
 */
import TAX from '../../../shared/taxonomie.json';

export const BRANCHEN = TAX.branchen;
export const REGIONEN = TAX.regionen;

const finde = (liste, wert) => liste.find((e) => e.wert === wert) || null;

export const brancheLabel = (wert, sprache) => {
  const e = finde(BRANCHEN, wert);
  return e ? (sprache === 'en' ? e.en : e.de) : String(wert || '');
};
export const regionLabel = (wert, sprache) => {
  const e = finde(REGIONEN, wert);
  return e ? (sprache === 'en' ? e.en : e.de) : String(wert || '');
};

/**
 * Auswahlmöglichkeiten für ein Mehrfachfeld, inklusive der Bestandswerte.
 *
 * Steht im Profil noch ein alter deutscher Text, den es als Code nicht gibt,
 * erscheint er weiterhin zur Auswahl und bleibt abwählbar. Sonst wäre er beim
 * nächsten Speichern still verschwunden.
 */
export function auswahl(liste, gewaehlt = [], sprache = 'de') {
  const codes = liste.map((e) => ({ wert: e.wert, label: sprache === 'en' ? e.en : e.de }));
  const bekannt = new Set(liste.map((e) => e.wert));
  const fremd = (gewaehlt || [])
    .filter((w) => !bekannt.has(w))
    .map((w) => ({ wert: w, label: String(w), bestand: true }));
  return codes.concat(fremd);
}
