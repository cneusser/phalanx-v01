require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { initialize, prepare, saveDb } = require('./database');

async function seed() {
  await initialize();
  console.log('🌱 Seeding CapitalMatch database…');

  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // Clear ALL data
  ['audit_logs', 'documents', 'nda_requests', 'project_details', 'projects', 'buyer_profiles', 'users'].forEach(t => {
    prepare(`DELETE FROM ${t}`).run();
  });

  // ── Admin ────────────────────────────────────────────────────────────────
  // is_approved = 1 and is_active = 1 for admin
  const adminId = prepare(
    `INSERT INTO users (email, password_hash, role, first_name, last_name, company, position, buyer_type, phone, is_approved, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'))`
  ).run(
    'neusser@phalanx.de',
    hash('Phalanx@2026!'),
    'super_admin',
    'Christian', 'Neusser',
    'Phalanx GmbH', 'Geschäftsführer',
    null, '+49 9131 9206075'
  ).lastInsertRowid;

  // ── Startup-Fundraising Mandate (only Scopo + ika ika) ──────────────────
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

  // ── ika ika GmbH ─────────────────────────────────────────────────────────
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

  // ── Scopo GmbH ───────────────────────────────────────────────────────────
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

  // ── Project details ───────────────────────────────────────────────────────
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

  // ── Documents ─────────────────────────────────────────────────────────────
  const insDoc = (pid, fn, ft, fs, al, desc) =>
    prepare(`INSERT INTO documents (project_id, filename, file_type, file_size, access_level, description, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`).run(pid, fn, ft, fs, al, desc, adminId);

  // Scopo GmbH — Teaser (public) + CIM (nda)
  insDoc(scopoId, 'Scopo_Teaser_EN_v3.pptx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    1024000, 'public',
    'Investment Teaser Scopo GmbH (englisch) — zugänglich nach Registrierung und Admin-Freigabe');
  insDoc(scopoId, 'Scopo_CIM_EN.pptx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    5242880, 'nda',
    'Confidential Information Memorandum (CIM) — nur nach NDA-Unterzeichnung');

  // ika ika GmbH — Teaser (public) + Pitchdeck (nda)
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
  console.log('\n📋 Zugangsdaten:');
  console.log('   Admin:  neusser@phalanx.de  /  Phalanx@2026!');
  console.log('\n📁 Aktive Mandate:');
  console.log('   • Scopo GmbH     — Angel-Runde € 1,1 Mio.');
  console.log('   • ika ika GmbH   — Seed-Finanzierung € 1,1 Mio.');
  console.log('\n💡 Neue User müssen vom Admin freigegeben werden (is_approved = 1)');
}

seed().catch(err => { console.error('❌', err.message); process.exit(1); });
