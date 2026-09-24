// ─────────────────────────────────────────────────────────────────────────────
// Gemeinsames Vokabular (v0.400).
//
// Käufertyp, Firmentyp und Länder standen bisher an mehreren Stellen: einmal in
// der Kontaktakte, einmal im LinkedIn-Import, einmal als Freitextfeld im Dialog
// „Anfrage einfügen". Was dort eingetippt wurde, passte auf nichts und ging beim
// Speichern verloren.
//
// Hier steht die eine Quelle. Der Server prüft gegen diese Listen, die
// Oberfläche holt sie über GET /api/crm/vokabular. Wenn CapitalMatch später im
// Phalanx OS aufgeht, wird an dieser Stelle der Datenpool befragt, und alles
// andere bleibt unverändert.
// ─────────────────────────────────────────────────────────────────────────────

// Käufertyp am Kontakt (crm_contacts.buyer_type und users.buyer_type).
// Die Werte sind festgelegt und dürfen nicht umbenannt werden: Sie stehen so in
// der Datenbank und in den Freigaben des Datenraums.
const KAEUFERTYPEN = [
  { wert: 'strategic', label: 'Strategischer Käufer' },
  { wert: 'financial', label: 'Finanzinvestor' },
  { wert: 'business_angel', label: 'Business Angel' },
  { wert: 'venture_capital', label: 'Venture Capital' },
  { wert: 'family_office', label: 'Family Office' },
  { wert: 'successor', label: 'Nachfolger (MBO/MBI)' },
  { wert: 'private', label: 'Privatperson' },
  { wert: 'advisor_mandate', label: 'M&A-Berater mit Suchmandat' },
];

// Firmentyp (crm_companies.company_type). Freitext in der Datenbank, hier aber
// mit Vorschlägen, damit nicht dreimal dasselbe unterschiedlich geschrieben wird.
const FIRMENTYPEN = [
  'Stratege', 'Private Equity', 'Family Office', 'Venture Capital',
  'MBI/MBO', 'Bank oder Finanzierer', 'Berater', 'Zielunternehmen', 'Sonstige',
];

// Länder, die in den Anfragen vorkommen. Bewusst kurz gehalten.
const LAENDER = ['Deutschland', 'Österreich', 'Schweiz', 'Luxemburg', 'Liechtenstein', 'Niederlande', 'Belgien', 'Frankreich', 'Italien', 'Polen', 'Tschechien', 'Vereinigtes Königreich', 'USA'];

const KAEUFERTYP_WERTE = KAEUFERTYPEN.map((k) => k.wert);
const istKaeufertyp = (v) => KAEUFERTYP_WERTE.includes(String(v || ''));
const kaeufertypLabel = (v) => (KAEUFERTYPEN.find((k) => k.wert === v) || {}).label || '';

// Was ein Marktplatz in das Feld „Investortyp" schreibt, ist Freitext. Diese
// Zuordnung übersetzt die üblichen Formulierungen in einen gültigen Käufertyp.
// Reihenfolge zählt: Der erste Treffer gewinnt, deshalb stehen die engeren
// Begriffe oben („Family Office" vor „Privat").
const ZUORDNUNG = [
  [/family\s*office/i, 'family_office'],
  [/business\s*angel|angel\s*investor/i, 'business_angel'],
  [/venture|wagniskapital|vc\b/i, 'venture_capital'],
  [/private\s*equity|beteiligungsgesellschaft|finanzinvestor|\bpe\b/i, 'financial'],
  [/mbi|mbo|management[- ]buy|nachfolger|nachfolge/i, 'successor'],
  [/m&a[- ]?berater|suchmandat|berater|intermediär|makler/i, 'advisor_mandate'],
  [/strateg|industrie|wettbewerber|mitbewerber/i, 'strategic'],
  [/privat|einzelperson|privatperson|privatinvestor/i, 'private'],
];

/**
 * Freitext aus einem Marktplatz auf einen Käufertyp abbilden.
 * Gibt '' zurück, wenn sich nichts sicher zuordnen lässt. Lieber leer als falsch:
 * Ein falsch gesetzter Typ steuert später Freigaben und Verteiler.
 */
function kaeufertypAus(freitext) {
  const t = String(freitext || '').trim();
  if (!t) return '';
  if (istKaeufertyp(t)) return t;                       // schon ein gültiger Wert
  for (const [muster, wert] of ZUORDNUNG) if (muster.test(t)) return wert;
  return '';
}

module.exports = {
  KAEUFERTYPEN, KAEUFERTYP_WERTE, FIRMENTYPEN, LAENDER,
  istKaeufertyp, kaeufertypLabel, kaeufertypAus,
};
