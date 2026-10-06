// ─────────────────────────────────────────────────────────────────────────────
// Adressen zerlegen und anzeigen (v0.447).
//
// Reine Funktionen, kein Datenbankzugriff, deshalb prüfbar ohne laufendes
// System.
//
// Der Zerleger ist bewusst misstrauisch. Eine Adresse, die falsch zerlegt in
// den Bestand wandert, fällt niemandem auf: „Leopoldstr." ohne Hausnummer
// sieht aus wie eine Adresse, und der Brief kommt trotzdem nicht an. Deshalb
// gibt es hier kein Ergebnis ohne Urteil. Jeder Fall ist entweder sicher oder
// er wird gemeldet, und gemeldet heißt: Ein Mensch sieht ihn an.
//
// Die Grenze verläuft dort, wo Raten anfinge. Fünf Fälle werden nie zerlegt:
//
//   · keine Hausnummer erkennbar
//   · ein Postfach (das hat keine Hausnummer und darf keine bekommen)
//   · mehrere Zahlengruppen, bei denen unklar ist, welche die Hausnummer ist
//   · ein ausländisches Format (Hausnummer vorn, andere Trennzeichen)
//   · zwei Adressen in einem Feld
//
// In allen fünf Fällen bleibt das Originalfeld, wie es ist.
// ─────────────────────────────────────────────────────────────────────────────

const sauber = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();

/** Länder, deren Namen in Beständen vorkommen, auf ISO 3166-1 alpha-2. */
const LAENDER = {
  deutschland: 'DE', germany: 'DE', de: 'DE', brd: 'DE',
  österreich: 'AT', oesterreich: 'AT', austria: 'AT', at: 'AT',
  schweiz: 'CH', switzerland: 'CH', suisse: 'CH', ch: 'CH',
  frankreich: 'FR', france: 'FR', fr: 'FR',
  niederlande: 'NL', netherlands: 'NL', nl: 'NL',
  belgien: 'BE', belgium: 'BE', be: 'BE',
  luxemburg: 'LU', luxembourg: 'LU', lu: 'LU',
  italien: 'IT', italy: 'IT', it: 'IT',
  polen: 'PL', poland: 'PL', pl: 'PL',
  tschechien: 'CZ', 'czech republic': 'CZ', cz: 'CZ',
  'vereinigtes königreich': 'GB', 'united kingdom': 'GB', gb: 'GB', uk: 'GB', england: 'GB',
  usa: 'US', 'united states': 'US', us: 'US',
  spanien: 'ES', spain: 'ES', es: 'ES',
  dänemark: 'DK', daenemark: 'DK', denmark: 'DK', dk: 'DK',
};

/**
 * Einen Ländernamen auf zwei Zeichen bringen.
 *
 * Unbekanntes wird nicht geraten: Ein falsches Länderkürzel ist schlimmer als
 * ein leeres, weil es wie eine gepflegte Angabe aussieht.
 */
function landCode(roh, vorgabe = 'DE') {
  const t = sauber(roh).toLowerCase();
  if (!t) return vorgabe;
  if (/^[a-z]{2}$/.test(t) && LAENDER[t]) return LAENDER[t];
  return LAENDER[t] || null;
}

// Eine Hausnummer am Ende: Ziffern, danach optional Buchstabe, Bereich oder
// Bruchstrich. „12", „12a", „12 a", „12-14", „12/3", „12 bis 14".
const HAUSNUMMER_HINTEN = /^(.*?)[,\s]+(\d{1,4}\s?[a-zA-Z]?(?:\s?(?:-|\/|bis)\s?\d{1,4}\s?[a-zA-Z]?)?)\.?$/;
const POSTFACH = /\b(postfach|p\.?\s?o\.?\s?box|pf)\b/i;
// Hausnummer vorn ist im deutschen Sprachraum untypisch und ein Hinweis auf ein
// ausländisches Format.
const NUMMER_VORN = /^\d{1,5}[a-zA-Z]?[\s,]/;
const ZWEI_ADRESSEN = /;|\s\/\s|\bund\b.*\d|\n/;

/**
 * Eine einzeilige Straßenangabe zerlegen.
 *
 * @returns {{ strasse, hausnummer, sicher, grund }}
 *          sicher = false heißt: nicht übernehmen, sondern melden.
 */
function zerlegeStrasse(roh) {
  const text = sauber(roh);
  if (!text) return { strasse: null, hausnummer: null, sicher: false, grund: 'Keine Angabe vorhanden' };

  if (POSTFACH.test(text)) {
    return { strasse: text, hausnummer: null, sicher: false,
      grund: 'Postfach, das hat keine Hausnummer' };
  }
  if (ZWEI_ADRESSEN.test(text)) {
    return { strasse: text, hausnummer: null, sicher: false,
      grund: 'Sieht nach zwei Angaben in einem Feld aus' };
  }
  if (NUMMER_VORN.test(text)) {
    return { strasse: text, hausnummer: null, sicher: false,
      grund: 'Hausnummer steht vorn, vermutlich ein ausländisches Format' };
  }

  const m = text.match(HAUSNUMMER_HINTEN);
  if (!m) {
    return { strasse: text, hausnummer: null, sicher: false,
      grund: 'Keine Hausnummer erkennbar' };
  }

  const strasse = sauber(m[1]).replace(/[,\s]+$/, '');
  // Nur dort Leerzeichen entfernen, wo sie Schreibweise sind: „12 a" ist
  // dieselbe Hausnummer wie „12a". Bei „12 bis 14" trennt das Leerzeichen
  // zwei Zahlen, und ohne es entstünde „12bis14".
  const hausnummer = sauber(m[2])
    .replace(/(\d)\s+([a-zA-Z])\b/g, '$1$2')
    .replace(/\s*([-/])\s*/g, '$1');
  if (!strasse) {
    return { strasse: text, hausnummer: null, sicher: false, grund: 'Kein Straßenname übrig' };
  }

  // Bleiben im Straßenteil weitere Zahlengruppen stehen, ist nicht zu
  // entscheiden, welche die Hausnummer ist. „Straße des 17. Juni 135" ist
  // eindeutig, „Industriestr 4 7" nicht.
  const restZahlen = (strasse.match(/\d+/g) || []).filter((z) => !/^\d{1,2}\.$/.test(z));
  if (restZahlen.length && !/\d{1,2}\.\s/.test(strasse)) {
    return { strasse: text, hausnummer: null, sicher: false,
      grund: `Mehrere Zahlen, Hausnummer nicht eindeutig (${restZahlen.join(', ')})` };
  }

  return { strasse, hausnummer, sicher: true, grund: null };
}

/**
 * Einen ganzen Firmendatensatz beurteilen.
 *
 * Erwartet die alten Felder und sagt, was daraus würde. Geschrieben wird hier
 * nichts: Diese Funktion ist der Trockenlauf.
 */
function vorschlagFuer(firma) {
  const s = zerlegeStrasse(firma.street);
  const land = landCode(firma.country, 'DE');
  const hinweise = [];
  if (!s.sicher && s.grund) hinweise.push(s.grund);
  if (firma.country && !land) hinweise.push(`Land "${sauber(firma.country)}" ist nicht zugeordnet`);
  if (firma.postal_code && !/^\d{4,5}$/.test(sauber(firma.postal_code)) && land === 'DE') {
    hinweise.push(`Postleitzahl "${sauber(firma.postal_code)}" passt nicht zu Deutschland`);
  }

  const sicher = s.sicher && (land !== null);
  return {
    id: firma.id,
    name: firma.name,
    original: sauber(firma.street) || null,
    vorschlag: {
      strasse: s.sicher ? s.strasse : null,
      hausnummer: s.sicher ? s.hausnummer : null,
      plz: sauber(firma.postal_code) || null,
      ort: sauber(firma.city) || null,
      land: land || null,
    },
    sicher,
    hinweise,
  };
}

/**
 * Die Anzeigezeile. Berechnet, nie gespeichert.
 *
 * Eine gespeicherte Anzeigezeile ist eine zweite Wahrheit: Sie veraltet, sobald
 * jemand ein Feld ändert, und niemand bemerkt es.
 */
function anzeigeZeilen(f, eigenesLand = 'DE') {
  const zeilen = [];
  const eins = [sauber(f.strasse), sauber(f.hausnummer)].filter(Boolean).join(' ');
  if (eins) zeilen.push(eins);
  if (sauber(f.adresszusatz)) zeilen.push(sauber(f.adresszusatz));
  const zwei = [sauber(f.plz), sauber(f.ort)].filter(Boolean).join(' ');
  if (zwei) zeilen.push(zwei);
  const land = sauber(f.land).toUpperCase();
  if (land && land !== eigenesLand) zeilen.push(land);
  return zeilen;
}

/** Dieselbe Anschrift in einer Zeile, für Listen und Suchfelder. */
const anzeige = (f, eigenesLand = 'DE') => anzeigeZeilen(f, eigenesLand).join(', ');

/**
 * Eingehende Adressfelder prüfen und auf die erlaubten Werte bringen.
 *
 * Nur Firmenanschriften. Eine Privatanschrift gehört einer Person und nicht in
 * den Firmenstamm; sie ließe sich später nicht mehr von einer Geschäftsadresse
 * unterscheiden.
 */
function eingangPruefen(roh) {
  const b = roh || {};
  const fehler = [];
  const felder = {};

  const text = (name, max) => {
    const v = sauber(b[name]);
    if (!v) return;
    if (v.length > max) { fehler.push(`${name} ist länger als ${max} Zeichen.`); return; }
    felder[name] = v;
  };
  text('strasse', 200);
  text('hausnummer', 20);
  text('adresszusatz', 200);
  text('plz', 10);
  text('ort', 120);

  if (b.land != null && sauber(b.land)) {
    const l = sauber(b.land).toUpperCase();
    if (!/^[A-Z]{2}$/.test(l)) fehler.push('land muss zwei Zeichen nach ISO 3166-1 alpha-2 sein, zum Beispiel DE.');
    else felder.land = l;
  }
  return { felder, fehler };
}

module.exports = {
  zerlegeStrasse, vorschlagFuer, anzeigeZeilen, anzeige, landCode, eingangPruefen, LAENDER,
};
