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

// Firmentyp (crm_companies.company_type). Das alte Feld. Es mischte Sektor und
// Rolle in der Transaktion und ist seit v0.405 aufgeteilt, siehe SEKTOREN,
// SCHWERPUNKTE und TRANSAKTIONSROLLEN weiter unten. Die Liste bleibt, damit
// bestehende Datensätze lesbar bleiben, bis die Umstellung geprüft ist.
const FIRMENTYPEN = [
  'Stratege', 'Private Equity', 'Family Office', 'Venture Capital',
  'MBI/MBO', 'Bank oder Finanzierer', 'Berater', 'Zielunternehmen', 'Sonstige',
];

// ── Sektor (Pflichtfeld an der Firma) ───────────────────────────────────────
// Wortgleich zu Phalanx OS, damit sich beide Bestände vergleichen lassen. Diese
// Zeichenketten dürfen nicht umformuliert werden, auch nicht in der Schreibweise.
const SEKTOREN = [
  'Industrie und verarbeitendes Gewerbe',
  'Bau und Handwerk',
  'Handel',
  'Dienstleistungen',
  'Finanz- und Beteiligungswirtschaft',
  'Informationstechnik und Software',
  'Gesundheit und Soziales',
  'Sonstige',
];

// ── Schwerpunkt (optional, hängt vom Sektor ab) ─────────────────────────────
// Nur dort angeboten, wo die Unterscheidung etwas bringt. Sektoren ohne Eintrag
// haben bewusst keinen Schwerpunkt.
const SCHWERPUNKTE = {
  'Finanz- und Beteiligungswirtschaft': [
    'Private Equity', 'Family Office', 'Business Angel', 'Bank und Finanzierung',
    'Versicherung', 'Vermögensverwaltung', 'Sonstige',
  ],
  'Dienstleistungen': [
    'Unternehmensberatung', 'Interim Management', 'Kanzlei und Steuerberatung',
    'Wirtschaftsprüfung', 'Agentur und Marketing', 'Personal und Recruiting',
    'Logistik und Transport', 'Bildung und Wissenschaft', 'Sonstige',
  ],
  'Industrie und verarbeitendes Gewerbe': [
    'Maschinen- und Anlagenbau', 'Automobilzulieferer', 'Elektro und Elektronik',
    'Chemie und Pharma', 'Metall und Kunststoff', 'Lebensmittel', 'Sonstige',
  ],
};

// ── Rolle in der Transaktion (optional, mehrere möglich) ────────────────────
// Das ist keine Eigenschaft der Firma, sondern ihre Stellung in einem Vorhaben.
// Deshalb mehrfach vergebbar: Ein Stratege kann zugleich Käufer sein.
const TRANSAKTIONSROLLEN = [
  'Stratege', 'MBI/MBO-Kandidat', 'Zielunternehmen', 'Käufer', 'Verkäufer', 'Berater',
];

const istSektor = (v) => SEKTOREN.includes(String(v || ''));
const istRolle = (v) => TRANSAKTIONSROLLEN.includes(String(v || ''));

/** Welche Schwerpunkte gibt es zu diesem Sektor? Leeres Feld heißt: keine. */
function schwerpunkteZu(sektor) {
  return SCHWERPUNKTE[String(sektor || '')] || [];
}

/**
 * Passt dieser Schwerpunkt zu diesem Sektor?
 * Ein leerer Schwerpunkt passt immer, denn das Feld ist optional. Ein gefüllter
 * Schwerpunkt ohne passenden Sektor wird abgelehnt: Sonst entstehen Angaben wie
 * „Handel / Private Equity", die niemand auswerten kann.
 */
function schwerpunktPasst(sektor, schwerpunkt) {
  const sp = String(schwerpunkt || '').trim();
  if (!sp) return true;
  return schwerpunkteZu(sektor).includes(sp);
}

/** Rollenliste säubern: nur bekannte Werte, keine Doppelungen, Reihenfolge stabil. */
function rollenBereinigen(werte) {
  const roh = Array.isArray(werte) ? werte : [];
  const out = [];
  for (const r of roh) {
    const v = String(r || '').trim();
    if (istRolle(v) && !out.includes(v)) out.push(v);
  }
  return out;
}

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
  SEKTOREN, SCHWERPUNKTE, TRANSAKTIONSROLLEN,
  istSektor, istRolle, schwerpunkteZu, schwerpunktPasst, rollenBereinigen,
};
