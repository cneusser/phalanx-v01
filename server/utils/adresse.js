// ─────────────────────────────────────────────────────────────────────────────
// Anschriften zerlegen (v0.400).
//
// Marktplätze liefern die Anschrift als eine Zeile: „Albrecht-Dürer-Straße 42,
// 15732 Schulzendorf, Deutschland". Bisher landete genau dieser Satz im Feld
// „Standort" und war damit für Serienbriefe, Sortierung nach Region oder eine
// spätere Übergabe an den Datenpool unbrauchbar.
//
// Hier wird die Zeile in Straße, Postleitzahl, Ort und Land zerlegt. Reine
// Funktionen, keine Datenbank, damit sie einzeln prüfbar bleiben.
//
// Grundsatz: Im Zweifel lieber ein Feld leer lassen als es falsch füllen. Was
// nicht sicher zugeordnet werden kann, bleibt in `rest` stehen und ist im
// Dialog sichtbar, damit ein Mensch es einsortieren kann.
// ─────────────────────────────────────────────────────────────────────────────

const putzen = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().replace(/^[,;]+|[,;]+$/g, '').trim();

// Länder, die in deutschsprachigen Anfragen vorkommen, samt der üblichen
// Schreibweisen und Kürzel. Wert ist die Schreibweise, die wir speichern.
const LAENDER = [
  ['Deutschland', /^(deutschland|germany|brd|de|d)$/i],
  ['Österreich', /^(österreich|oesterreich|austria|at|a)$/i],
  ['Schweiz', /^(schweiz|switzerland|suisse|ch)$/i],
  ['Luxemburg', /^(luxemburg|luxembourg|lu)$/i],
  ['Liechtenstein', /^(liechtenstein|li|fl)$/i],
  ['Niederlande', /^(niederlande|netherlands|nl)$/i],
  ['Belgien', /^(belgien|belgium|be)$/i],
  ['Frankreich', /^(frankreich|france|fr)$/i],
  ['Italien', /^(italien|italy|italia|it)$/i],
  ['Polen', /^(polen|poland|pl)$/i],
  ['Tschechien', /^(tschechien|czechia|cz)$/i],
  ['Vereinigtes Königreich', /^(vereinigtes königreich|united kingdom|england|uk|gb)$/i],
  ['USA', /^(usa|vereinigte staaten|united states|us)$/i],
];

function landErkennen(teil) {
  const t = putzen(teil);
  for (const [name, muster] of LAENDER) if (muster.test(t)) return name;
  return '';
}

// „15732 Schulzendorf" oder „D-91056 Erlangen" oder „CH-8001 Zürich".
// Rückgabe: { postal_code, city } oder null, wenn das Muster nicht passt.
function plzOrt(teil) {
  const t = putzen(teil);
  // Optionales Länderkürzel vor der Postleitzahl abtrennen.
  const m = t.match(/^(?:([A-Za-z]{1,3})\s*-\s*)?(\d{4,6})\s+(.+)$/);
  if (!m) return null;
  const ort = putzen(m[3]);
  if (!ort) return null;
  return { postal_code: m[2], city: ort, kuerzel: m[1] || '' };
}

// Enthält der Teil eine Hausnummer? Dann ist es sehr wahrscheinlich die Straße.
function wirktWieStrasse(teil) {
  const t = putzen(teil);
  if (!t) return false;
  if (/\d{4,}/.test(t)) return false;                       // das ist eher eine Postleitzahl
  return /\d+\s*[a-zA-Z]?$/.test(t) || /(stra(ß|ss)e|str\.|weg|allee|platz|gasse|ring|damm|ufer|chaussee)/i.test(t);
}

/**
 * Eine Anschrift aus einer Zeile (oder mehreren Zeilen) zerlegen.
 * @param {string} roh
 * @returns {{street:string, postal_code:string, city:string, country:string, rest:string}}
 */
function zerlege(roh) {
  const leer = { street: '', postal_code: '', city: '', country: '', rest: '' };
  const text = putzen(String(roh || '').replace(/\n+/g, ', '));
  if (!text) return leer;

  const teile = text.split(',').map(putzen).filter(Boolean);
  const ergebnis = { ...leer };
  const uebrig = [];

  for (const teil of teile) {
    // Ein Landesteil wird immer als solcher erkannt, auch wenn das Land schon
    // aus einem Kuerzel vor der Postleitzahl bekannt ist („CH-8001 … , Schweiz").
    const land = landErkennen(teil);
    if (land) { if (!ergebnis.country) ergebnis.country = land; continue; }
    if (!ergebnis.postal_code) {
      const po = plzOrt(teil);
      if (po) {
        ergebnis.postal_code = po.postal_code;
        ergebnis.city = po.city;
        // „D-91056" nennt nebenbei das Land, wenn es noch nicht bekannt ist.
        if (!ergebnis.country && po.kuerzel) ergebnis.country = landErkennen(po.kuerzel);
        continue;
      }
    }
    if (!ergebnis.street && wirktWieStrasse(teil)) { ergebnis.street = teil; continue; }
    uebrig.push(teil);
  }

  // Ein einzelner ungenutzter Teil ohne Postleitzahl ist meist der Ort.
  if (!ergebnis.city && uebrig.length === 1 && !ergebnis.street) {
    ergebnis.city = uebrig.shift();
  } else if (!ergebnis.city && uebrig.length === 1 && ergebnis.street) {
    ergebnis.city = uebrig.shift();
  }
  // Ist die Straße noch leer, aber ein Teil steht vor der Postleitzahl, gilt er als Straße.
  if (!ergebnis.street && uebrig.length) {
    const ersterMitNummer = uebrig.findIndex(wirktWieStrasse);
    if (ersterMitNummer > -1) ergebnis.street = uebrig.splice(ersterMitNummer, 1)[0];
  }
  ergebnis.rest = uebrig.join(', ');
  return ergebnis;
}

/**
 * Aus den Einzelfeldern wieder eine lesbare Zeile bauen. Das Feld `location`
 * am Kontakt bleibt damit gefüllt, ohne dass es zwei Wahrheiten gibt.
 */
function zeile({ street = '', postal_code = '', city = '', country = '' } = {}) {
  const ortsteil = putzen([postal_code, city].filter(Boolean).join(' '));
  return [putzen(street), ortsteil, putzen(country)].filter(Boolean).join(', ');
}

/** Ist überhaupt etwas Verwertbares dabei? */
function hatInhalt(a) {
  return !!(a && (a.street || a.postal_code || a.city || a.country));
}

module.exports = { zerlege, zeile, hatInhalt, landErkennen, plzOrt, wirktWieStrasse, LAENDER };
