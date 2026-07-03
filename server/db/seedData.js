// ─────────────────────────────────────────────────────────────────────────────
// Zentrale, konfigurierbare Mandats-Stammdaten (Decknamen, Kennzahlen, Texte).
// Wird von seed.js (Voll-Seed) und database.js (idempotente Migrationen) genutzt.
// Kennzahlen hier ändern — NICHT im Code hartkodieren.
//
// HINWEIS Anonymisierung: Alle Felder unter `public` sind ohne Login/NDA
// sichtbar (Teaser). Hier dürfen KEINE identifizierenden Angaben stehen.
// Felder unter `details` sind erst nach NDA-Freigabe sichtbar.
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN = {
  email:      process.env.ADMIN_EMAIL || 'neusser@phalanx.de',
  password:   process.env.ADMIN_PASSWORD || 'Phalanx@2026!',
  role:       'super_admin',
  first_name: 'Christian',
  last_name:  'Neusser',
  company:    'Phalanx GmbH',
  position:   'Geschäftsführer',
  phone:      '+49 9131 9206075',
};

const PROJECTS = [
  {
    public: {
      // Deckname-Platzhalter — finaler Deckname wird vom Betreiber festgelegt
      codename: 'Projekt B',
      industry: 'Food & Nutrition',
      region: 'Bayern',
      location_city: 'Süddeutschland',
      deal_type: 'Seed-Finanzierung',
      stage: 'Seed',
      mandate_type: 'fundraising',
      revenue_band: '—',
      ebitda_band: '—',
      investment_needed: '€ 1,1 Mio.',
      equity_stake: '~26 %',
      post_money_valuation: '€ 3,5 Mio.',
      tam_band: '€ 9,3 Mrd.',
      sector_emoji: '🍲',
      short_description:
        'Bio-Kraftsuppen & Functional Food für Darmgesundheit — vom organisch validierten Proof-of-Market zur Love Brand. Fast 1.000 Lifetime-Kunden ohne Paid Marketing, BIO-zertifiziert, 0g Zucker, 3 Jahre Haltbarkeit ohne Kühlkette.',
      highlights: [
        'Organisch validierter Markt: fast 1.000 Lifetime-Kunden — ohne Paid Marketing',
        'Ø Bestellwert € 61 brutto, hohe Wiederkaufsrate & starke Shop-Conversion',
        'Listungen bei führendem LEH-Start-up-Programm & Online-Feinkosthändler; prominenter Markenbotschafter',
        'Klarer Pfad zur EBITDA-Profitabilität bis 2029 (Umsatzziel € 1,64 Mio.)',
        'Vier diversifizierte Kanäle: D2C, Supplements, B2B-Sets, Bio-Handel',
      ],
    },
    details: {
      full_description:
        'Das Unternehmen produziert Bio-Kraftsuppen und Kraftbrühen (6 Sorten, 2 Linien) und vertreibt sie über vier Kanäle: D2C-E-Commerce als validiertes Kerngeschäft, Functional-Food-Supplements (NEM), B2B-Geschenk-Sets und Bio-Handel. 100 % BIO-zertifiziert, 0g Zucker, Clean Label, 3 Jahre Haltbarkeit ohne Kühlkette.',
      revenue_actual: null,
      ebitda_actual: null,
      revenue_trend: 'Aufbauphase',
      employees: 3,
      founding_year: 2022,
      growth_strategy: 'Paid Marketing (Google/Meta), Team-Aufbau (COO), Working Capital, Einführung NEM-Produktlinie',
      key_risks: 'Saisonalität (Winter-Schwerpunkt), Working Capital bei Wachstum, Abhängigkeit von Gründern',
      asking_price_band: '€ 3,5 Mio. Post-Money (Seed)',
      team_description:
        'Gründerpaar (CEO & Co-Founder) — Branchenkenntnis Food & E-Commerce, organisches Community-Building. Namen nach NDA-Freigabe im Datenraum.',
      problem_solution:
        'Zeitarmut trifft Gesundheitsbewusstsein: Verbraucher wollen echte, nährstoffreiche Ernährung ohne Aufwand. Das Unternehmen liefert Clean-Label Bio-Kraftsuppen — fertig in Sekunden, 3 Jahre haltbar, kein Zucker.',
      use_of_funds: '45 % Paid Marketing & Growth · 25 % Working Capital · 20 % Team (COO) · 10 % NEM-Produktlinie',
      traction_highlights: [
        'Fast 1.000 Lifetime-Kunden — 100 % organisch',
        '€ 61 Ø Bestellwert brutto',
        'Listung führendes LEH-Start-up-Programm & Online-Feinkosthändler',
        'Prominenter Markenbotschafter (Extremsportler)',
        'Pipeline B2B-Partner & Hebammen-Kanal',
      ],
      milestones: 'Break-even bis 2029, Umsatzziel € 1,64 Mio.',
    },
    documents: [
      {
        filename: 'Investment_Teaser_Projekt_B_2026.pdf',
        file_type: 'application/pdf',
        file_size: 2097152,
        access_level: 'public',
        description: 'Investment Teaser Projekt B 2026 — zugänglich nach Registrierung und Admin-Freigabe',
      },
      {
        filename: 'Pitchdeck_Projekt_B_2026.pptx',
        file_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        file_size: 8388608,
        access_level: 'nda',
        description: 'Pitchdeck & Detailunterlagen — nur nach NDA-Unterzeichnung',
      },
    ],
  },
  {
    public: {
      codename: 'Nexora',
      industry: 'Industrial Tech / AI',
      region: 'Bayern',
      location_city: 'Erlangen / São Paulo',
      deal_type: 'Angel-Runde',
      stage: 'Angel Round',
      mandate_type: 'fundraising',
      revenue_band: '—',
      ebitda_band: '—',
      investment_needed: '€ 1,1 Mio.',
      equity_stake: '20 %',
      post_money_valuation: '€ 5,5 Mio.',
      tam_band: '€ 238 Mrd.',
      sector_emoji: '🏭',
      short_description:
        'Agentic Factory OS — KI-Agenten verbinden Maschinendaten mit dem Erfahrungswissen der Bediener. Erste Pilot-Installation bei einem Tier-1-Automotive-Zulieferer in Betrieb. 7 strukturelle USPs, kein Direktwettbewerber.',
      highlights: [
        'First Mover: einziger Anbieter, der KI-Agenten + Operator-Kontextwissen end-to-end kombiniert',
        'Live-Pilot bei Tier-1-Automotive-Zulieferer (Brasilien) — 4 Maschinen in täglichem Betrieb',
        'Hardware-Moat: proprietäre Kiosk- und Kamera-Hardware on-prem, DSGVO-konform',
        'Gründerteam: 25+ Jahre Industrieautomation, mehrere erfolgreiche Exits',
        'Fokussierte Angel-Runde: € 1,1 Mio. für 8+ Installationen & 12 Monate Runway',
      ],
    },
    details: {
      full_description:
        'Das erste Agentic Factory OS, das KI-Agenten mit dem Kontextwissen der Maschinenbediener zu einer 360°-Lösung verbindet. Software + proprietäre Hardware (Kiosk, Kamera) über fünf Produktsegmente: Konnektivität, AI-Communication, UNS/SCADA, AI-Agents, Cloud/Enterprise. On-prem, hybrid oder Cloud — DSGVO-konform.',
      revenue_actual: null,
      ebitda_actual: null,
      revenue_trend: 'Aufbauphase / Pre-Revenue',
      employees: 6,
      founding_year: 2023,
      growth_strategy: '8+ Installationen, 4 technische FTEs, Pilot → recurring Revenue, IP-Anmeldung, Seed/Series-A vorbereiten',
      key_risks: 'Technische Personalkapazität als aktueller Engpass, langer B2B-Sales-Zyklus',
      asking_price_band: '€ 5,5 Mio. Post-Money (Angel Round)',
      team_description:
        'CEO/CTO: 25+ Jahre Machine Vision & Industrial Automation, mehrere Exits. COO/Legal: Corporate Law, Kapitalmarkt-Erfahrung. AI Dev Lead: Ph.D. Computer Science, 25+ Jahre KI. Namen nach NDA-Freigabe im Datenraum.',
      problem_solution:
        'Maschinendaten ohne menschlichen Kontext erklären nur die Hälfte. Demographischer Wandel: erfahrene Bediener gehen, ihr Wissen geht mit. Die Lösung verbindet Maschinendaten in Echtzeit mit Bediener-Beobachtungen — KI-Agenten bewahren und übertragen Produktionswissen über Schichten hinweg.',
      use_of_funds: '45 % Team & technische FTEs · 30 % Pilot-Rollout (8+ Installationen) · 15 % Produkt & Hardware · 10 % Go-to-Market',
      traction_highlights: [
        'Live-Pilot bei Tier-1-Automotive-Zulieferer (Brasilien) — 4 Maschinen in täglichem Betrieb',
        'Pilot-Erweiterung + Extrusion Line mündlich vereinbart (schriftlich Juni 2026)',
        'Pipeline: Europa-Standorte des Pilotkunden (Polen & Spanien), Kosmetik/Food-Integrator, Spritzguss NRW',
        '51 Marktplayer analysiert — kein Direktwettbewerber mit End-to-End-Lösung',
      ],
      milestones: '12-Monats-Milestones: 8+ Installationen in Betrieb, 4 FTEs eingestellt, Pilots → recurring Revenue, IP-Anmeldung, Seed/Series-A positioniert',
    },
    documents: [
      {
        filename: 'Nexora_Teaser_EN_v3.pptx',
        file_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        file_size: 1024000,
        access_level: 'public',
        description: 'Investment Teaser Nexora (englisch) — zugänglich nach Registrierung und Admin-Freigabe',
      },
      {
        filename: 'Nexora_CIM_EN.pptx',
        file_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        file_size: 5242880,
        access_level: 'nda',
        description: 'Confidential Information Memorandum (CIM) — nur nach NDA-Unterzeichnung',
      },
    ],
  },
];

// Historische Decknamen → aktueller Deckname (idempotente Rename-Migrationen)
const CODENAME_RENAMES = [
  { from: 'Scopo GmbH',   to: 'Nexora' },
  { from: 'ika ika GmbH', to: 'Projekt B' },
];

// Alle jemals gültigen Codenamen (für Cleanup-Whitelist während der Transition)
const KNOWN_CODENAMES = [
  ...PROJECTS.map(p => p.public.codename),
  ...CODENAME_RENAMES.map(r => r.from),
];

module.exports = { ADMIN, PROJECTS, CODENAME_RENAMES, KNOWN_CODENAMES };
