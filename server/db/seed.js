require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { initialize, prepare, saveDb } = require('./database');

async function seed() {
  await initialize();
  console.log('🌱 Seeding Phalanx database...');

  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // Clear data
  ['audit_logs', 'documents', 'nda_requests', 'project_details', 'projects', 'buyer_profiles', 'users'].forEach(t => {
    prepare(`DELETE FROM ${t}`).run();
  });

  // Users
  const ins = (email, pw, role, fn, ln, co, pos, bt, phone) =>
    prepare(`INSERT INTO users (email, password_hash, role, first_name, last_name, company, position, buyer_type, phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`).run(email, hash(pw), role, fn, ln, co, pos, bt, phone);

  const adminId = ins('neusser@phalanx.de', 'Admin1234!', 'super_admin', 'Christian', 'Neusser', 'Phalanx GmbH', 'Geschäftsführer', null, '+49 9131 9206075').lastInsertRowid;
  ins('berater@phalanx.de', 'Berater1234!', 'advisor', 'Sophie', 'Richter', 'Phalanx GmbH', 'Senior Advisor', null, '+49 89 234567');
  const buyer1Id = ins('max.mueller@example.de', 'Buyer1234!', 'buyer', 'Max', 'Müller', 'Müller Holding GmbH', 'Geschäftsführer', 'strategic', '+49 170 1234567').lastInsertRowid;
  const buyer2Id = ins('petra.schreiber@example.de', 'Buyer1234!', 'buyer', 'Petra', 'Schreiber', 'PS Capital GmbH', 'Managing Partner', 'financial', '+49 160 7654321').lastInsertRowid;

  // Buyer profiles
  prepare(`INSERT INTO buyer_profiles (user_id, industries, regions, revenue_min, revenue_max, ebitda_min, ebitda_max, deal_types, investment_style) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    buyer1Id, JSON.stringify(['Maschinenbau', 'Automotive', 'Industrietechnik']),
    JSON.stringify(['Bayern', 'Baden-Württemberg', 'DACH']), 5, 30, 1, 6,
    JSON.stringify(['Nachfolge', 'MBO', 'Wachstumskapital']), 'strategic'
  );
  prepare(`INSERT INTO buyer_profiles (user_id, industries, regions, revenue_min, revenue_max, ebitda_min, ebitda_max, deal_types, investment_style) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    buyer2Id, JSON.stringify(['Software & IT', 'Business Services', 'Healthcare']),
    JSON.stringify(['Gesamtdeutschland', 'DACH']), 3, 20, 0.5, 4,
    JSON.stringify(['MBO', 'MBI', 'Buy-and-Build']), 'financial'
  );

  // Projects – klassisch M&A
  const insP = (c, i, r, rb, eb, dt, sd, hl) =>
    prepare(`INSERT INTO projects (codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights, status, mandate_type, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 'ma', ?, datetime('now'))`).run(c, i, r, rb, eb, dt, sd, JSON.stringify(hl), adminId).lastInsertRowid;

  // Startup-Fundraising Mandate
  const insStartup = (opts) => prepare(`
    INSERT INTO projects (codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights,
      stage, investment_needed, equity_stake, post_money_valuation, tam_band, sector_emoji, location_city, mandate_type,
      status, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'fundraising', 'active', ?, datetime('now'))
  `).run(
    opts.codename, opts.industry, opts.region, opts.revenue_band || '—', opts.ebitda_band || '—',
    opts.deal_type, opts.short_description, JSON.stringify(opts.highlights),
    opts.stage, opts.investment_needed, opts.equity_stake, opts.post_money_valuation,
    opts.tam_band, opts.sector_emoji, opts.location_city, adminId
  ).lastInsertRowid;

  const p1 = insP('Projekt Atlas', 'Maschinenbau', 'Bayern', '10–20 Mio. €', '1,5–3 Mio. €', 'Nachfolge',
    'Etablierter Sondermaschinen­hersteller mit über 40 Jahren Markterfahrung, stabiler Kundenbasis und starker Exportquote. Inhaber sucht geordnete Unternehmensnachfolge.',
    ['Marktführer in einer Nische des Sondermaschinenbaus', 'Exportquote > 60 %, Kunden in 18 Ländern', 'Langfristige Rahmenverträge mit DAX-Unternehmen', 'Erfahrenes Management bereit zur Weiterführung']);

  const p2 = insP('Projekt Merkur', 'Software & IT', 'Norddeutschland', '5–10 Mio. €', '1–2 Mio. €', 'Wachstumskapital',
    'Wachstumsorientierter SaaS-Anbieter für ERP-Lösungen im Mittelstand. Starke Wiederkehrrate, skalierbares Produkt, bereit für den nächsten Wachstumsschritt.',
    ['ARR > 4 Mio. €, NRR > 110 %', 'Bewährtes Produkt mit 150+ Mittelstandskunden', 'Klarer Expansionsplan in DACH+', 'Gründerteam investiert bleibend']);

  const p3 = insP('Projekt Juno', 'Business Services', 'NRW', '8–15 Mio. €', '1–2,5 Mio. €', 'MBO',
    'Führender Anbieter von Outsourcing-Dienstleistungen im Bereich Lohn & Gehalt sowie HR-Administration. Langjährige Kundenbeziehungen und hohe Wiederkehrumsätze.',
    ['Kundenbindungsrate > 95 %', 'Digitale Infrastruktur vollständig modernisiert', 'MBO durch bestehende Führungskräfte geplant', 'Wachstumspotenzial durch Add-On-Akquisitionen']);

  insP('Projekt Neptun', 'Healthcare & Medizintechnik', 'Baden-Württemberg', '15–25 Mio. €', '2–4 Mio. €', 'Strategische Partnerschaft',
    'Spezialisierter Hersteller von diagnostischen Verbrauchsmaterialien für den europäischen Labormarkt. Zertifizierte Produkte, starkes IP-Portfolio.',
    ['CE-zertifizierte Produktpalette, FDA-Prozess laufend', 'Mehrere Patente und Schutzrechte', 'Rahmenverträge mit führenden Laborketten', 'Eigene F&E-Kapazitäten für neue Produktlinien']);

  insP('Projekt Apollo', 'Automotive & Zulieferer', 'Sachsen / Thüringen', '20–35 Mio. €', '2–4 Mio. €', 'Nachfolge / MBI',
    'Tier-2-Zulieferer für präzisionsgefertigte Metallbaugruppen. Gut positioniert im Wandel zur Elektromobilität durch frühzeitige Produktdiversifizierung.',
    ['Diversifizierter Kundenmix: ICE und EV', 'Hochautomatisierter Maschinenpark (Ø Alter < 5 Jahre)', 'Zertifiziert nach IATF 16949', 'EBITDA-Marge stabil > 10 %']);

  insP('Projekt Venus', 'Lebensmittel & Getränke', 'Süddeutschland', '5–12 Mio. €', '0,8–1,5 Mio. €', 'Buy-and-Build',
    'Regionaler Premiumhersteller von Bio-Lebensmitteln mit starker D2C-Komponente und wachsendem Retailgeschäft in Deutschland und Österreich.',
    ['Premium-Markenpositionierung im Bio-Segment', 'D2C-Kanal mit > 25.000 aktiven Abonnenten', 'Saisonale Skalierbarkeit, hohe Marge im Online-Segment', 'Ideal als Plattform für weitere Markenakquisitionen']);

  // ── Startup-Fundraising Mandate ──────────────────────────────────────────
  const ikaId = insStartup({
    codename: 'ika ika GmbH',
    industry: 'Food & Nutrition',
    region: 'Bayern',
    location_city: 'München',
    deal_type: 'Seed-Finanzierung',
    stage: 'Seed',
    investment_needed: '€ 1,1 Mio.',
    equity_stake: '~26 %',
    post_money_valuation: '€ 3,5 Mio.',
    tam_band: '€ 9,3 Mrd.',
    sector_emoji: '🍲',
    short_description: 'Bio-Kraftsuppen & Functional Food für Darmgesundheit — vom organisch validierten Proof-of-Market zur Love Brand. 958 Lifetime-Kunden ohne Paid Marketing, BIO-zertifiziert, 0g Zucker, 3 Jahre Haltbarkeit ohne Kühlkette.',
    highlights: [
      'Organisch validierter Markt: 958 Lifetime-Kunden, 283 aktiv – ohne Paid Marketing',
      'Ø Bestellwert € 61 brutto, hohe Wiederkaufsrate & starke Shop-Conversion',
      'Listungen REWE Start-up Lounge & Foodist; Markenbotschafter Jonas Deichmann',
      'Klarer Pfad zur EBITDA-Profitabilität bis 2029 (Umsatzziel € 1,64 Mio.)',
      'Vier diversifizierte Kanäle: D2C, Supplements, B2B-Sets, Bio-Handel',
    ],
  });

  const scopoId = insStartup({
    codename: 'Scopo GmbH',
    industry: 'Industrial Tech / AI',
    region: 'Bayern',
    location_city: 'Erlangen / São Paulo',
    deal_type: 'Angel-Runde',
    stage: 'Angel Round',
    investment_needed: '€ 1,1 Mio.',
    equity_stake: '20 %',
    post_money_valuation: '€ 5,5 Mio.',
    tam_band: '€ 238 Mrd.',
    sector_emoji: '🏭',
    short_description: 'Agentic Factory OS — KI-Agenten verbinden Maschinendaten mit dem Erfahrungswissen der Bediener. Erste Pilot-Installation bei Hutchinson Brazil (Tier-1 Automotive) in Betrieb. 7 strukturelle USPs, kein Direktwettbewerber.',
    highlights: [
      'First Mover: einziger Anbieter, der KI-Agenten + Operator-Kontextwissen end-to-end kombiniert',
      'Live-Pilot bei Hutchinson Brazil (Tier-1 Automotive) — 4 Maschinen in täglichem Betrieb',
      'Hardware-Moat: proprietäre Kiosk- und Kamera-Hardware on-prem, DSGVO-konform',
      'Gründerteam: 25+ Jahre Industrieautomation, mehrere erfolgreiche Exits',
      'Fokussierte Angel-Runde: € 1,1 Mio. für 8+ Installationen & 12 Monate Runway',
    ],
  });

  // Project details
  prepare(`INSERT INTO project_details (project_id, full_description, revenue_actual, ebitda_actual, revenue_trend, employees, founding_year, growth_strategy, key_risks, asking_price_band) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    p1, 'Führender Hersteller von kundenspezifischen Sondermaschinen für die Automobilindustrie. Über 40 Jahre Erfahrung in der Entwicklung komplexer Automatisierungslösungen.',
    15.2, 2.4, 'stabil +4% p.a.', 87, 1983,
    'Ausbau des Servicegeschäfts, Expansion Osteuropa/Asien, IoT-Vernetzung der Maschinen',
    'Abhängigkeit von 3 Großkunden (45%), Fachkräftemangel', '5–7x EBITDA'
  );

  prepare(`INSERT INTO project_details (project_id, full_description, revenue_actual, ebitda_actual, revenue_trend, employees, founding_year, growth_strategy, key_risks, asking_price_band) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    p2, 'Moderne ERP-Plattform für mittelständische Unternehmen mit 50–500 Mitarbeitern. Wächst organisch mit 25% p.a. und sucht Kapital für Expansion.',
    7.2, 1.6, 'stark wachsend +25% p.a.', 42, 2015,
    'Expansion DACH+, Ausbau Partnervertriebsnetz, KI-Features',
    'Intensiver Wettbewerb, Abhängigkeit vom Gründerteam', '6–9x ARR'
  );

  // ── Startup Details (ika ika) ────────────────────────────────────────────
  prepare(`INSERT INTO project_details (project_id, full_description, revenue_actual, ebitda_actual, revenue_trend, employees, founding_year, growth_strategy, key_risks, asking_price_band, team_description, problem_solution, use_of_funds, traction_highlights, milestones) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    ikaId,
    'ika ika GmbH produziert Bio-Kraftsuppen und Kraftbrühen (6 Sorten, 2 Linien) und vertreibt sie über vier Kanäle: D2C-E-Commerce als validiertes Kerngeschäft, Functional-Food-Supplements (NEM), B2B-Geschenk-Sets und Bio-Handel. 100 % BIO-zertifiziert, 0g Zucker, Clean Label, 3 Jahre Haltbarkeit ohne Kühlkette.',
    null, null, 'Aufbauphase', 3, 2022,
    'Paid Marketing (Google/Meta), Team-Aufbau (COO), Working Capital, Einführung NEM-Produktlinie',
    'Saisonalität (Winter-Schwerpunkt), Working Capital bei Wachstum, Abhängigkeit von Gründern',
    '€ 3,5 Mio. Post-Money (Seed)',
    'Martin Schumacher (Founder/CEO) & Katharina Schumacher (Co-Founder) — Branchenkenntnis Food & E-Commerce, organisches Community-Building.',
    'Zeitarmut trifft Gesundheitsbewusstsein: Verbraucher wollen echte, nährstoffreiche Ernährung ohne Aufwand. ika ika liefert Clean-Label Bio-Kraftsuppen — fertig in Sekunden, 3 Jahre haltbar, kein Zucker.',
    '45 % Paid Marketing & Growth · 25 % Working Capital · 20 % Team (COO) · 10 % NEM-Produktlinie',
    JSON.stringify(['958 Lifetime-Kunden — 100 % organisch', '€ 61 Ø Bestellwert brutto', 'Listung REWE Start-up Lounge & Foodist', 'Markenbotschafter Jonas Deichmann', 'Pipeline B2B-Partner & Hebammen-Kanal']),
    'Break-even bis 2029, Umsatzziel € 1,64 Mio.'
  );

  // ── Startup Details (Scopo) ──────────────────────────────────────────────
  prepare(`INSERT INTO project_details (project_id, full_description, revenue_actual, ebitda_actual, revenue_trend, employees, founding_year, growth_strategy, key_risks, asking_price_band, team_description, problem_solution, use_of_funds, traction_highlights, milestones) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    scopoId,
    'Scopo ist das erste Agentic Factory OS, das KI-Agenten mit dem Kontextwissen der Maschinenbediener zu einer 360°-Lösung verbindet. Software + proprietäre Hardware (Kiosk, Kamera) über fünf Produktsegmente: Konnektivität, AI-Communication, UNS/SCADA, AI-Agents, Cloud/Enterprise. On-prem, hybrid oder Cloud — DSGVO-konform.',
    null, null, 'Aufbauphase / Pre-Revenue', 6, 2023,
    '8+ Installationen, 4 technische FTEs, Pilot → recurring Revenue, IP-Anmeldung, Seed/Series-A vorbereiten',
    'Technische Personalkapazität als aktueller Engpass, langer B2B-Sales-Zyklus',
    '€ 5,5 Mio. Post-Money (Angel Round)',
    'Björn Lindner (CEO/CTO): 25+ Jahre Machine Vision & Industrial Automation, Gründer Inlevel, GoalControl/DFL, APK AG/LyondellBasell (exits). Alessandra Lanza (COO/Legal): Corporate Law, B3 São Paulo, Director Scopo Brasil. Dr. Julia Fischer (AI Dev Lead): Ph.D. Computer Science, 25+ Jahre KI.',
    'Maschinendaten ohne menschlichen Kontext erklären nur die Hälfte. Demographischer Wandel: erfahrene Bediener gehen, ihr Wissen geht mit. Scopo verbindet Maschinendaten in Echtzeit mit Bediener-Beobachtungen — KI-Agenten bewahren und übertragen Produktionswissen über Schichten hinweg.',
    '45 % Team & technische FTEs · 30 % Pilot-Rollout (8+ Installationen) · 15 % Produkt & Hardware · 10 % Go-to-Market',
    JSON.stringify(['Live-Pilot Hutchinson Brazil (Tier-1 Automotive) — 4 Maschinen in täglichem Betrieb', 'Pilot-Erweiterung + Extrusion Line verbally pre-agreed (schriftlich Juni 2026)', 'Pipeline: Hutchinson Europe (Polen & Spanien), Kosmetik/Food-Integrator, Spritzguss NRW', '51 Marktplayer analysiert — kein Direktwettbewerber mit End-to-End-Lösung']),
    '12-Monats-Milestones: 8+ Installationen in Betrieb, 4 FTEs eingestellt, Pilots → recurring Revenue, IP-Anmeldung, Seed/Series-A positioniert'
  );

  // NDA requests
  const now = new Date();
  const ago = (days) => new Date(now - days * 864e5).toISOString().slice(0, 19).replace('T', ' ');

  prepare(`INSERT INTO nda_requests (user_id, project_id, status, requested_at, sent_at, signed_at, approved_at, approved_by) VALUES (?, ?, 'approved', ?, ?, ?, ?, ?)`).run(
    buyer1Id, p1, ago(7), ago(6), ago(5), ago(4), adminId
  );
  prepare(`INSERT INTO nda_requests (user_id, project_id, status, requested_at, sent_at, signed_at) VALUES (?, ?, 'signed', ?, ?, ?)`).run(
    buyer1Id, p2, ago(3), ago(2), ago(1)
  );
  prepare(`INSERT INTO nda_requests (user_id, project_id, status, requested_at) VALUES (?, ?, 'requested', ?)`).run(buyer2Id, p2, ago(1));
  prepare(`INSERT INTO nda_requests (user_id, project_id, status, requested_at) VALUES (?, ?, 'requested', ?)`).run(buyer2Id, p3, ago(0));

  // Documents
  const insDoc = (pid, fn, ft, fs, al, desc) =>
    prepare(`INSERT INTO documents (project_id, filename, file_type, file_size, access_level, description, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`).run(pid, fn, ft, fs, al, desc, adminId);

  insDoc(p1, 'Teaser_Atlas.pdf', 'application/pdf', 512000, 'public', 'Anonymisierter Teaser');
  insDoc(p1, 'Informationsmemorandum_Atlas.pdf', 'application/pdf', 4096000, 'nda', 'Informationsmemorandum (vertraulich)');
  insDoc(p1, 'Jahresabschluss_2023_Atlas.pdf', 'application/pdf', 2048000, 'nda', 'Jahresabschluss 2023');
  insDoc(p1, 'BWA_Q3_2024_Atlas.pdf', 'application/pdf', 1024000, 'approved', 'BWA Q3 2024');
  insDoc(p2, 'Teaser_Merkur.pdf', 'application/pdf', 480000, 'public', 'Anonymisierter Teaser');
  insDoc(p2, 'IM_Merkur_vertraulich.pdf', 'application/pdf', 3800000, 'nda', 'Informationsmemorandum');

  // ── Scopo GmbH — Dokumente ───────────────────────────────────
  // Teaser: öffentlich für registrierte + freigegebene Nutzer (kein NDA)
  // CIM:    NDA-geschützt
  insDoc(scopoId, 'Scopo_Teaser_EN_v3.pptx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    1024000, 'public',
    'Investment Teaser Scopo GmbH (englisch) — zugänglich nach Registrierung und Admin-Freigabe');
  insDoc(scopoId, 'Scopo_CIM_EN.pptx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    5242880, 'nda',
    'Confidential Information Memorandum (CIM) — nur nach NDA-Unterzeichnung');

  // ── ika ika GmbH — Dokumente ─────────────────────────────────
  insDoc(ikaId, 'ika_ika_Investment_Teaser_2026.pdf',
    'application/pdf',
    2097152, 'public',
    'Investment Teaser ika ika GmbH 2026 — zugänglich nach Registrierung und Admin-Freigabe');
  insDoc(ikaId, 'ika_ika_Pitchdeck_2026.pptx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    8388608, 'nda',
    'Pitchdeck & Detailunterlagen — nur nach NDA-Unterzeichnung');

  saveDb();

  console.log('\n✅ CapitalMatch Database seeded successfully!');
  console.log('\nZugänge:');
  console.log('  Admin:   neusser@phalanx.de         / Admin1234!');
  console.log('  Berater: berater@phalanx.de          / Berater1234!');
  console.log('  Käufer:  max.mueller@example.de      / Buyer1234!');
  console.log('  Käufer:  petra.schreiber@example.de  / Buyer1234!');
  console.log('\nProjekte: Scopo GmbH + ika ika GmbH (+ 6 M&A-Muster-Mandate)');
  console.log('Dokumente: Teaser (public) + CIM/Pitchdeck (nda) für Scopo & ika ika');
}

seed().catch(err => { console.error('❌', err.message); process.exit(1); });
