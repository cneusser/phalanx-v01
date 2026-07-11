/**
 * Seed: vollständige Exposés (DUB-Raster + Sektionen) für „Betongold" und „Cudd".
 * Inhalte aus den realen Information Memoranda, jedoch ANONYMISIERT (keine Klar-,
 * Kunden- oder Personennamen) — der Marktplatz legt die Identität erst nach NDA offen.
 * keyfacts_json/sections_json sind TEXT-Spalten → JSON.stringify.
 * Idempotent: legt je Projekt nur an, wenn noch kein Exposé existiert (project_id UNIQUE).
 */

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
const mkSections = (bodies, disabled = []) => SECTION_KEYS.map(k => ({
  key: k,
  title: SECTION_TITLES[k],
  enabled: !disabled.includes(k),
  body: bodies[k] || '',
}));

const EXPOSES = {
  Betongold: {
    keyfacts: {
      country: 'DACH-Raum',
      region: 'überregional tätig (DACH)',
      industries: 'Bauwirtschaft / Architekturbeton (Sichtbeton SB 3+)',
      founding_year: '1969',
      legal_form: 'GmbH',
      employees: '29',
      locations: 'Zwei Werke (im zweiten Werk freie Hallenkapazität)',
      revenue_band: '€ 3–4 Mio. (2024: € 3,46 Mio.; 2023: € 3,95 Mio.)',
      ebit_band: 'Ø EBITDA-Marge 9,5 % (2021–2024); normalisiertes EBITDA ~ € 0,35 Mio.',
      gf_availability: 'Inhaber/Geschäftsführer begleitet die Übergabe 12–24 Monate (optional länger)',
      stake_offered: '100 % (Komplettverkauf)',
      participation_type: 'Share Deal, cash- und debt-free',
      price_band: 'Equity indikativ € 3,0–4,0 Mio. (DCF nach IDW S1, WACC 7,8 % + Multiples)',
      purchase_modalities: 'Kaufpreis zum Closing; geplanter Net Cash ~ € 0,2 Mio.; Struktur verhandelbar',
    },
    sections: mkSections({
      company:
        'Familiengeführte Manufaktur für hochwertigen Architekturbeton in dritter Generation, gegründet 1969. ' +
        'Das Unternehmen hat sich über Jahrzehnte als Spezialist für anspruchsvollen Sichtbeton im Hochpreissegment ' +
        'etabliert und wird bis heute inhabergeführt. Der Gesellschafter-Geschäftsführer (3. Generation) ist im Betrieb ' +
        'aufgewachsen, extern und international ausgebildet und sucht nun eine geregelte Nachfolge im Wege eines ' +
        'Komplettverkaufs an einen strategischen Käufer.',
      offering:
        'Gefertigt werden Sichtbeton-Elemente der Klasse SB 3+ — glatte Oberflächen, Matrizen, gestockt, gestrahlt, ' +
        'gesäuert — für Fassaden und Tragwerke sowie für Prestigebauten wie Kirchen, Museen, Verwaltungsbauten und ' +
        'Privatvillen. Kernkompetenz und zentrale Eintrittsbarriere ist der eigene Schalungs-/Formenbau im Haus: ' +
        'Die Formen für jedes Projekt werden intern gefertigt. Das spart Lieferzeit, sichert die Marge und macht das ' +
        'Unternehmen unabhängig von externen Zulieferern. Aufträge kommen wiederkehrend über renommierte ' +
        'Architekturbüros im DACH-Raum; kein Kunde steht für mehr als 15 % des Umsatzes.',
      market:
        'Sichtbeton SB 3+ ist ein Nischenmarkt mit lediglich rund 30–50 qualifizierten Anbietern im DACH-Raum; ' +
        'die Eintrittsbarriere liegt in Know-how, Referenzen und Schalungsbau-Kompetenz. Während der Wohnungsbau ' +
        'schwach bleibt, wachsen der öffentliche Hochbau und die energetische Sanierung — genau jene Segmente, in ' +
        'denen Architekturbeton nachgefragt wird (erwartetes Segmentwachstum rund 8–10 % p. a. bis 2030). ' +
        'Über 60 % des deutschen Gebäudebestands ist älter als 40 Jahre; die EU-Gebäuderichtlinie treibt die ' +
        'Sanierung. Zudem setzen Investoren aufgrund von ESG-Berichtspflichten verstärkt auf langlebige Materialien: ' +
        'Sichtbeton hält 80+ Jahre.',
      organization:
        'Schlanke, erfahrene Organisation mit 29 Mitarbeitenden. Neben dem Inhaber/Geschäftsführer verfügt das Team ' +
        'über Fachkompetenz inhouse: drei Spezialisten im Schalungs-/Formenbau (Schreiner), Architekt und ' +
        'Betontechnologe. Die operative Kontinuität ist über den erfahrenen Kern gesichert; der Inhaber begleitet die ' +
        'Übergabe 12–24 Monate.',
      financials:
        'Umsatzerlöse 2024: € 3,46 Mio. (2023: € 3,95 Mio.). Durchschnittliche EBITDA-Marge 2021–2024: 9,5 %; ' +
        'normalisiertes EBITDA (2025e) rund € 0,35 Mio. Der operative Cashflow liegt trotz Bauflaute stabil bei ' +
        '€ 150–250k p. a. — das Premium-Segment ist deutlich weniger zyklisch als der Massenmarkt. Die Bilanz ist ' +
        'sauber: Net-Cash-positiv, keine Bankschulden, keine erkennbaren W&I-relevanten Altlasten. Zum Closing ist ' +
        'ein Net Cash von rund € 0,2 Mio. geplant.',
      swot:
        'Stärken: Premium-Positionierung in einer fragmentierten Nische; vertikale Integration über den eigenen ' +
        'Schalungsbau; architektengetriebene, wiederkehrende Kundenbeziehungen ohne Klumpenrisiko; solide ' +
        'Cash-Generierung; saubere, schuldenfreie Bilanz; übergabebereiter Inhaber.\n\n' +
        'Entwicklungspotenziale: Zuletzt mussten Anfragen aus Kapazitätsgründen abgelehnt werden — der Engpass ist ' +
        'unmittelbar hebbar (freie Halle im zweiten Werk). Weitere Hebel: Ausbau der Produktlinien, gezielte ' +
        'Positionierung im wachsenden öffentlichen Hochbau und in der Sanierung.\n\n' +
        'Risiken: Verfügbarkeit gewerblich-technischer Fachkräfte; Abhängigkeit vom übergebenden Inhaber (durch die ' +
        '12–24-monatige Transition adressiert); Zyklik des Wohnungsbaus (durch das Prestigesegment gedämpft).',
      realestate:
        'Produktion an zwei Werksstandorten. Im zweiten Werk besteht freie Hallenkapazität — die unmittelbare ' +
        'Grundlage, um den bestehenden Nachfrageüberhang ohne größere Neuinvestition zu heben.',
      buyer:
        'Verkaufsgrund ist die altersbedingte, geregelte Nachfolge in dritter Generation. Gesucht wird ein ' +
        'strategischer Käufer mit Investitionskraft, der den Kapazitätsengpass löst und die Premium-Positionierung ' +
        'fortführt — etwa ein Bau-/Baustoffunternehmen, ein Fassaden- oder Fertigteilspezialist oder ein Investor mit ' +
        'Buy-and-Build-Ansatz im fragmentierten DACH-Markt. Der Inhaber steht für einen strukturierten Übergang zur Verfügung.',
      process:
        'Q3/2026: Information Memorandum und Management-Präsentation. Q4/2026: indikative Angebote. ' +
        'H1/2027: Signing/Closing mit gestaffeltem Inhaberübergang (12–24 Monate). ' +
        'Der Prozess wird exklusiv von der Phalanx GmbH begleitet; vertrauliche Unterlagen nach unterzeichneter NDA.',
    }),
  },

  Cudd: {
    keyfacts: {
      country: 'Deutschland',
      region: 'Bayern',
      industries: 'Konsumgüter / Kinderprodukte (Plüsch, Baby-Geschenke, Kinderbekleidung)',
      founding_year: '1968',
      legal_form: 'GmbH & Co. KG',
      employees: 'rund 85 (Vollzeitäquivalente); ~130 Köpfe',
      locations: 'Zentrale mit Logistik; eigene Shops und Outlets; Export',
      revenue_band: '€ 10–13 Mio. (2025: € 13,1 Mio.; 2026e ~ € 10 Mio. Run-Rate)',
      ebit_band: 'Turnaround: EBIT 2025 −1,05 Mio. € (Vorjahr −2,0 Mio. €)',
      gf_availability: 'Management bleibt an Bord; Ergänzung um Digital-/Transformationskompetenz erwünscht',
      stake_offered: 'Mehrheit',
      participation_type: 'Mehrheitsverkauf / Transformationspartnerschaft',
      price_band: 'Nach Vereinbarung',
      purchase_modalities: 'Struktur und Earn-out verhandelbar; Kapitalzuführung zur Vollendung der Transformation möglich',
    },
    sections: mkSections({
      company:
        'Traditionsreiche deutsche Premium-Marke für hochwertige Plüsch- und Geschenkartikel für Kinder mit über ' +
        '50 Jahren Historie (Wurzeln des Unternehmens reichen bis ins 19. Jahrhundert). Seit Anfang der 1990er-Jahre ' +
        'ist die Marke konsequent auf Baby und Kind fokussiert. Über Generationen haben Eltern und Großeltern im ' +
        'DACH-Raum der Marke bei den wichtigsten Momenten — allen voran der Geburt — vertraut. Die Marke steht für ' +
        'europäisches Design, kompromisslose Sicherheitsstandards und den emotionalen Wert von Geschenken.',
      offering:
        'Das Sortiment umfasst Kuscheln/Plüsch, Baby- und Spielprodukte, Accessoires sowie Baby- und Kindermode. ' +
        'Aktuell erfolgt die Repositionierung zu einer fokussierten, digital-first Geschenkemarke für die „ersten ' +
        '1000 Tage" eines Kindes — mit kuratiertem, emotional aufgeladenem Sortiment und datengetriebenen ' +
        'Kundenbeziehungen. Vertriebskanäle: Fach- und Großhandel, Export, eigene Shops/Outlets sowie ein eigener ' +
        'Webshop als Basis des D2C-Ausbaus.',
      market:
        'Der Markt für emotionale Geschenke rund um Geburt und frühe Kindheit wächst — insbesondere online. ' +
        'Gleichzeitig steht der klassische stationäre Großhandel strukturell unter Druck (Konditionsdruck, ' +
        'rückläufige Flächen). Genau aus dieser Schere entsteht die Wertsteigerungsthese: eine vertrauensstarke ' +
        'Marke mit hoher Bekanntheit, die den Sprung in den margenstärkeren Direktvertrieb noch vor sich hat.',
      organization:
        'Rund 85 Vollzeitäquivalente (etwa 130 Köpfe) in Entwicklung, Marketing, Vertrieb, Logistik, Produktion, ' +
        'eigenen Shops/Outlets und Support. Das operative Management verfügt über tiefes Marken- und ' +
        'Produktverständnis. Gezielt zu ergänzen sind Kompetenzen in Digital/E-Commerce und Transformationssteuerung — ' +
        'bewusst offen für einen aktiven Mehrheitspartner.',
      financials:
        'Umsatzerlöse 2025: € 13,1 Mio. (2024: € 14,7 Mio.; −10,6 %). Das laufende Jahr 2026 steuert auf eine ' +
        'Run-Rate von rund € 10 Mio. zu. Das Betriebsergebnis (EBIT) verbesserte sich 2025 deutlich auf −1,05 Mio. € ' +
        '(Vorjahr: −2,0 Mio. €) — der Verlust wurde damit rund halbiert; der Turnaround greift. Bankverbindlichkeiten ' +
        'rund € 2,5 Mio.; Eigenkapitalquote 8,1 %. Die Fortführung ist an die konsequente Umsetzung der Transformation ' +
        'und deren Finanzierung geknüpft. Detaillierte Zahlen inkl. Jahresabschluss und laufendem Ergebnisreport nach NDA.',
      swot:
        'Stärken: über 50 Jahre Markenhistorie mit hoher gestützter Bekanntheit im Premium-Segment; loyale ' +
        'Stammkäufer; etablierte Distribution im DACH-Raum; klare, bereits eingeleitete Repositionierung; ' +
        'sichtbarer Turnaround-Fortschritt (EBIT-Verlust halbiert).\n\n' +
        'Entwicklungspotenziale: Aufbau eines profitablen D2C-/E-Commerce-Kanals; Sortiments- und ' +
        'Komplexitätsreduktion; Optimierung von Einkauf, Produktion und Working Capital; internationale Expansion ' +
        'aus der starken DACH-Basis.\n\n' +
        'Risiken: Umsetzungsrisiko der Transformation; Abhängigkeit vom Großhandel und dessen Konditionsdruck; ' +
        'Investitionsbedarf in Marke, Digitalinfrastruktur und Sortiment; angespannte Bilanzstruktur.',
      realestate: '',
      buyer:
        'Gesucht wird ein Mehrheits- bzw. Transformationspartner, der die Transformation aktiv mitgestaltet und ' +
        'finanziert: Erfahrung in Konsumgütern/Markenführung und insbesondere in D2C/E-Commerce ist ausdrücklich ' +
        'erwünscht — etwa ein strategischer Konsumgüterinvestor, ein Private-Equity-Haus mit Value-Creation-/' +
        'Turnaround-Ansatz oder ein Familienunternehmen mit Digitalkompetenz. Verkaufsgrund ist die Vollendung der ' +
        'Transformation und die Finanzierung des Wachstums in Digital, Markenbekanntheit und Internationalisierung.',
      process:
        'Die Repositionierung („First 1000 Days") läuft. 2026: strukturierte Investoren-/Partnersuche. ' +
        'Nach unterzeichneter NDA stehen Information Memorandum, Transformationsplan, Jahresabschluss und ' +
        'laufender Ergebnisreport zur Verfügung. Der Prozess wird von der Phalanx GmbH begleitet.',
    }, ['realestate']),
  },
};

exports.up = async function (knex) {
  const admin = await knex('users').where({ email: 'neusser@phalanx.de' }).first().catch(() => null);
  const adminId = admin ? admin.id : null;

  for (const [codename, data] of Object.entries(EXPOSES)) {
    const project = await knex('projects').where({ codename }).first().catch(() => null);
    if (!project) continue;
    const existing = await knex('exposes').where({ project_id: project.id }).first().catch(() => null);
    if (existing) continue;

    await knex('exposes').insert({
      tenant_id: 1,
      project_id: project.id,
      status: 'published',
      keyfacts_json: JSON.stringify(data.keyfacts),
      sections_json: JSON.stringify(data.sections),
      gallery_json: JSON.stringify([]),
      anonymized_ack: 1,
      updated_by: adminId,
      published_at: knex.fn.now(),
    });
  }
};

exports.down = async function (knex) {
  for (const codename of Object.keys(EXPOSES)) {
    const project = await knex('projects').where({ codename }).first().catch(() => null);
    if (project) await knex('exposes').where({ project_id: project.id }).del().catch(() => {});
  }
};
