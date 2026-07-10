/**
 * Seed: zwei neue Transaktionsmandate für den Marktplatz.
 *  - „Betongold" — Nachfolge-/Komplettverkauf einer Architekturbeton-Manufaktur (3. Gen.)
 *  - „Cudd"      — Transformations-/Turnaround-Case einer traditionsreichen Kindermarke
 * Daten aus den realen Information Memoranda, jedoch ANONYMISIERT (keine Klar-/Kundennamen),
 * da der Marktplatz die Identität erst nach unterzeichneter NDA offenlegt.
 * Idempotent: legt je Projekt nur an, wenn der Codename noch nicht existiert.
 * Owner = Super-Admin (per E-Mail aufgelöst), tenant_id = 1, status = 'active'.
 */

const PROJECTS = [
  {
    public: {
      codename: 'Betongold',
      industry: 'Bauwirtschaft / Architekturbeton',
      region: 'DACH',
      location_city: 'DACH-Raum',
      deal_type: 'Nachfolge',
      mandate_type: 'ma',
      revenue_band: '€ 3–4 Mio.',
      ebitda_band: '~9,5 % Marge (Ø 2021–24)',
      stage: null,
      investment_needed: null,
      equity_stake: null,
      post_money_valuation: null,
      tam_band: null,
      sector_emoji: '🏛️',
      short_description:
        'Familiengeführte Premium-Manufaktur für Architekturbeton (Sichtbeton SB 3+) in dritter ' +
        'Generation. Fassaden, Tragwerke, Kirchen, Museen, Privatvillen — mit eigenem Schalungsbau ' +
        'als Kernkompetenz. Komplettverkauf (100 %, cash-/debt-free) im Rahmen einer Nachfolge; ' +
        'übergabebereiter Inhaber bleibt 12–24 Monate an Bord. Kapazitätsgrenzen = Wachstumshebel.',
      highlights: [
        'Premium-Nische Sichtbeton SB 3+ im fragmentierten DACH-Markt (~30–50 Anbieter)',
        'Vertikale Integration: eigener Schalungsbau im Haus (Eintrittsbarriere)',
        'Architektengetriebene Stammkundschaft, kein Kunde > 15 % Umsatz',
        'Saubere Bilanz: Net-Cash-positiv, keine Bankschulden',
        'Solide Cash-Generierung trotz Bauflaute (Operating CF € 150–250k p. a.)',
        'Abgelehnte Anfragen aus Kapazitätsgründen — Skalierungspotenzial für Käufer',
      ],
    },
    details: {
      full_description:
        'Die Gesellschaft ist eine familiengeführte Manufaktur für hochwertigen Architekturbeton ' +
        '(Sichtbeton der Klasse SB 3+) in dritter Generation, gegründet 1969. Gefertigt werden ' +
        'anspruchsvolle Sichtbeton-Elemente für Fassaden, Tragwerke sowie Prestigebauten wie ' +
        'Kirchen, Museen und Privatvillen. Ein eigener Schalungsbau (Formenbau im Haus) sichert ' +
        'Marge, Lieferzeit und Qualität und stellt zugleich die zentrale Eintrittsbarriere gegenüber ' +
        'Wettbewerbern dar. Der Inhaber/Geschäftsführer (3. Generation) möchte das Unternehmen im ' +
        'Wege eines Komplettverkaufs (100 % Share Deal, cash-/debt-free) an einen strategischen ' +
        'Käufer übergeben und steht für eine Transition von 12–24 Monaten (optional länger) zur ' +
        'Verfügung. Die Auftragslage ist solide; zuletzt mussten Anfragen aus Kapazitätsgründen ' +
        'abgelehnt werden — ein unmittelbarer Wachstumshebel für einen Erwerber mit Investitionskraft.',
      revenue_actual: 3459775,
      ebitda_actual: 355000,
      revenue_trend: 'Solide trotz Bauflaute (2024 € 3,46 Mio., 2023 € 3,95 Mio.); Anfragen zuletzt kapazitätsbedingt abgelehnt',
      employees: 29,
      founding_year: 1969,
      growth_strategy:
        'Auflösung des Kapazitätsengpasses (freie Halle im zweiten Werk), Ausbau der Produktlinien; ' +
        'Rückenwind aus öffentlichem Hochbau und energetischer Sanierung (Sichtbeton-affin, ' +
        'erwartetes Segmentwachstum ~8–10 % p. a. bis 2030).',
      key_risks:
        'Kapazitäts- und Fachkräfteengpass; Abhängigkeit vom übergebenden Inhaber (durch 12–24-monatige ' +
        'Transition adressiert); Zyklik des Wohnungsbaus (durch Premium-/Prestigesegment gedämpft).',
      asking_price_band: 'Equity indikativ € 3,0–4,0 Mio. (DCF nach IDW S1, WACC 7,8 % + Multiples)',
      team_description:
        'Erfahrene Führungsstruktur: Inhaber/GF (3. Generation, im Betrieb aufgewachsen, extern und ' +
        'international ausgebildet) sowie Fachkompetenz inhouse (Schreiner/Formenbau, Architekt, ' +
        'Betontechnologe). Der Inhaber begleitet die Übergabe 12–24 Monate.',
      problem_solution:
        'Architekten und Bauherren im Hochpreissegment fordern höchste Sichtbeton-Qualität (SB 3+) für ' +
        'komplexe Bauaufgaben. Das Unternehmen löst genau diese Aufgaben — inklusive eigenem ' +
        'Schalungsbau — und ist dadurch von externen Zulieferern unabhängig.',
      use_of_funds:
        'Komplettverkauf/Nachfolge (kein Kapitalbedarf des Unternehmens). Erwerberseitig sinnvoll: ' +
        'Investition in Kapazitätsausbau und Produktlinien zur Hebung des Nachfrageüberhangs.',
      traction_highlights: [
        '20+ wiederkehrende Stammkunden pro Jahr; Referenzen bei renommierten Architekturbüros im DACH-Raum',
        'Ø EBITDA-Marge 9,5 % (2021–24), Operating Cashflow € 150–250k p. a.',
        'Net-Cash-positiv zum Closing (~€ 0,2 Mio. geplant), keine Bankschulden',
      ],
      milestones:
        'Signing-Ziel Q4 2026; strukturierter Inhaberübergang über 12–24 Monate.',
    },
    documents: [
      { filename: 'Teaser_Betongold_2026.pdf', file_type: 'application/pdf',
        file_size: 401408, access_level: 'public',
        description: 'Anonymisierter Kurzüberblick (Steckbrief) zu Positionierung, Kompetenz und Prozess.' },
      { filename: 'Information_Memorandum_Betongold_2026.pdf', file_type: 'application/pdf',
        file_size: 405504, access_level: 'nda',
        description: 'Vertrauliches Information Memorandum inkl. Kennzahlen, Bewertung und Struktur (nach NDA).' },
    ],
  },
  {
    public: {
      codename: 'Cudd',
      industry: 'Konsumgüter / Kinderprodukte (Marke)',
      region: 'Bayern',
      location_city: 'Bayern',
      deal_type: 'Mehrheitsverkauf',
      mandate_type: 'ma',
      revenue_band: '€ 10–13 Mio.',
      ebitda_band: 'Turnaround (EBIT 2025 −1,05 Mio. €, Vorjahr −2,0 Mio. €)',
      stage: null,
      investment_needed: null,
      equity_stake: null,
      post_money_valuation: null,
      tam_band: null,
      sector_emoji: '🧸',
      short_description:
        'Traditionsreiche deutsche Premium-Kindermarke (hochwertige Plüsch- und Geschenkartikel, ' +
        '50+ Jahre) mitten in der Repositionierung zur digital-first Geschenkemarke für die „ersten ' +
        '1000 Tage". Starker Markenkern und hohe Bekanntheit im DACH-Raum, aber Nachholbedarf bei ' +
        'D2C/E-Commerce und Strukturen. Mehrheitspartner für die Transformation gesucht.',
      highlights: [
        '50+ Jahre etablierte Premium-Kindermarke, hohe Bekanntheit & Vertrauen im DACH-Raum',
        'Klare Repositionierung: „The Gift Brand for the First 1000 Days"',
        'Turnaround greift: EBIT-Verlust 2025 ggü. Vorjahr rund halbiert',
        'Wachstumshebel D2C/E-Commerce und internationale Expansion',
        'Etablierte Distribution (Fach-/Großhandel, Export) plus eigener Webshop',
      ],
    },
    details: {
      full_description:
        'Traditionsreiche deutsche Marke für hochwertige Plüsch- und Geschenkartikel für Kinder mit ' +
        'über 50 Jahren Historie und starker, emotional aufgeladener Markenbekanntheit im DACH-Raum. ' +
        'Das Unternehmen litt zuletzt unter einem rückläufigen Großhandelsmarkt, veralteten Strukturen ' +
        'und einer zu schwachen Digitalpräsenz. Als Antwort erfolgt die Repositionierung zu einer ' +
        'fokussierten, digital-first Geschenkemarke für die „ersten 1000 Tage" eines Kindes ' +
        '(Baby-Geschenke, Plüsch, Lern-/Spielprodukte, Kinderbekleidung) mit datengetriebenen ' +
        'Kundenbeziehungen. Verkauft wird über D2C, Fach-/Großhandel und Export. Gesucht wird ein ' +
        'Mehrheits-/Transformationspartner, der die Transformation vollendet und Wachstum in Digital, ' +
        'Markenbekanntheit und Internationalisierung treibt. Klassischer Transformations-/Turnaround-' +
        'Case mit intaktem, vertrauensstarkem Markenkern.',
      revenue_actual: 13124029,
      ebitda_actual: null,
      revenue_trend: 'Rückläufig: 2024 € 14,7 Mio. → 2025 € 13,1 Mio. → 2026e ~€ 10 Mio. (Run-Rate); Repositionierung digital-first läuft',
      employees: 85,
      founding_year: 1968,
      growth_strategy:
        'Aufbau eines profitablen D2C-/E-Commerce-Kanals; Schärfung der Marke „First 1000 Days"; ' +
        'kuratiertes, emotional aufgeladenes Sortiment; datengetriebene Kundenbeziehungen (CRM/CLV); ' +
        'internationale Expansion aus der starken DACH-Basis.',
      key_risks:
        'Noch verlustbringend (Fortführung von fortgesetzter Transformation/Finanzierung abhängig); ' +
        'Bankverbindlichkeiten ~€ 2,5 Mio. und niedrige Eigenkapitalquote (~8 %); Abhängigkeit vom ' +
        'Großhandel und dessen Konditionsdruck; Investitionsbedarf in Marke, Digitalinfrastruktur und Sortiment.',
      asking_price_band: 'Nach Vereinbarung; Struktur/Earn-out verhandelbar',
      team_description:
        'Erfahrenes operatives Management mit tiefem Markenverständnis; gezielt zu ergänzen um Digital-/' +
        'E-Commerce- und Transformationskompetenz — bewusst offen für einen aktiven Mehrheitspartner.',
      problem_solution:
        'Eine bekannte, vertrauensstarke Kindermarke, die den Sprung ins digitale, margenstärkere ' +
        'Geschäft noch nicht vollständig vollzogen hat. Genau hier liegt der Wertsteigerungshebel für ' +
        'einen Transformationsinvestor: emotionale Marken-DNA plus skalierbares, datengetriebenes Modell.',
      use_of_funds:
        'Vollendung der Transformation: Digital-/E-Commerce-Infrastruktur, Markenaufbau/Awareness, ' +
        'Sortiment „First 1000 Days" und internationale Expansion.',
      traction_highlights: [
        '50+ Jahre Markenhistorie, hohe gestützte Bekanntheit im Premium-Segment',
        'Etablierte Distribution im DACH-Raum (Fach-/Großhandel, Export)',
        'Eigener Webshop als Basis des D2C-Ausbaus',
      ],
      milestones:
        'Laufende Repositionierung „First 1000 Days"; strukturierte Investoren-/Partnersuche 2026.',
    },
    documents: [
      { filename: 'Teaser_Cudd_2026.pdf', file_type: 'application/pdf',
        file_size: 262144, access_level: 'public',
        description: 'Anonymisierter Kurzüberblick zu Marke, Repositionierung und Transformationsthese.' },
      { filename: 'Information_Memorandum_Cudd_2025.pdf', file_type: 'application/pdf',
        file_size: 4752571, access_level: 'nda',
        description: 'Vertrauliches Information Memorandum inkl. Transformationsplan und Finanzteil (nach NDA).' },
    ],
  },
];

exports.up = async function (knex) {
  const admin = await knex('users').where({ email: 'neusser@phalanx.de' }).first().catch(() => null);
  const adminId = admin ? admin.id : null;

  for (const p of PROJECTS) {
    const existing = await knex('projects').where({ codename: p.public.codename }).first().catch(() => null);
    if (existing) continue;

    const [row] = await knex('projects')
      .insert({
        tenant_id: 1,
        codename: p.public.codename,
        industry: p.public.industry,
        region: p.public.region,
        revenue_band: p.public.revenue_band,
        ebitda_band: p.public.ebitda_band,
        deal_type: p.public.deal_type,
        short_description: p.public.short_description,
        highlights: JSON.stringify(p.public.highlights),
        status: 'active',
        created_by: adminId,
        stage: p.public.stage,
        investment_needed: p.public.investment_needed,
        equity_stake: p.public.equity_stake,
        post_money_valuation: p.public.post_money_valuation,
        tam_band: p.public.tam_band,
        sector_emoji: p.public.sector_emoji,
        location_city: p.public.location_city,
        mandate_type: p.public.mandate_type,
      })
      .returning('id');

    const projectId = typeof row === 'object' ? row.id : row;

    const d = p.details;
    await knex('project_details').insert({
      project_id: projectId,
      full_description: d.full_description,
      revenue_actual: d.revenue_actual,
      ebitda_actual: d.ebitda_actual,
      revenue_trend: d.revenue_trend,
      employees: d.employees,
      founding_year: d.founding_year,
      growth_strategy: d.growth_strategy,
      key_risks: d.key_risks,
      asking_price_band: d.asking_price_band,
      team_description: d.team_description,
      problem_solution: d.problem_solution,
      use_of_funds: d.use_of_funds,
      traction_highlights: JSON.stringify(d.traction_highlights),
      milestones: d.milestones,
    });

    for (const doc of p.documents) {
      await knex('documents').insert({
        project_id: projectId,
        filename: doc.filename,
        file_type: doc.file_type,
        file_size: doc.file_size,
        access_level: doc.access_level,
        description: doc.description,
        uploaded_by: adminId,
      });
    }
  }
};

exports.down = async function (knex) {
  for (const p of PROJECTS) {
    await knex('projects').where({ codename: p.public.codename }).del().catch(() => {});
  }
};
