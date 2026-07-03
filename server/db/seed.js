// ─────────────────────────────────────────────────────────────────────────────
// CLI-Voll-Reseed (DESTRUKTIV): löscht alle Fachdaten und spielt den
// Auslieferungszustand aus seedData.js neu ein.
//   node db/seed.js          (bzw. npm run seed)
// Für den normalen Betrieb NICHT nötig — der Server seedet beim Start
// idempotent (Admin-Upsert + Mandate nur, wenn die DB leer ist).
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { knex, startupSeed } = require('./database');
const { ADMIN, PROJECTS } = require('./seedData');

async function seed() {
  console.log('🌱 Seeding CapitalMatch database (PostgreSQL)…');

  await knex.migrate.latest();

  // Alle Fachdaten löschen (tenants + Migrations-Historie bleiben)
  await knex.raw(`
    TRUNCATE TABLE audit_logs, documents, nda_requests, project_details, projects, buyer_profiles, users
    RESTART IDENTITY CASCADE
  `);

  await startupSeed();

  console.log('\n✅ CapitalMatch Database seeded successfully!');
  console.log('\n📋 Zugangsdaten:');
  console.log(`   Admin:  ${ADMIN.email}  /  ${process.env.ADMIN_PASSWORD ? '(ADMIN_PASSWORD aus ENV)' : ADMIN.password}`);
  console.log('\n📁 Aktive Mandate:');
  for (const proj of PROJECTS) {
    console.log(`   • ${proj.public.codename} — ${proj.public.deal_type} ${proj.public.investment_needed || ''}`);
  }
  console.log('\n💡 Neue User müssen vom Admin freigegeben werden (is_approved = 1)');
}

seed()
  .then(() => process.exit(0))
  .catch(err => { console.error('❌', err.message); process.exit(1); });
