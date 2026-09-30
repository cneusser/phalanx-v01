// ─────────────────────────────────────────────────────────────────────────────
// Welche Investoren passen zu diesem Mandat? (v0.439)
//
// Die Suchkriterien aus den Anschreiben liegen am Kontakt: focus_industries,
// focus_regions, ticket_min und ticket_max. Diese Datei vergleicht sie mit
// einem Mandat. Reine Funktion, kein Datenbankzugriff, deshalb prüfbar.
//
// Drei Festlegungen, die das Ergebnis brauchbar halten:
//
//   1. Ein leeres Kriterium schränkt nicht ein. Wer keine Region angegeben hat,
//      sucht überall. Das ist die übliche Lesart und dieselbe wie im
//      Suchprofil-Abgleich der Plattform.
//   2. Ein Widerspruch schließt aus. Passt die Branche nachweislich nicht, ist
//      der Kontakt kein Treffer, auch wenn alles andere stimmt. Eine Liste, die
//      alle enthält, ist keine Auswahl.
//   3. Zu jedem Treffer wird gesagt, warum. Wer eine Ansprache auslöst, soll
//      die Begründung sehen und nicht einer Zahl vertrauen müssen.
//
// Was hier NICHT passiert: anschreiben. Diese Datei liefert einen Vorschlag.
// Wer ihn verschickt, entscheidet ein Mensch.
// ─────────────────────────────────────────────────────────────────────────────

const tax = require('./taxonomie');

/** Ein Feld, das als JSON-Liste oder als Text vorliegen kann. */
function liste(v) {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (v == null || v === '') return [];
  try {
    const p = JSON.parse(v);
    return Array.isArray(p) ? p.filter(Boolean) : (p ? [p] : []);
  } catch { return String(v).split(/[,;]/).map((s) => s.trim()).filter(Boolean); }
}

/** Die größte in Millionen genannte Zahl aus einem Freitext wie „€ 1,5 bis 2 Mio." */
function mio(text) {
  const s = String(text || '');
  if (!/Mio|Mill/i.test(s)) return null;
  const zahlen = s.replace(/\./g, '').replace(/,/g, '.').match(/\d+(?:\.\d+)?/g);
  if (!zahlen) return null;
  return Math.max(...zahlen.map(Number));
}

/**
 * Passt eine Angabe des Kontakts zu dem Wert des Mandats?
 *
 * Verglichen wird über die Taxonomie, nicht über Zeichengleichheit. Sonst
 * passte „Business Services" nie zu „dienstleistung", obwohl es dasselbe meint.
 */
function passt(eintraege, mandatswert, art) {
  if (!eintraege.length) return { treffer: true, grund: null };   // nichts gewählt heißt: alles
  if (!mandatswert) return { treffer: true, grund: null };        // das Mandat sagt dazu nichts
  const trifft = art === 'branche' ? tax.brancheTrifft : tax.regionTrifft;
  const zuCode = art === 'branche' ? tax.brancheAus : tax.regionAus;
  const ziel = zuCode(mandatswert) || mandatswert;
  for (const e of eintraege) {
    const code = zuCode(e) || e;
    if (code === ziel || trifft(code, ziel)) {
      return { treffer: true, grund: `${art === 'branche' ? 'Branche' : 'Region'} passt (${e})` };
    }
  }
  return { treffer: false, grund: `${art === 'branche' ? 'Branche' : 'Region'} passt nicht (sucht ${eintraege.join(', ')})` };
}

/**
 * Einen Kontakt gegen ein Mandat halten.
 *
 * @param kontakt  { focus_industries, focus_regions, ticket_min, ticket_max, investment_focus }
 * @param mandat   { industry, region, revenue_band, ebitda_band }
 * @returns { treffer, gruende, ausschluss }
 */
function bewerte(kontakt, mandat) {
  const gruende = [];
  const ausschluss = [];

  const b = passt(liste(kontakt.focus_industries), mandat.industry, 'branche');
  if (b.grund) (b.treffer ? gruende : ausschluss).push(b.grund);
  const r = passt(liste(kontakt.focus_regions), mandat.region, 'region');
  if (r.grund) (r.treffer ? gruende : ausschluss).push(r.grund);

  // Größe: Die Spanne des Kontakts ist in Mio. EUR hinterlegt. Das Mandat nennt
  // seine Größe als Text. Fehlt eine der beiden Seiten, schränkt sie nicht ein.
  const mandatsgroesse = mio(mandat.ebitda_band) != null ? mio(mandat.ebitda_band) : mio(mandat.revenue_band);
  const woraus = mio(mandat.ebitda_band) != null ? 'EBITDA' : 'Umsatz';
  const min = kontakt.ticket_min == null ? null : Number(kontakt.ticket_min);
  const max = kontakt.ticket_max == null ? null : Number(kontakt.ticket_max);
  if (mandatsgroesse != null && (min != null || max != null)) {
    const zuKlein = min != null && mandatsgroesse < min;
    const zuGross = max != null && mandatsgroesse > max;
    if (zuKlein || zuGross) {
      ausschluss.push(`${woraus} ${mandatsgroesse} Mio. liegt ausserhalb von ${min == null ? '?' : min} bis ${max == null ? '?' : max} Mio.`);
    } else {
      gruende.push(`${woraus} ${mandatsgroesse} Mio. liegt in der gesuchten Spanne`);
    }
  }

  return { treffer: ausschluss.length === 0, gruende, ausschluss };
}

/**
 * Alle Kontakte bewerten und die Treffer zurückgeben.
 *
 * Kontakte ohne jedes Kriterium bleiben aussen vor. Sie würden sonst bei jedem
 * Mandat auftauchen, und ein Vorschlag, der immer alle nennt, ist keiner.
 */
function vorschlagen(kontakte, mandat) {
  const raus = [];
  for (const k of kontakte || []) {
    const hatKriterien = liste(k.focus_industries).length || liste(k.focus_regions).length
      || k.ticket_min != null || k.ticket_max != null;
    if (!hatKriterien) continue;
    const b = bewerte(k, mandat);
    if (b.treffer && b.gruende.length) raus.push({ ...k, gruende: b.gruende });
  }
  // Wer mehr Gründe hat, passt genauer.
  return raus.sort((a, b) => b.gruende.length - a.gruende.length);
}

module.exports = { vorschlagen, bewerte, liste, mio };
