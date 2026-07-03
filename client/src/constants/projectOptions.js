// ─────────────────────────────────────────────────────────────────────────────
// Zentrale Auswahllisten für Mandate/Projekte
// Branchen nach NACE Rev. 2 (Abschnitte + gängige Abteilungen, dt. Bezeichnung)
// ─────────────────────────────────────────────────────────────────────────────

export const NACE_INDUSTRIES = [
  { group: 'A–B — Landwirtschaft & Rohstoffe', options: [
    'A01 – Landwirtschaft & Jagd',
    'A02 – Forstwirtschaft',
    'A03 – Fischerei & Aquakultur',
    'B – Bergbau & Gewinnung von Steinen/Erden',
  ]},
  { group: 'C — Verarbeitendes Gewerbe', options: [
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
  { group: 'D–F — Energie, Ver-/Entsorgung, Bau', options: [
    'D35 – Energieversorgung',
    'E36–39 – Wasser, Abwasser, Entsorgung, Recycling',
    'F41–43 – Baugewerbe',
  ]},
  { group: 'G–I — Handel, Logistik, Gastgewerbe', options: [
    'G45 – Kfz-Handel & -Reparatur',
    'G46 – Großhandel',
    'G47 – Einzelhandel & E-Commerce',
    'H49–53 – Verkehr, Logistik & Lagerei',
    'I55–56 – Beherbergung & Gastronomie',
  ]},
  { group: 'J — Information & Kommunikation', options: [
    'J58 – Verlagswesen & Software-Publishing',
    'J59–60 – Medien, Film & Rundfunk',
    'J61 – Telekommunikation',
    'J62 – Software-Entwicklung & IT-Dienstleistungen',
    'J63 – Informationsdienstleistungen & Datenverarbeitung',
  ]},
  { group: 'K–L — Finanzen & Immobilien', options: [
    'K64–66 – Finanz- & Versicherungsdienstleistungen',
    'L68 – Grundstücks- & Wohnungswesen',
  ]},
  { group: 'M–N — Unternehmensdienstleistungen', options: [
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
  { group: 'P–S — Bildung, Gesundheit, Freizeit', options: [
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
