/**
 * Seed: Mandat „FARADAY" vollständig online bringen.
 *
 * Bislang lag FARADAY nur als Entwurf im CRM-Funnel (aus dem Kontakt-Import).
 * Diese Migration füllt Marktplatz-Eckdaten, Detailseite und Exposé aus dem realen
 * Information Memorandum (Juni 2026) und schaltet das Mandat aktiv.
 *
 * ANONYMISIERT: kein Klarname, kein Inhabername, kein Kundenname (insbesondere nicht
 * der Messestandort). Die Identität gibt der Marktplatz erst nach unterzeichneter NDA frei.
 * Idempotent: setzt Werte nur, wenn das Projekt existiert; Exposé nur, wenn noch keins da ist.
 */

const CODENAME = 'FARADAY';

const PUBLIC = {
  industry: 'Elektrotechnik / Energiedienstleistung',
  region: 'Bayern',
  location_city: 'Metropolregion Nürnberg',
  deal_type: 'Nachfolge',
  mandate_type: 'ma',
  revenue_band: '€ 1,5–2 Mio.',
  ebitda_band: '14–15 % EBIT-Marge (Branche 8–10 %)',
  sector_emoji: '⚡',
  short_description:
    'Etablierter Elektrotechnik- und Energiedienstleister (seit 1998) mit vertraglich abgesicherter ' +
    'Pflichtnehmer-Stellung bei einem überregional bedeutenden Messe- und Kongressstandort. ' +
    'Über 80 % wiederkehrende Umsätze, EBIT-Marge stabil bei 14–15 %, 260+ selbst betriebene ' +
    'Ladepunkte mit eigener Energieabrechnung. Altersnachfolge: 100 % Share Deal, cash- und debt-free; ' +
    'der Inhaber begleitet die Übergabe bis zu sechs Monate.',
  highlights: [
    'Pflichtnehmer-Stellung seit über 20 Jahren im Pflichtenheft eines Messe-/Kongressstandorts, praktisch nicht substituierbar',
    'EBIT-Marge 14,4 % bei einem Branchenmittel von 8–10 %; > 80 % Umsatz aus Rahmenverträgen',
    'E-Mobility-Optionswert: 260+ Ladepunkte im Vollbetrieb, Geschäftsmodell ist Betrieb und Abrechnung (kein Stromverkauf)',
    'Submetering-Kompetenz: bis zu 2.600 Messpunkte je Veranstaltung, ~250 Abrechnungen p. a.',
    'Übergabefähigkeit nachgewiesen: 11 Wochen Inhaber-Abwesenheit ohne operative oder finanzielle Effekte',
    'Schlanke Bilanz: keine Bankdarlehen, cash- und debt-free; Team mit Ø 13,5 Jahren Betriebszugehörigkeit',
  ],
};

const DETAILS = {
  full_description:
    'Das Unternehmen hat sich seit der Gründung 1998 vom klassischen Elektrobetrieb zu einem spezialisierten ' +
    'Energiedienstleister entwickelt. Kernkompetenzen sind heute die Energieabrechnung von Großimmobilien ' +
    '(Submetering), der Betrieb von Ladeinfrastruktur sowie Elektrotechnik und Gebäudeautomation für gewerbliche ' +
    'und institutionelle Auftraggeber. Herzstück ist eine seit über 20 Jahren vertraglich abgesicherte ' +
    'Pflichtnehmer-Stellung bei einem überregional bedeutenden Messe- und Kongressstandort in Süddeutschland: ' +
    'Das Unternehmen ist im Pflichtenheft des Messebetriebs als zwingend zu beauftragender Partner verankert und ' +
    'rechnet je Veranstaltung bis zu 2.600 Messpunkte ab. Der Alleingesellschafter (Jg. 1965) sucht die geregelte ' +
    'Nachfolge im Wege eines Komplettverkaufs (100 % Share Deal, cash- und debt-free) und begleitet die Übergabe ' +
    'bis zu sechs Monate in beratender Rolle.',
  revenue_actual: 1650000,
  ebitda_actual: 297000,
  revenue_trend: 'Stabil bei € 1,5–1,7 Mio. über fünf Jahre (+11 % seit 2022); Margensprung 2024 von 12,2 auf 14,5 % EBIT',
  employees: 13,
  founding_year: 1998,
  growth_strategy:
    'Übertragung der Abrechnungs- und Betriebsmethodik auf weitere Standorte (Messe-, Kongress- und Großimmobilien); ' +
    'Skalierung des Ladepunkt-Betriebs zu einer CPO-Plattform mit eigener Abrechnung; Rückenwind aus zwei gesetzlich ' +
    'getriebenen Märkten (Ladeinfrastruktur-Hochlauf bis 2030, Messstellenbetriebsgesetz/Submetering).',
  key_risks:
    'Kundenkonzentration: der Messe-/Eventkunde trägt rund 53 % des Umsatzes (mitigiert durch die vertragliche ' +
    'Pflichtnehmer-Stellung und eine über 20-jährige Historie). Schlüsselpersonen-Abhängigkeit von Inhaber und ' +
    'Elektromeister (mitigiert durch nachgewiesene Abwesenheitsfähigkeit, sechsmonatige Übergabebegleitung und ' +
    'sehr niedrige Fluktuation). Kleine Betriebsgröße mit entsprechender Abhängigkeit von wenigen Fachkräften.',
  asking_price_band:
    'Indikative EV-Bandbreite € 1,7–2,3 Mio. (Premium-Multiple 6–8× EBITDA, Share Deal, cash- und debt-free). ' +
    'Die Bewertungsindikation liegt bewusst beim Erwerber, Drei-Methoden-Rahmen (Ertragswert IDW S1, Multiples, DCF) im IM.',
  team_description:
    '13 Mitarbeitende inkl. Geschäftsführer: 1 Elektromeister, 6 Elektroniker, 1 Auszubildender, 5 Verwaltung/Service. ' +
    'Durchschnittliche Betriebszugehörigkeit 13,5 Jahre, fünf Mitarbeitende über 15 Jahre im Unternehmen, Krankenquote ' +
    'rund 1 %. Erfolgskritische Rollen: Geschäftsführer (Großkundenbeziehung), Elektromeister (operative Großkunden) ' +
    'und Verwaltung (Buchhaltung/Energieabrechnung). Alle Verträge ungekündigt.',
  milestones:
    '1998 Gründung · 2003 Eintritt in die Pflichtnehmer-Klausel am Messestandort · 2010 Umwandlung in GmbH und Aufbau ' +
    'der Energieabrechnung · 2015 erste E-Mobility-Aufträge (50 Ladepunkte) · 2023 260+ Ladepunkte im Vollbetrieb · ' +
    '2025 Umsatz € 1,65 Mio., EBIT € 237k · 2026 Vorbereitung der Übergabe, Signing-Ziel Dezember 2026.',
};

const KEYFACTS = {
  country: 'Deutschland',
  region: 'Bayern: Metropolregion Nürnberg (Sitz im Umland, Großkunden im Ballungsraum)',
  industries: 'Elektrotechnik, Energieabrechnung/Submetering, E-Mobility-Infrastruktur, Gebäudeautomation',
  founding_year: '1998 (GmbH seit 2010)',
  legal_form: 'GmbH',
  employees: '13 (inkl. Geschäftsführer); Ø 13,5 Jahre Betriebszugehörigkeit',
  locations: 'Ein Standort in Bayern; Betriebsgebäude im Eigentum einer separaten Familiengesellschaft (Miete marktüblich)',
  revenue_band: '€ 1,65 Mio. (2025); stabil € 1,5–1,7 Mio. p. a.; Plan 2026: € 1,75 Mio.',
  ebit_band: 'EBIT € 237k / 14,4 % Marge (2025); EBITDA normalisiert € 297k (18,0 %)',
  gf_availability: 'Inhaber begleitet die Übergabe bis zu sechs Monate in beratender Rolle; 11 Wochen Abwesenheit ohne Effekt nachgewiesen',
  stake_offered: '100 % (Komplettverkauf, Altersnachfolge)',
  participation_type: 'Share Deal, cash- und debt-free',
  price_band: 'Indikative EV-Bandbreite € 1,7–2,3 Mio. (6–8× EBITDA); Bewertungsindikation durch den Erwerber im indikativen Angebot',
  purchase_modalities: 'Kaufpreis zum Closing; keine Bankdarlehen; Working-Capital-Deckung > 2 Monate; Struktur verhandelbar',
};

const SECTION_KEYS = ['company', 'offering', 'market', 'organization', 'financials', 'swot', 'realestate', 'buyer', 'process'];
const SECTION_TITLES = {
  company: 'Unternehmen & Historie',
  offering: 'Leistungsspektrum & Geschäftsmodell',
  market: 'Markt & Wettbewerb',
  organization: 'Organisation & Mitarbeiter',
  financials: 'Finanzen (Kurzüberblick)',
  swot: 'Stärken & Entwicklungspotenziale',
  realestate: 'Immobilien & Anlagen',
  buyer: 'Käuferanforderungen & Verkaufsgrund',
  process: 'Prozess & nächste Schritte',
};

const BODIES = {
  company:
    'Gegründet 1998 als Einzelfirma, seit 2010 GmbH: In 28 Jahren hat sich das Unternehmen vom klassischen ' +
    'Elektrobetrieb zu einem spezialisierten Energiedienstleister entwickelt. Sitz ist Bayern, im Umland der ' +
    'Metropolregion Nürnberg; die Großkunden sitzen im Ballungsraum. Der Alleingesellschafter (Jg. 1965) hat das ' +
    'Unternehmen aufgebaut und geprägt und übergibt es nun im Rahmen einer Altersnachfolge.',
  offering:
    'Vier Segmente mit klar unterschiedlichen Cashflow-Profilen: Energieabrechnung/Submetering (ca. 35 % des Umsatzes), ' +
    'Medienvermessung für Großveranstaltungen mit bis zu 2.600 Messpunkten je Veranstaltung und rund 250 Abrechnungen ' +
    'pro Jahr, hochgradig standardisiert und wiederkehrend. E-Mobility (ca. 20 %), Errichtung, Betrieb und Abrechnung ' +
    'von Ladeinfrastruktur; 260+ Ladepunkte im Vollbetrieb, angebunden an ein zentrales Backend. Das Geschäftsmodell ist ' +
    'ausdrücklich Betrieb und Abrechnung, nicht Stromverkauf, damit ohne Energiepreisrisiko. Elektrotechnik (ca. 35 %), ' +
    'gewerbliche und industrielle Elektrotechnik mit Schwerpunkt Energieverteilung und Gebäudeautomation, Wartung und ' +
    'Service bei institutionellen Kunden. Sonstiges (ca. 10 %), klassische Installation, bewusst nicht ausgebaut. ' +
    'Über 80 % des Umsatzes laufen über Rahmenverträge mit Wartungs- und Serviceanteil.',
  market:
    'Zwei gesetzlich getriebene, nicht-zyklische Marktbewegungen tragen das Geschäft. Erstens der Hochlauf der ' +
    'Ladeinfrastruktur: rund 156.000 öffentliche Ladepunkte heute gegenüber einem politischen Ziel von 1 Mio. bis 2030, ' +
    'eine Versiebenfachung, für die Betreiber- und Abrechnungskompetenz im Markt knapp ist. Zweitens Submetering: Das ' +
    'Messstellenbetriebsgesetz schreibt die verbrauchsgenaue Abrechnung im Gewerbe vor, der Energiekostendruck bei ' +
    'Großimmobilien treibt die Nachfrage zusätzlich (Marktwachstum 5–7 % p. a.). ' +
    'Die Wettbewerbsposition ruht auf drei Verteidigungslinien: einem rechtlich-vertraglichen Burggraben (Pflichtnehmer-' +
    'Klausel im Pflichtenheft des Großkunden, über zwei Jahrzehnte gewachsen), einem operativ-technologischen (die ' +
    'Abrechnungsmethodik für 2.600 Messpunkte und 250 Veranstaltungen p. a. ist in der Region kein zweites Mal aufgebaut) ' +
    'und einem personell-relationalen (langjährige, stabile Ansprechpartner auf beiden Seiten).',
  organization:
    'Schlanke, außergewöhnlich stabile Mannschaft: 13 Mitarbeitende inklusive Geschäftsführer, ein Elektromeister, ' +
    'sechs Elektroniker, ein Auszubildender, fünf in Verwaltung und Service. Durchschnittliche Betriebszugehörigkeit ' +
    '13,5 Jahre, fünf Mitarbeitende über 15 Jahre dabei, Krankenquote rund 1 %, alle Verträge ungekündigt. ' +
    'Drei Rollen sind erfolgskritisch: Geschäftsführer (Beziehung zum Großkunden), Elektromeister (operative ' +
    'Großkundenverantwortung, akquiriert eigenständig) und Verwaltung (Buchhaltung, Lohn, Energieabrechnung). ' +
    'Elf Wochen Inhaber-Abwesenheit ohne operative oder finanzielle Auswirkungen sind nachgewiesen, die Organisation ' +
    'trägt sich selbst.',
  financials:
    'Gesamtleistung 2025: € 1,65 Mio. (2022: € 1,48 Mio., +11 % über vier Jahre). Rohertragsmarge stabil bei rund 70 %, ' +
    'Materialquote konstant bei etwa 30 % (Preisweitergabe gelingt). EBIT 2025: € 237k bzw. 14,4 % Marge, nach einem ' +
    'strukturellen Margensprung 2024 von 12,2 auf 14,5 % (Wachstum beim Großkunden bei konstanten Fixkosten). ' +
    'EBITDA normalisiert 2025: € 297k (18,0 %). Der Plan 2026–2030 ist bewusst konservativ: 2,5 % organisches Wachstum, ' +
    'Personal +3,0 % p. a., keine Skaleneffekte eingerechnet, EBIT-Marge bleibt in der Planung bei 14–15 %. ' +
    'Bilanz: keine Bankdarlehen, cash- und debt-free, Working-Capital-Deckung über zwei Monate. BWA-Daten durch ' +
    'Steuerbescheide validiert.',
  swot:
    'Stärken: vertraglich abgesicherte, praktisch nicht substituierbare Pflichtnehmer-Stellung bei einem überregional ' +
    'bedeutenden Messe- und Kongressstandort; branchenüberlegene Marge (14,4 % gegenüber 8–10 %); über 80 % ' +
    'wiederkehrende Erlöse aus Rahmenverträgen; eigene Abrechnungsinfrastruktur; schlanke Bilanz ohne Bankschulden; ' +
    'nachgewiesene Übergabefähigkeit.\n\n' +
    'Entwicklungspotenziale: Übertragung der Abrechnungsmethodik auf weitere Standorte; Ausbau des Ladepunkt-Betriebs ' +
    'zur CPO-Plattform mit eigener Abrechnung; Konsolidierung im fragmentierten Elektrohandwerk (Buy-and-Build); ' +
    'gezielter Ausbau der institutionellen Rahmenverträge.\n\n' +
    'Risiken: Kundenkonzentration (Messe-/Eventsegment rund 53 % des Umsatzes), gemindert durch die vertragliche ' +
    'Verankerung und eine über 20-jährige Historie; Schlüsselpersonen-Abhängigkeit, gemindert durch die nachgewiesene ' +
    'Abwesenheitsfähigkeit, die sechsmonatige Übergabebegleitung und die sehr niedrige Fluktuation; Fachkräftemangel im ' +
    'Elektrohandwerk: im Umkehrschluss zugleich der Konsolidierungshebel.',
  realestate:
    'Das Betriebsgebäude steht im Eigentum einer separaten Familiengesellschaft und wird zu marktüblichen Konditionen ' +
    'angemietet; ein Fortbestand des Mietverhältnisses nach Closing ist vorgesehen. Der Immobilienbesitz ist nicht ' +
    'Gegenstand der Transaktion. Betriebs- und Geschäftsausstattung sowie Mess- und Ladeinfrastruktur sind im Unternehmen.',
  buyer:
    'Gesucht wird ein Erwerber, der Kontinuität kauft statt Risiko: ein strategischer Käufer aus Elektrotechnik, TGA, ' +
    'Gebäude- oder Energiedienstleistung, ein CPO/Ladeinfrastruktur-Betreiber mit Interesse an eigener ' +
    'Abrechnungskompetenz, ein Buy-and-Build-Investor im fragmentierten Elektrohandwerk oder ein unternehmerischer ' +
    'Nachfolger (MBI) mit technischem Hintergrund. Angeboten werden 100 % der Anteile im Share Deal, cash- und debt-free. ' +
    'Verkaufsgrund ist die Altersnachfolge des Alleingesellschafters; die Belegschaft und die Kundenbeziehungen sollen ' +
    'erhalten bleiben.',
  process:
    'Strukturierter Sell-Side-Prozess, Signing-Ziel Dezember 2026. Nach unterzeichneter Vertraulichkeitsvereinbarung ' +
    'stehen das Information Memorandum, die Finanzplanung 2026–2030 und der Datenraum zur Verfügung. Anschließend ' +
    'folgen Management-Gespräch, indikatives Angebot mit eigener Bewertungssicht des Erwerbers, Due Diligence und ' +
    'Vertragsverhandlung. Der Prozess wird von der Phalanx GmbH begleitet.',
};

const SECTIONS = SECTION_KEYS.map(k => ({ key: k, title: SECTION_TITLES[k], enabled: true, body: BODIES[k] || '' }));

const DOCUMENTS = [
  { filename: 'Teaser_FARADAY_2026.pdf', file_type: 'application/pdf', file_size: 262144, access_level: 'public',
    description: 'Anonymisierter One-Pager: Positionierung, Marktrückenwind, Eckdaten und Prozess.' },
  { filename: 'Information_Memorandum_FARADAY_2026.pdf', file_type: 'application/pdf', file_size: 3145728, access_level: 'nda',
    description: 'Vertrauliches Information Memorandum (8 Sektionen inkl. Finanzteil und Bewertungsrahmen), nach NDA.' },
  { filename: 'Finanzplanung_FARADAY_2026-2030.xlsx', file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    file_size: 524288, access_level: 'nda',
    description: 'Integrierte Finanzplanung 2026–2030 (GuV, Annahmen, Sensitivitäten), nach NDA.' },
];

exports.up = async function (knex) {
  const project = await knex('projects').where({ codename: CODENAME }).first().catch(() => null);
  if (!project) { console.warn('[seed FARADAY] Projekt nicht gefunden, übersprungen'); return; }

  const admin = await knex('users').where({ email: 'neusser@phalanx.de' }).first().catch(() => null);
  const adminId = admin ? admin.id : project.created_by;

  await knex('projects').where({ id: project.id }).update({
    industry: PUBLIC.industry,
    region: PUBLIC.region,
    location_city: PUBLIC.location_city,
    deal_type: PUBLIC.deal_type,
    mandate_type: PUBLIC.mandate_type,
    revenue_band: PUBLIC.revenue_band,
    ebitda_band: PUBLIC.ebitda_band,
    sector_emoji: PUBLIC.sector_emoji,
    short_description: PUBLIC.short_description,
    highlights: JSON.stringify(PUBLIC.highlights),
    status: 'active',
    created_by: adminId,
    updated_at: knex.fn.now(),
  });

  const details = await knex('project_details').where({ project_id: project.id }).first().catch(() => null);
  if (details) {
    await knex('project_details').where({ project_id: project.id }).update({ ...DETAILS, updated_at: knex.fn.now() });
  } else {
    await knex('project_details').insert({ tenant_id: 1, project_id: project.id, ...DETAILS, traction_highlights: '[]' });
  }

  const expose = await knex('exposes').where({ project_id: project.id }).first().catch(() => null);
  if (!expose) {
    await knex('exposes').insert({
      tenant_id: 1,
      project_id: project.id,
      status: 'published',
      keyfacts_json: JSON.stringify(KEYFACTS),
      sections_json: JSON.stringify(SECTIONS),
      gallery_json: JSON.stringify([]),
      anonymized_ack: 1,
      updated_by: adminId,
      published_at: knex.fn.now(),
    });
  }

  for (const doc of DOCUMENTS) {
    const exists = await knex('documents').where({ project_id: project.id, filename: doc.filename }).first().catch(() => null);
    if (!exists) {
      await knex('documents').insert({ tenant_id: 1, project_id: project.id, uploaded_by: adminId, ...doc });
    }
  }
};

exports.down = async function (knex) {
  const project = await knex('projects').where({ codename: CODENAME }).first().catch(() => null);
  if (!project) return;
  await knex('exposes').where({ project_id: project.id }).del().catch(() => {});
  for (const doc of DOCUMENTS) {
    await knex('documents').where({ project_id: project.id, filename: doc.filename }).del().catch(() => {});
  }
  await knex('projects').where({ id: project.id }).update({ status: 'draft' }).catch(() => {});
};
