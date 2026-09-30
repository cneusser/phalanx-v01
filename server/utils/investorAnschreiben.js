// ─────────────────────────────────────────────────────────────────────────────
// Investoren-Anschreiben einlesen (v0.439).
//
// Anlass: Es kommen regelmäßig Vorstellungsmails von Beteiligungsgesellschaften
// herein, die ihr Akquisitionsprofil gleich mitliefern: Sektor, Region,
// Zielgröße. Bisher landete das in keiner Datenbank, sondern im Postfach. Beim
// nächsten Mandat wusste niemand mehr, wer wonach sucht.
//
// Diese Datei zerlegt so eine Mail. Reine Funktion, kein Datenbankzugriff,
// deshalb prüfbar ohne laufendes System.
//
// Drei Grundsätze, die den Zuschnitt bestimmen:
//
//   1. Zu jedem erkannten Wert wird die Zeile mitgeliefert, aus der er stammt.
//      Wer eine Übernahme bestätigen soll, muss sehen können, worauf sie
//      beruht. Ein Formular mit fertigen Werten und ohne Herkunft lädt dazu
//      ein, ungeprüft zu bestätigen.
//   2. Was nicht sicher erkennbar ist, bleibt leer und wird gemeldet. Geraten
//      wird nichts. Ein falscher Wert im Bestand ist teurer als ein leeres
//      Feld, weil ihn niemand mehr hinterfragt.
//   3. Die Bitte um Aufnahme in einen Verteiler wird im Wortlaut festgehalten,
//      zusammen mit der Adresse, die in dieser Bitte genannt wird. Oft ist das
//      eine andere als die des Absenders. Übernommen wird dann genau die
//      genannte, nicht beide.
// ─────────────────────────────────────────────────────────────────────────────

const tax = require('./taxonomie');

// Der Gedankenstrich als Bereichszeichen kommt in solchen Mails vor. Im
// Quelltext steht er als Fluchtfolge, weil die Textprüfung dieses Hauses
// Gedankenstriche in Fließtext nicht zulässt.
const STRICH = '[-\\u2013\\u2014]';

const sauber = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();

/** Zeilen ohne Leerzeilen, mit erhaltener Reihenfolge. */
function zeilen(text) {
  return String(text || '').split(/\r?\n/).map((z) => z.trim()).filter(Boolean);
}

/** Die erste Zeile, die zum Muster passt, als Beleg mitgeben. */
function finde(zl, regex) {
  for (const z of zl) {
    const m = z.match(regex);
    if (m) return { treffer: m, beleg: z };
  }
  return null;
}

/** Ein Wert mit seiner Herkunft. Ohne Wert gibt es auch keinen Beleg. */
const wert = (v, beleg) => (v ? { wert: sauber(v), beleg: sauber(beleg) } : null);

// ── E-Mail-Adressen ─────────────────────────────────────────────────────────
const MAIL = /[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/g;

/**
 * Adressen einsammeln, aber nur echte.
 *
 * In Mails stehen Adressen oft doppelt: einmal als Text, einmal im Ziel eines
 * Verweises. Doppelte werden zusammengefasst, die Reihenfolge bleibt.
 */
function adressen(text) {
  const raus = [];
  for (const a of String(text || '').match(MAIL) || []) {
    const k = a.toLowerCase();
    if (!raus.includes(k)) raus.push(k);
  }
  return raus;
}

// ── Zahlenbereiche wie „10-100 Mio. €" ──────────────────────────────────────
const zahl = (s) => {
  const n = Number(String(s).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/**
 * Einen Bereich hinter einem Stichwort lesen, in Millionen.
 *
 * Erkannt werden „Umsatz 10-100 Mio. €", „EBITDA 2-15 Mio." und ein einzelner
 * Wert wie „ab 5 Mio.". Fehlt die Einheit, wird nichts gelesen: eine Zahl ohne
 * Einheit ist keine Größenangabe, sondern eine Vermutung.
 */
function bereich(text, stichwort) {
  // Die Klammer um das Stichwort ist nicht Kosmetik: ohne sie bindet
  // "Umsatz|Revenue[^\\d]..." als "Umsatz" ODER "Revenue gefolgt vom Rest",
  // und dann trifft das blosse Wort ohne jede Zahl.
  const re = new RegExp(
    '(?:' + stichwort + ')[^\\d]{0,20}(\\d+(?:[.,]\\d+)?)\\s*(?:' + STRICH + '|bis)\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:Mio|Mill)',
    'i');
  const m = String(text || '').match(re);
  if (m) return { von: zahl(m[1]), bis: zahl(m[2]), beleg: sauber(m[0]) };

  const einzeln = new RegExp('(?:' + stichwort + ')[^\\d]{0,20}(\\d+(?:[.,]\\d+)?)\\s*(?:Mio|Mill)', 'i');
  const e = String(text || '').match(einzeln);
  if (e) return { von: zahl(e[1]), bis: null, beleg: sauber(e[0]) };
  return null;
}

// ── Anschrift ───────────────────────────────────────────────────────────────
//
// Signaturen schreiben die Anschrift gern in eine Zeile, getrennt durch
// senkrechte Striche: „Leopoldstr. 21 | 80802 München | Germany".
const PLZ_ORT = /\b(\d{4,5})\s+([A-ZÄÖÜ][\wäöüß.\- ]{2,40})\b/;

function anschrift(zl) {
  for (const z of zl) {
    const m = z.match(PLZ_ORT);
    if (!m) continue;
    const teile = z.split('|').map((t) => t.trim()).filter(Boolean);
    const mitPlz = teile.findIndex((t) => PLZ_ORT.test(t));
    return {
      strasse: mitPlz > 0 ? sauber(teile[mitPlz - 1]) : '',
      plz: m[1],
      ort: sauber(m[2]).replace(/\s*\|.*$/, ''),
      land: mitPlz >= 0 && teile[mitPlz + 1] ? sauber(teile[mitPlz + 1]) : '',
      beleg: sauber(z),
    };
  }
  return null;
}

// ── Sektor und Region über die Taxonomie ────────────────────────────────────
//
// Geraten wird nicht: Nur was die Taxonomie kennt, wird zugeordnet. Ein
// unbekannter Sektor bleibt als Freitext stehen und wird gemeldet.
function sektor(zl) {
  // Nur eine Angabezeile zaehlt: Aufzaehlungszeichen am Anfang, Stichwort,
  // Doppelpunkt. Ohne diese Enge traf "Fokus" das Wort "fokussiert" mitten im
  // Fliesstext, und als Sektor stand ein halber Satz im Feld.
  const f = finde(zl, /^[*\-\u2022\s]*(?:Sektor|Branche|Industrie|Industry|Sector|Fokus|Branchenfokus)\s*:\s*(.+)$/i);
  if (!f) return null;
  const text = sauber(f.treffer[1]).replace(/^[*\-•\s]+/, '');
  const code = tax.brancheAus(text);
  return { text, wert: code || null, beleg: f.beleg };
}

function regionen(zl) {
  const f = finde(zl, /^[*\-\u2022\s]*(?:Region|Regionen|Geographie|Geografie|Geography|L(?:ä|ae)nder)\s*:\s*(.+)$/i);
  if (!f) return null;
  const text = sauber(f.treffer[1]).replace(/^[*\-•\s]+/, '');
  const gefunden = [];
  // Erst die Klammerangabe prüfen: „Deutschland, Österreich, Schweiz (DACH)"
  // meint DACH, und drei Einzelregionen wären dieselbe Aussage in umständlich.
  const klammer = text.match(/\(([^)]+)\)/);
  if (klammer) {
    const c = tax.regionAus(sauber(klammer[1]));
    if (c) gefunden.push(c);
  }
  if (!gefunden.length) {
    for (const teil of text.split(/[,;/]| und /i)) {
      const c = tax.regionAus(sauber(teil).replace(/\(.*\)/, ''));
      if (c && !gefunden.includes(c)) gefunden.push(c);
    }
  }
  return { text, werte: gefunden, beleg: f.beleg };
}

// ── Die Bitte um Aufnahme in einen Verteiler ────────────────────────────────
const VERTEILER = /(newsletter|verteiler|mailing\s*liste|distribution list)/i;

function verteilerbitte(text) {
  // Bewusst nicht zeilenweise: In einer echten Mail steht die Bitte oft ueber
  // zwei Zeilen, und die Adresse landet auf der zweiten. Zeilenweise gelesen
  // faende man die Bitte, aber nicht die Adresse, und dann waere die
  // persoenliche Adresse des Absenders in den Verteiler gewandert. Genau das
  // soll hier nicht passieren.
  const fliess = String(text || '').replace(/\s+/g, ' ');
  const saetze = fliess.split(/(?<=[.!?])\s+/);
  for (const satz of saetze) {
    if (!VERTEILER.test(satz)) continue;
    if (!/(f(ü|ue)gen|aufnehmen|hinzuf(ü|ue)gen|eintragen|add|subscribe)/i.test(satz)) continue;
    const adr = adressen(satz);
    return { beleg: sauber(satz), adresse: adr[0] || null };
  }
  return null;
}


/**
 * Ein Anschreiben zerlegen.
 *
 * @param text  der eingefügte Mailtext
 * @returns {{ felder, offen, beleg }}
 *   felder  die erkannten Angaben
 *   offen   was nicht erkannt wurde, im Klartext
 */
function lese(text) {
  const roh = String(text || '');
  const zl = zeilen(roh);
  const offen = [];

  // Firma: bevorzugt aus der Signatur, denn dort steht die Rechtsform.
  const rechtsform = finde(zl, /^([A-ZÄÖÜ][\w&.\- äöüßA-Za-z]{2,60}?(?:GmbH(?:\s*&\s*Co\.?\s*KG)?|AG|SE|Ltd\.?|B\.?V\.?|S\.?A\.?))\s*$/);
  const vorstellung = finde(zl, /^([A-ZÄÖÜ][\w&.\- äöüßA-Za-z]{2,60}?)\s+ist\s+eine\b/);
  const firma = wert(rechtsform ? rechtsform.treffer[1] : (vorstellung ? vorstellung.treffer[1] : ''),
    rechtsform ? rechtsform.beleg : (vorstellung ? vorstellung.beleg : ''));
  if (!firma) offen.push('Firmenname nicht sicher erkannt');

  const termin = finde(zl, /(https?:\/\/(?:www\.)?(?:calendly\.com|cal\.com|doodle\.com)\/[^\s)|]+)/i);
  // Die Webseite ist die Adresse, die kein Terminlink ist. Ohne diese Grenze
  // stand der Kalender der Person als Webseite der Gesellschaft im Bestand.
  const KEIN_WEB = /calendly\.com|cal\.com|doodle\.com|linkedin\.com|xing\.com/i;
  let web = null;
  for (const z of zl) {
    for (const m of z.matchAll(/(https?:\/\/|www\.)([\w.-]+\.[a-z]{2,})(\/[^\s)|"']*)?/gi)) {
      const roh = m[0].replace(/[.,;:)]+$/, '');
      if (KEIN_WEB.test(roh)) continue;
      web = { treffer: [roh, roh.startsWith('http') ? roh : 'https://' + roh], beleg: z };
      break;
    }
    if (web) break;
  }

  const tel = finde(zl, /(?:^|[\s|])(?:t|tel|telefon|phone|m|mobil)\s*:\s*(\+?[\d\s()/.-]{7,25})/i)
    || finde(zl, /(\+49[\d\s()/.-]{7,25})/);

  const gf = finde(zl, /Gesch(?:ä|ae)ftsf(?:ü|ue)hr(?:er|ung)\s*:?\s*([^|]+)/i);
  const hrb = finde(zl, /(Amtsgericht\s+[\wäöüß]+\s+HRB\s*\d+)/i);

  // Die Person: Zeile direkt vor einer Rollenbezeichnung, oder die Zeile mit
  // der persoenlichen Adresse. Erkennt die Mail keine, bleibt das Feld leer.
  let person = null;
  for (let i = 0; i < zl.length; i++) {
    if (/^(Founding Member|Partner|Managing (?:Director|Partner)|Gesch(?:ä|ae)ftsf(?:ü|ue)hrer|Director|Principal|Investment Manager)\b/i.test(zl[i])
        && i > 0 && /^[A-ZÄÖÜ][\wäöüß.-]+(?:\s+[A-ZÄÖÜ][\wäöüß.-]+){1,3}$/.test(zl[i - 1])) {
      person = { wert: sauber(zl[i - 1]), rolle: sauber(zl[i]), beleg: `${zl[i - 1]} / ${zl[i]}` };
      break;
    }
  }
  if (!person) offen.push('Ansprechpartner nicht sicher erkannt');

  const alle = adressen(roh);
  const bitte = verteilerbitte(roh);
  // Die persoenliche Adresse ist die, die nicht in der Verteiler-Bitte steht.
  const persoenlich = alle.find((a) => !bitte || a !== bitte.adresse) || null;
  if (!persoenlich) offen.push('Keine E-Mail-Adresse gefunden');

  const s = sektor(zl);
  if (!s) offen.push('Sektor nicht angegeben');
  else if (!s.wert) offen.push(`Sektor "${s.text}" ist im Vokabular nicht hinterlegt`);

  const r = regionen(zl);
  if (!r) offen.push('Region nicht angegeben');
  else if (!r.werte.length) offen.push(`Region "${r.text}" ist im Vokabular nicht hinterlegt`);

  const umsatz = bereich(roh, 'Umsatz|Revenue');
  const ebitda = bereich(roh, 'EBITDA');
  if (!umsatz && !ebitda) offen.push('Keine Größenangabe (Umsatz oder EBITDA) gefunden');

  return {
    felder: {
      firma,
      person,
      email: persoenlich ? { wert: persoenlich, beleg: 'Signatur' } : null,
      telefon: tel ? wert(tel.treffer[1], tel.beleg) : null,
      website: web ? wert(web.treffer[1], web.beleg) : null,
      anschrift: anschrift(zl),
      geschaeftsfuehrer: gf ? wert(gf.treffer[1], gf.beleg) : null,
      registereintrag: hrb ? wert(hrb.treffer[1], hrb.beleg) : null,
      terminlink: termin ? wert(String(termin.treffer[1]).replace(/[.,;:)]+$/, ''), termin.beleg) : null,
      sektor: s,
      regionen: r,
      umsatz,
      ebitda,
      verteiler: bitte,
    },
    offen,
  };
}

module.exports = { lese, bereich, anschrift, sektor, regionen, verteilerbitte, adressen };
