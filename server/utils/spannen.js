// ─────────────────────────────────────────────────────────────────────────────
// Spannen für die öffentliche Ansicht (v0.409).
//
// Wer nicht angemeldet und freigeschaltet ist, sieht Größenordnungen, keine
// exakten Angaben. Grund ist nicht Geheimniskrämerei, sondern der Auftrag: Ein
// Unternehmensverkauf bleibt vertraulich, bis die verkaufende Seite etwas
// anderes entscheidet. Drei Angaben zusammen genügen oft, um eine Firma zu
// erkennen: Branche, Stadt und ein exakter Umsatz. Deshalb wird die Stadt zur
// Region, und aus einer Zahl wird eine Spanne.
//
// Reine Funktionen, keine Datenbank, damit sie einzeln prüfbar sind.
// ─────────────────────────────────────────────────────────────────────────────

// Stufen in Millionen Euro. Bewusst grob: Wer eine Spanne von 5 bis 10 liest,
// weiß genug, um zu entscheiden, ob er weiterlesen will.
const STUFEN = [0.25, 0.5, 1, 2, 3, 5, 10, 15, 25, 50, 100, 250, 500];

const zahl = (s) => {
  const t = String(s == null ? '' : s).replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const m = t.match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
};

/** Sieht der Text schon nach einer Spanne aus? Dann bleibt er, wie er ist. */
function istSpanne(text) {
  const t = String(text || '');
  // Achtung: \b greift vor einem Umlaut nicht, weil ü kein Wortzeichen ist.
  // "über 50 Mio." wurde deshalb einmal faelschlich erneut gerundet.
  return /\bbis\b|–|\bab\b|unter\s|über\s|ueber\s|zwischen\s|\d\s*-\s*\d/i.test(t);
}

/**
 * Sieht der Text nach einem Geldbetrag aus?
 *
 * Diese Pruefung ist der Kern, und sie war zuerst zu grosszuegig: Aus
 * "ca. 8 %" wurde "5 bis 10 Mio." und aus einer nackten Zahl "über 500 Mio.".
 * Das Feld ebitda_band traegt in der Praxis auch Margen und Freitext, nicht nur
 * Betraege. Umgerechnet wird deshalb nur noch, was eindeutig Geld ist.
 */
function istBetrag(text) {
  const t = String(text || '');
  if (/%/.test(t)) return false;                       // Marge, kein Betrag
  if (/€|eur\b|mio|mrd|million|milliarde|teur|tsd|tausend/i.test(t)) return true;
  // Eine blanke Zahl gilt nur ab Zehntausend als Betrag. Alles darunter kann
  // eine Jahreszahl, ein Prozentwert oder sonst etwas sein.
  const blank = t.replace(/[\s.,]/g, '');
  return /^\d+$/.test(blank) && Number(blank) >= 10000;
}

/**
 * Einen Betrag auf eine Spanne runden.
 * "8.400.000 EUR" wird zu "5 bis 10 Mio.", "0,9 Mio." zu "0,5 bis 1 Mio.".
 *
 * Was schon eine Spanne ist, bleibt unveraendert. Was kein Betrag ist, bleibt
 * ebenfalls unveraendert: lieber eine Angabe stehen lassen, die der Mensch
 * geschrieben hat, als sie in eine falsche Zahl zu verwandeln.
 */
function zuSpanne(text) {
  const roh = String(text == null ? '' : text).trim();
  if (!roh) return 'k. A.';
  if (istSpanne(roh)) return roh;
  if (!istBetrag(roh)) return roh;

  let wert = zahl(roh);
  if (wert == null || !Number.isFinite(wert)) return roh;

  // Einheit erkennen und auf Millionen bringen.
  if (/mrd|milliarde/i.test(roh)) wert *= 1000;
  else if (/mio|million/i.test(roh)) { /* schon Millionen */ }
  else if (/t\s?€|teur|tsd|tausend|k\s?€|keur/i.test(roh)) wert /= 1000;
  else if (wert >= 10000) wert /= 1e6;        // blanke Eurobetraege
  if (wert <= 0) return roh;

  const fmt = (n) => String(n).replace('.', ',');
  if (wert < STUFEN[0]) return `unter ${fmt(STUFEN[0])} Mio.`;
  for (let i = 0; i < STUFEN.length - 1; i++) {
    if (wert >= STUFEN[i] && wert < STUFEN[i + 1]) return `${fmt(STUFEN[i])} bis ${fmt(STUFEN[i + 1])} Mio.`;
  }
  return `über ${fmt(STUFEN[STUFEN.length - 1])} Mio.`;
}

/** Mitarbeiterzahl auf eine Spanne runden. */
const MITARBEITER = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
function mitarbeiterSpanne(n) {
  const w = Number(n);
  if (!Number.isFinite(w) || w <= 0) return null;
  for (let i = 0; i < MITARBEITER.length - 1; i++) {
    if (w >= MITARBEITER[i] && w < MITARBEITER[i + 1]) return `${MITARBEITER[i]} bis ${MITARBEITER[i + 1]}`;
  }
  return `über ${MITARBEITER[MITARBEITER.length - 1]}`;
}

/**
 * Darf dieser Aufrufer die aufgelösten Angaben sehen?
 * Nur wer angemeldet, aktiv und freigeschaltet ist. Das Team sieht ohnehin
 * alles, das prüfen die Routen an anderer Stelle über die Rolle.
 */
const TEAM = ['super_admin', 'advisor', 'tenant_owner'];
function darfAufloesen(user) {
  if (!user) return false;
  if (TEAM.includes(user.role)) return true;
  const aktiv = user.is_active === undefined || Number(user.is_active) === 1;
  return Number(user.is_approved) === 1 && aktiv;
}

// Felder, die ein Unternehmen erkennbar machen können und deshalb erst nach
// der Freischaltung erscheinen.
const NUR_INTERN = ['location_city', 'highlights', 'post_money_valuation', 'equity_stake'];

/**
 * Eine Projektzeile für die öffentliche Ansicht vergröbern.
 * Verändert die Vorlage nicht, sondern gibt eine neue Zeile zurück.
 */
function fuerOeffentlich(zeile, user) {
  if (darfAufloesen(user)) return { ...zeile, aufgeloest: true };
  const z = { ...zeile, aufgeloest: false };
  for (const f of NUR_INTERN) if (f in z) delete z[f];
  if ('revenue_band' in z) z.revenue_band = zuSpanne(z.revenue_band);
  if ('ebitda_band' in z) z.ebitda_band = zuSpanne(z.ebitda_band);
  if ('investment_needed' in z) z.investment_needed = zuSpanne(z.investment_needed);
  if ('employees' in z) z.employees = mitarbeiterSpanne(z.employees);
  return z;
}

module.exports = {
  STUFEN, MITARBEITER, NUR_INTERN,
  istSpanne, istBetrag, zuSpanne, mitarbeiterSpanne, darfAufloesen, fuerOeffentlich,
};
