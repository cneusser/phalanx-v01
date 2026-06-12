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

  const adminId = ins('admin@phalanx.de', 'Admin1234!', 'super_admin', 'Thomas', 'Weber', 'Phalanx GmbH', 'Geschäftsführer', null, '+49 89 123456').lastInsertRowid;
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

  // Projects
  const insP = (c, i, r, rb, eb, dt, sd, hl) =>
    prepare(`INSERT INTO projects (codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, datetime('now'))`).run(c, i, r, rb, eb, dt, sd, JSON.stringify(hl), adminId).lastInsertRowid;

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

  insDoc(p1, 'Teaser_Atlas.pdf', 'pdf', 512000, 'public', 'Anonymisierter Teaser');
  insDoc(p1, 'Informationsmemorandum_Atlas.pdf', 'pdf', 4096000, 'nda', 'Informationsmemorandum (vertraulich)');
  insDoc(p1, 'Jahresabschluss_2023_Atlas.pdf', 'pdf', 2048000, 'nda', 'Jahresabschluss 2023');
  insDoc(p1, 'BWA_Q3_2024_Atlas.pdf', 'pdf', 1024000, 'approved', 'BWA Q3 2024');
  insDoc(p2, 'Teaser_Merkur.pdf', 'pdf', 480000, 'public', 'Anonymisierter Teaser');
  insDoc(p2, 'IM_Merkur_vertraulich.pdf', 'pdf', 3800000, 'nda', 'Informationsmemorandum');

  saveDb();

  console.log('\n✅ Database seeded successfully!');
  console.log('\nDemo-Zugänge:');
  console.log('  Admin:   admin@phalanx.de    / Admin1234!');
  console.log('  Berater: berater@phalanx.de  / Berater1234!');
  console.log('  Käufer:  max.mueller@example.de / Buyer1234!');
  console.log('  Käufer:  petra.schreiber@example.de / Buyer1234!');
}

seed().catch(err => { console.error('❌', err.message); process.exit(1); });
