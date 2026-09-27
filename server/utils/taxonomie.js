// ─────────────────────────────────────────────────────────────────────────────
// Branchen und Regionen: ein Code, zwei Beschriftungen, viele Synonyme.
//
// Ausgangslage vor v0.416: vier verschiedene Branchenlisten mit vier
// verschiedenen Schreibweisen. Das Käufer-Suchprofil bot "Maschinenbau" an, ein
// Mandat trug "C28 – Maschinenbau", und der Abgleich in profileMatch verlangte
// Zeichengleichheit. Wer eine Branche ankreuzte, bekam deshalb keine
// Benachrichtigungen mehr, während wer nichts ankreuzte alle bekam. Das war
// kein Schreibfehler, sondern ein stiller Ausfall der Suchprofile.
//
// Deshalb hier: der Code ist das Gespeicherte und ändert sich nie. Die
// Beschriftung ist Anzeige und darf übersetzt werden. Die Synonyme sind die
// Brücke zum Freitext der Mandate, einschließlich aller historischen
// Schreibweisen, damit Bestandsdaten weiter treffen.
//
// Grundsatz wie bei der Firmenart: nichts raten. Was sich nicht eindeutig
// zuordnen lässt, bleibt unverändert stehen und wird gemeldet.
// ─────────────────────────────────────────────────────────────────────────────
const TAX = require('../../shared/taxonomie.json');

const BRANCHEN = TAX.branchen;
const REGIONEN = TAX.regionen;

// Vergleichsform: Kleinschreibung, Umlaute aufgelöst, alles Nichtalphanumerische
// zu einem Leerzeichen. So trifft "Baden-Württemberg" auch "baden wuerttemberg".
function normal(text) {
  return String(text == null ? '' : text)
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tabelle(liste) {
  const m = new Map();
  for (const e of liste) {
    m.set(normal(e.wert), e.wert);
    m.set(normal(e.de), e.wert);
    m.set(normal(e.en), e.wert);
    for (const s of e.synonyme || []) m.set(normal(s), e.wert);
  }
  return m;
}
const BRANCHE_NACH_TEXT = tabelle(BRANCHEN);
const REGION_NACH_TEXT = tabelle(REGIONEN);

/** Code zu einem gespeicherten Text, oder null. Rät nicht. */
const brancheAus = (text) => BRANCHE_NACH_TEXT.get(normal(text)) || null;
const regionAus = (text) => REGION_NACH_TEXT.get(normal(text)) || null;

const brancheVon = (wert) => BRANCHEN.find((b) => b.wert === wert) || null;
const regionVon = (wert) => REGIONEN.find((r) => r.wert === wert) || null;

/** Beschriftung in der gewünschten Sprache, Rückfall auf Deutsch, dann auf den Wert selbst. */
function beschriftung(eintrag, sprache) {
  if (!eintrag) return '';
  return (sprache === 'en' && eintrag.en) ? eintrag.en : eintrag.de;
}
const brancheLabel = (wert, sprache) => beschriftung(brancheVon(wert), sprache) || String(wert || '');
const regionLabel = (wert, sprache) => beschriftung(regionVon(wert), sprache) || String(wert || '');

/**
 * Passt ein Branchencode auf den Branchentext eines Mandats?
 *
 * Geprüft wird in dieser Reihenfolge: NACE-Kennung am Anfang des Textes, dann
 * die Synonyme, dann die Beschriftungen. Ein leerer Code schränkt nicht ein.
 */
function brancheTrifft(wert, mandatText) {
  const e = brancheVon(wert);
  const t = String(mandatText == null ? '' : mandatText).trim();
  if (!e || !t) return false;

  // "C28 – Maschinenbau" beginnt mit der Kennung. Bewusst nur am Anfang:
  // sonst träfe "C2" auch "C20", "C21" und so fort.
  const kennung = (t.match(/^([A-Z]\d{0,2}(?:[–-]\d{1,2})?)/) || [])[1];
  if (kennung) {
    const roh = kennung.replace(/[–-].*/, '');            // "C13–15" → "C13"
    const bis = (kennung.match(/[–-](\d{1,2})$/) || [])[1];
    const buchstabe = roh[0];
    const von = parseInt(roh.slice(1), 10);
    for (const n of e.nace || []) {
      if (n === roh) return true;
      if (!bis || n[0] !== buchstabe) continue;
      const zahl = parseInt(n.slice(1), 10);
      if (Number.isFinite(zahl) && Number.isFinite(von) && zahl >= von && zahl <= parseInt(bis, 10)) return true;
    }
  }
  return brancheAus(t) === wert;
}

/** Passt ein Regionscode auf den Regionstext eines Mandats? */
function regionTrifft(wert, mandatText) {
  const e = regionVon(wert);
  const t = normal(mandatText);
  if (!e || !t) return false;
  if (regionAus(mandatText) === wert) return true;

  // DACH deckt alle drei Länder ab, und ein Mandat "DACH" passt auf jede
  // Region darin. Beides gilt in beide Richtungen.
  const mandatEintrag = regionVon(regionAus(mandatText));
  if (wert === 'dach' && mandatEintrag && mandatEintrag.land) return true;
  if (mandatEintrag && mandatEintrag.wert === 'dach' && e.land) return true;

  // "Deutschland (bundesweit)" deckt jedes deutsche Bundesland ab.
  if (wert === 'de' && mandatEintrag && mandatEintrag.land === 'deutschland') return true;
  if (mandatEintrag && mandatEintrag.wert === 'de' && e.land === 'deutschland') return true;

  // Rückfall für Freitext: der Name der Region steht irgendwo im Text.
  return (e.synonyme || []).concat([e.de]).some((s) => {
    const n = normal(s);
    return n.length > 3 && t.includes(n);
  });
}

module.exports = {
  BRANCHEN, REGIONEN,
  brancheAus, regionAus, brancheVon, regionVon,
  brancheLabel, regionLabel, brancheTrifft, regionTrifft,
  normal,
};
