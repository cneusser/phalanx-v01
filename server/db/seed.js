require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { initialize, prepare, saveDb } = require('./database');
const { ADMIN, PROJECTS } = require('./seedData');

async function seed() {
  await initialize();
  console.log('🌱 Seeding CapitalMatch database…');

  // Clear ALL data
  ['audit_logs', 'documents', 'nda_requests', 'project_details', 'projects', 'buyer_profiles', 'users'].forEach(t => {
    prepare(`DELETE FROM ${t}`).run();
  });

  // ── Admin (Stammdaten aus seedData.js, is_approved = 1, is_active = 1) ────
  const adminId = prepare(
    `INSERT INTO users (email, password_hash, role, first_name, last_name, company, position, buyer_type, phone, is_approved, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'))`
  ).run(
    ADMIN.email,
    bcrypt.hashSync(ADMIN.password, 10),
    ADMIN.role,
    ADMIN.first_name, ADMIN.last_name,
    ADMIN.company, ADMIN.position,
    null, ADMIN.phone
  ).lastInsertRowid;

  // ── Mandate (konfigurierbar in seedData.js — Kennzahlen NICHT hier ändern) ─
  for (const proj of PROJECTS) {
    const p = proj.public;
    const projectId = prepare(`
      INSERT INTO projects (codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights,
        stage, investment_needed, equity_stake, post_money_valuation, tam_band, sector_emoji, location_city, mandate_type,
        status, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, datetime('now'))
    `).run(
      p.codename, p.industry, p.region, p.revenue_band || '—', p.ebitda_band || '—',
      p.deal_type, p.short_description, JSON.stringify(p.highlights || []),
      p.stage, p.investment_needed, p.equity_stake, p.post_money_valuation,
      p.tam_band, p.sector_emoji, p.location_city, p.mandate_type || 'ma', adminId
    ).lastInsertRowid;

    const d = proj.details || {};
    prepare(`INSERT INTO project_details (project_id, full_description, revenue_actual, ebitda_actual, revenue_trend, employees, founding_year, growth_strategy, key_risks, asking_price_band, team_description, problem_solution, use_of_funds, traction_highlights, milestones) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      projectId,
      d.full_description, d.revenue_actual, d.ebitda_actual, d.revenue_trend,
      d.employees, d.founding_year, d.growth_strategy, d.key_risks,
      d.asking_price_band, d.team_description, d.problem_solution,
      d.use_of_funds, JSON.stringify(d.traction_highlights || []), d.milestones
    );

    for (const doc of proj.documents || []) {
      prepare(`INSERT INTO documents (project_id, filename, file_type, file_size, access_level, description, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`).run(
        projectId, doc.filename, doc.file_type, doc.file_size, doc.access_level, doc.description, adminId
      );
    }
  }

  saveDb();

  console.log('\n✅ CapitalMatch Database seeded successfully!');
  console.log('\n📋 Zugangsdaten:');
  console.log(`   Admin:  ${ADMIN.email}  /  ${process.env.ADMIN_PASSWORD ? '(ADMIN_PASSWORD aus ENV)' : ADMIN.password}`);
  console.log('\n📁 Aktive Mandate:');
  for (const proj of PROJECTS) {
    console.log(`   • ${proj.public.codename} — ${proj.public.deal_type} ${proj.public.investment_needed || ''}`);
  }
  console.log('\n💡 Neue User müssen vom Admin freigegeben werden (is_approved = 1)');
}

seed().catch(err => { console.error('❌', err.message); process.exit(1); });
