// ─────────────────────────────────────────────────────────────────────────────
// Klarnamen in Unterlagen finden (v0.427).
//
// Anlass: Ein Interessent hat Christian im Gespräch auf einzelne Mitarbeiter
// beim Namen angesprochen. In einem anonymen Verkaufsprozess ist das der
// schlimmste denkbare Durchstich: Die Belegschaft weiß in der Regel nichts vom
// Verkauf, und ein Name, der den Datenraum verlässt, lässt sich nicht
// zurückholen.
//
// Zwei Wege, einen Namen zu erkennen:
//
//   1. Abgleich mit dem, was wir wissen. Zu jedem Mandat kennt das System die
//      Kontakte der Firma, den Verkäufer und die Ansprechpersonen. Diese Namen
//      im Text zu suchen, ist kein Raten, sondern ein Vergleich.
//   2. Muster, die fast immer eine Person bezeichnen: eine Anrede mit
//      folgendem Wort, ein akademischer Titel, eine E-Mail-Adresse, eine
//      Telefonnummer, eine Unterschriftenzeile.
//
// Was hier NICHT passiert: Namen erfinden oder erraten. Zwei großgeschriebene
// Wörter nebeneinander sind in einem deutschen Text meist kein Name, und eine
// Prüfung, die bei jedem zweiten Satz anschlägt, schaut sich nach einer Woche
// niemand mehr an.
//
// Und was ebenfalls nicht passiert: automatisch ändern. Gemeldet wird mit
// Fundstelle und Umgebung, entscheiden muss ein Mensch.
// ─────────────────────────────────────────────────────────────────────────────

/** Wörter, die nach einer Anrede stehen können, ohne ein Name zu sein. */
const KEINE_NAMEN = new Set([
  'und', 'oder', 'der', 'die', 'das', 'dr', 'prof', 'dipl', 'ing', 'kaufmann',
  'kauffrau', 'geschaeftsfuehrer', 'geschäftsführer', 'geschäftsführerin',
  'inhaber', 'inhaberin', 'kollege', 'kollegin', 'mitarbeiter', 'mitarbeiterin',
  'x', 'y', 'z', 'nn', 'muster', 'mustermann', 'musterfrau',
]);

const MUSTER = [
  { art: 'anrede', regex: /\b(?:Herrn?|Frau)\s+((?:Dr\.|Prof\.|Dipl\.-?\w*\.?\s*)*[A-ZÄÖÜ][a-zäöüß]{2,}(?:\s+[A-ZÄÖÜ][a-zäöüß]{2,})?)/g,
    hinweis: 'Anrede mit Namen' },
  { art: 'titel', regex: /\b(?:Dipl\.-?\s?\w+\.?|Dr\.|Prof\.)\s+[A-ZÄÖÜ][a-zäöüß]{2,}(?:\s+[A-ZÄÖÜ][a-zäöüß]{2,})?/g,
    hinweis: 'Akademischer Titel mit Namen' },
  { art: 'email', regex: /\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g,
    hinweis: 'E-Mail-Adresse' },
  { art: 'telefon', regex: /(?:\+49|0)\s?[1-9][\d\s/().-]{7,}\d/g,
    hinweis: 'Telefonnummer' },
  { art: 'unterschrift', regex: /\b(?:gez\.|i\.\s?V\.|ppa\.)\s*[A-ZÄÖÜ][a-zäöüß]{2,}/g,
    hinweis: 'Unterschriftenzeile' },
];

/** Vergleichsform: Umlaute aufgelöst, Kleinschreibung, nur Buchstaben. */
function normal(text) {
  return String(text == null ? '' : text)
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Bekannte Namen aufbereiten. Zu kurze oder mehrdeutige Bestandteile fallen
 * weg: Ein Nachname wie „Ott" trifft sonst „Otto", „Schrott" und jedes zweite
 * Wort, und dann ist der Bericht wertlos.
 */
function namensteile(namen) {
  const raus = new Set();
  for (const n of namen || []) {
    const ganz = String(n || '').trim();
    if (!ganz) continue;
    if (ganz.split(/\s+/).length > 1) raus.add(ganz);      // vollständiger Name
    for (const teil of ganz.split(/\s+/)) {
      if (teil.length >= 5 && !KEINE_NAMEN.has(normal(teil))) raus.add(teil);
    }
  }
  return [...raus];
}

/** Ein Stück Text um die Fundstelle, damit man es einordnen kann. */
function umgebung(text, index, laenge) {
  const von = Math.max(0, index - 45);
  const bis = Math.min(text.length, index + laenge + 45);
  return (von > 0 ? '…' : '') + text.slice(von, bis).replace(/\s+/g, ' ') + (bis < text.length ? '…' : '');
}

/**
 * Einen Text prüfen.
 *
 * @param text      der zu prüfende Inhalt
 * @param bekannt   Namen, die das System zu diesem Mandat kennt
 * @returns [{ art, treffer, hinweis, umgebung }]
 */
function pruefeText(text, bekannt = []) {
  const inhalt = String(text == null ? '' : text);
  if (!inhalt.trim()) return [];
  const funde = [];
  const gesehen = new Set();

  // 1. Bekannte Namen: kein Raten, sondern ein Vergleich.
  for (const name of namensteile(bekannt)) {
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&').replace(/\\s+/g, '\\\\s+')}\\b`, 'gi');
    let m;
    while ((m = re.exec(inhalt)) !== null) {
      const schluessel = `bekannt:${m[0].toLowerCase()}:${m.index}`;
      if (gesehen.has(schluessel)) continue;
      gesehen.add(schluessel);
      funde.push({ art: 'bekannt', treffer: m[0], hinweis: 'Name aus dem Kontaktbestand dieses Mandats',
        umgebung: umgebung(inhalt, m.index, m[0].length) });
    }
  }

  // 2. Muster, die fast immer eine Person bezeichnen.
  for (const { art, regex, hinweis } of MUSTER) {
    const re = new RegExp(regex.source, regex.flags);
    let m;
    while ((m = re.exec(inhalt)) !== null) {
      const wort = (m[1] || m[0]).trim();
      const letztes = wort.split(/\s+/).pop();
      if (KEINE_NAMEN.has(normal(letztes))) continue;
      const schluessel = `${art}:${wort.toLowerCase()}:${m.index}`;
      if (gesehen.has(schluessel)) continue;
      gesehen.add(schluessel);
      funde.push({ art, treffer: wort, hinweis, umgebung: umgebung(inhalt, m.index, m[0].length) });
    }
  }
  return funde;
}

/**
 * Ein ganzes Mandat prüfen.
 *
 * @param felder  [{ bereich, feld, text }]  was ein Interessent zu sehen bekommt
 * @param bekannt Namen aus dem Kontaktbestand
 */
function pruefeMandat(felder, bekannt = []) {
  const raus = [];
  for (const f of felder || []) {
    for (const fund of pruefeText(f.text, bekannt)) {
      raus.push({ bereich: f.bereich, feld: f.feld, ...fund });
    }
  }
  return raus;
}

module.exports = { pruefeText, pruefeMandat, namensteile, normal, MUSTER, KEINE_NAMEN };
