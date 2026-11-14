// ─────────────────────────────────────────────────────────────────────────────
// Zentrale Auswahllisten für Mandate/Projekte
// Branchen nach NACE Rev. 2 (Abschnitte + gängige Abteilungen, dt. Bezeichnung)
// ─────────────────────────────────────────────────────────────────────────────

export const NACE_INDUSTRIES = [
  { group: 'A–B: Landwirtschaft & Rohstoffe', options: [
    'A01 – Landwirtschaft & Jagd',
    'A02 – Forstwirtschaft',
    'A03 – Fischerei & Aquakultur',
    'B – Bergbau & Gewinnung von Steinen/Erden',
  ]},
  { group: 'C: Verarbeitendes Gewerbe', options: [
    'C10 – Nahrungs- & Futtermittel',
    'C11 – Getränkeherstellung',
    'C13–15 – Textilien, Bekleidung, Leder',
    'C16 – Holzwaren',
    'C17–18 – Papier & Druck',
    'C20 – Chemische Erzeugnisse',
    'C21 – Pharmazeutische Erzeugnisse',
    'C22 – Gummi- & Kunststoffwaren',
    'C23 – Glas, Keramik, Baustoffe',
    'C24 – Metallerzeugung',
    'C25 – Metallerzeugnisse',
    'C26 – Elektronik & Optik',
    'C27 – Elektrische Ausrüstungen',
    'C28 – Maschinenbau',
    'C29 – Automotive & Zulieferer',
    'C30 – Sonstiger Fahrzeugbau',
    'C31 – Möbel',
    'C32–33 – Sonstige Waren, Reparatur & Instandhaltung',
  ]},
  { group: 'D–F: Energie, Ver-/Entsorgung, Bau', options: [
    'D35 – Energieversorgung',
    'E36–39 – Wasser, Abwasser, Entsorgung, Recycling',
    'F41–43 – Baugewerbe',
  ]},
  { group: 'G–I: Handel, Logistik, Gastgewerbe', options: [
    'G45 – Kfz-Handel & -Reparatur',
    'G46 – Großhandel',
    'G47 – Einzelhandel & E-Commerce',
    'H49–53 – Verkehr, Logistik & Lagerei',
    'I55–56 – Beherbergung & Gastronomie',
  ]},
  { group: 'J: Information & Kommunikation', options: [
    'J58 – Verlagswesen & Software-Publishing',
    'J59–60 – Medien, Film & Rundfunk',
    'J61 – Telekommunikation',
    'J62 – Software-Entwicklung & IT-Dienstleistungen',
    'J63 – Informationsdienstleistungen & Datenverarbeitung',
  ]},
  { group: 'K–L: Finanzen & Immobilien', options: [
    'K64–66 – Finanz- & Versicherungsdienstleistungen',
    'L68 – Grundstücks- & Wohnungswesen',
  ]},
  { group: 'M–N: Unternehmensdienstleistungen', options: [
    'M69 – Rechts- & Steuerberatung, Wirtschaftsprüfung',
    'M70 – Unternehmensberatung & -führung',
    'M71 – Architektur- & Ingenieurbüros, technische Prüfung',
    'M72 – Forschung & Entwicklung',
    'M73 – Werbung & Marktforschung',
    'M74–75 – Sonstige freiberufliche/technische Tätigkeiten',
    'N77 – Vermietung beweglicher Sachen',
    'N78 – Personaldienstleistungen',
    'N79 – Reisebüros & Reiseveranstalter',
    'N80–82 – Wach-, Gebäude- & Wirtschaftsdienste',
  ]},
  { group: 'P–S: Bildung, Gesundheit, Freizeit', options: [
    'P85 – Erziehung & Unterricht',
    'Q86 – Gesundheitswesen & Medizintechnik-Dienstleistungen',
    'Q87–88 – Heime & Sozialwesen',
    'R90–93 – Kunst, Unterhaltung, Sport & Erholung',
    'S94–96 – Sonstige Dienstleistungen',
  ]},
];

// Flache Liste (z. B. für Filter-Validierung)
export const NACE_FLAT = NACE_INDUSTRIES.flatMap(g => g.options);

export const BUNDESLAENDER = [
  'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg',
  'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen', 'Nordrhein-Westfalen',
  'Rheinland-Pfalz', 'Saarland', 'Sachsen', 'Sachsen-Anhalt',
  'Schleswig-Holstein', 'Thüringen',
  'Deutschland (bundesweit)', 'Österreich', 'Schweiz', 'DACH',
];

// Strukturierte Umsatzklassen (gleiche Bänder wie im Nachfolge-Profil).
// Wert (für Matching) und Anzeige-Label.
export const REVENUE_CLASSES = [
  ['<1', 'unter 1 Mio. €'],
  ['1-3', '1 bis 3 Mio. €'],
  ['3-10', '3 bis 10 Mio. €'],
  ['10-30', '10 bis 30 Mio. €'],
  ['>30', 'über 30 Mio. €'],
];

export const DEAL_TYPES_MA = [
  'Nachfolge', 'Mehrheitsverkauf', 'Minderheitsbeteiligung', 'MBO', 'MBI',
  'Wachstumskapital', 'Buy-and-Build', 'Carve-out', 'Strategische Partnerschaft',
];

export const DEAL_TYPES_FUNDRAISING = [
  'Pre-Seed-Finanzierung', 'Seed-Finanzierung', 'Angel-Runde',
  'Series-A-Finanzierung', 'Series-B-Finanzierung', 'Wandeldarlehen', 'Brückenfinanzierung',
];

export const FUNDRAISING_STAGES = ['Pre-Seed', 'Seed', 'Angel Round', 'Series A', 'Series B'];

// Hilfsfunktion: aktuellen (Legacy-)Wert in die Liste aufnehmen, damit
// bestehende Projekte mit alten Freitext-Werten editierbar bleiben
export function withCurrent(list, current) {
  if (!current || list.includes(current)) return list;
  return [current, ...list];
}

// ─────────────────────────────────────────────────────────────────────────────
// Dieselbe Liste auf Englisch (v0.470)
//
// Der gespeicherte Wert bleibt die deutsche Zeichenkette. Alles andere wäre ein
// Datenumzug mit Ansage: Mandate, Suchprofile und die Taxonomie-Synonyme
// hängen an genau diesen Zeichenketten. Übersetzt wird deshalb nur die
// Anzeige, und zwar über die Kennung am Anfang ("C28"), die sich nie ändert.
//
// Fehlt eine Übersetzung, erscheint der deutsche Text. Eine Liste, die in der
// englischen Fassung Lücken hat, ist immer noch bedienbar; eine, die beim
// Speichern andere Werte schreibt, ist es nicht.
// ─────────────────────────────────────────────────────────────────────────────
const NACE_EN_NACH_KENNUNG = {
  A01: 'Agriculture and hunting', A02: 'Forestry', A03: 'Fishing and aquaculture',
  B: 'Mining and quarrying',
  C10: 'Food and animal feed', C11: 'Beverages', 'C13–15': 'Textiles, clothing, leather',
  C16: 'Wood products', 'C17–18': 'Paper and printing', C20: 'Chemical products',
  C21: 'Pharmaceutical products', C22: 'Rubber and plastics', C23: 'Glass, ceramics, building materials',
  C24: 'Basic metals', C25: 'Fabricated metal products', C26: 'Electronics and optics',
  C27: 'Electrical equipment', C28: 'Mechanical engineering', C29: 'Automotive and suppliers',
  C30: 'Other transport equipment', C31: 'Furniture', 'C32–33': 'Other goods, repair and maintenance',
  D35: 'Energy supply', 'E36–39': 'Water, waste water, waste, recycling', 'F41–43': 'Construction',
  G45: 'Motor vehicle trade and repair', G46: 'Wholesale', G47: 'Retail and e-commerce',
  'H49–53': 'Transport, logistics and warehousing', 'I55–56': 'Accommodation and food services',
  J58: 'Publishing and software publishing', 'J59–60': 'Media, film and broadcasting',
  J61: 'Telecommunications', J62: 'Software development and IT services',
  J63: 'Information services and data processing',
  'K64–66': 'Financial and insurance services', L68: 'Real estate',
  M69: 'Legal, tax and audit services', M70: 'Management consulting and head offices',
  M71: 'Architecture and engineering, technical testing', M72: 'Research and development',
  M73: 'Advertising and market research', 'M74–75': 'Other professional and technical activities',
  N77: 'Rental and leasing', N78: 'Employment services', N79: 'Travel agencies and tour operators',
  'N80–82': 'Security, building and business support services',
  P85: 'Education', Q86: 'Health care and medical technology services',
  'Q87–88': 'Residential care and social work', 'R90–93': 'Arts, entertainment, sport and recreation',
  'S94–96': 'Other services',
};

const NACE_GRUPPEN_EN = {
  'A–B: Landwirtschaft & Rohstoffe': 'A to B: Agriculture and raw materials',
  'C: Verarbeitendes Gewerbe': 'C: Manufacturing',
  'D–F: Energie, Ver-/Entsorgung, Bau': 'D to F: Energy, utilities, construction',
  'G–I: Handel, Logistik, Gastgewerbe': 'G to I: Trade, logistics, hospitality',
  'J: Information & Kommunikation': 'J: Information and communication',
  'K–L: Finanzen & Immobilien': 'K to L: Finance and real estate',
  'M–N: Unternehmensdienstleistungen': 'M to N: Business services',
  'P–S: Bildung, Gesundheit, Freizeit': 'P to S: Education, health, leisure',
};

/** Die Kennung am Anfang einer Zeile, also "C28" aus "C28 – Maschinenbau". */
export function naceKennung(wert) {
  // Hinter der Kennung muss der Gedankenstrich oder das Ende stehen. Ohne
  // diese Bedingung wäre in "Irgendwas" das I eine Kennung, und die Liste
  // bekäme Einträge, die niemand gemeint hat.
  const m = String(wert || '').match(/^([A-Z](?:\d+(?:–\d+)?)?)(?=\s[–-]|$)/);
  return m ? m[1] : null;
}

/** Beschriftung einer Branche in der gewünschten Sprache. */
export function naceLabel(wert, sprache) {
  if (sprache !== 'en') return wert;
  const k = naceKennung(wert);
  const en = k && NACE_EN_NACH_KENNUNG[k];
  return en ? `${k} – ${en}` : wert;
}

/** Beschriftung einer Gruppe in der gewünschten Sprache. */
export function naceGruppe(gruppe, sprache) {
  return sprache === 'en' ? (NACE_GRUPPEN_EN[gruppe] || gruppe) : gruppe;
}

/** Die ganze Liste für die Anzeige, Werte unverändert. */
export function naceListe(sprache) {
  return NACE_INDUSTRIES.map((g) => ({
    group: naceGruppe(g.group, sprache),
    options: g.options.map((o) => ({ wert: o, label: naceLabel(o, sprache) })),
  }));
}
