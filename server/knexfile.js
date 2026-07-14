// ─────────────────────────────────────────────────────────────────────────────
// Knex-Konfiguration: PostgreSQL via DATABASE_URL
//
// Produktion (Railway): DATABASE_URL wird vom Railway-Postgres-Plugin gesetzt
//   (Reference Variable, siehe README → "Datenbank / Railway").
// Lokal: DATABASE_URL in server/.env setzen, z. B.
//   DATABASE_URL=postgres://capitalmatch:capitalmatch@localhost:5432/capitalmatch
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL;

// SSL nur für externe Verbindungen (Railway-Proxy etc.), nicht für
// localhost oder das interne Railway-Netz (…railway.internal).
const needsSsl = connectionString
  && !/localhost|127\.0\.0\.1|railway\.internal/.test(connectionString);

const config = {
  client: 'pg',
  connection: {
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: 0,
    max: 10,
    // Sprint 5 (RLS): Jede DB-Verbindung startet im Kontext des
    // Default-Tenants (1 = phalanx). Row-Level-Security filtert damit ALLE
    // Queries zwingend auf diesen Tenant. Cross-Tenant-Operationen laufen
    // ausschließlich über db.withTenant() (SET LOCAL in Transaktion).
    afterCreate: (conn, done) => {
      conn.query(`SET app.tenant_id = '1'`, (err) => done(err, conn));
    },
  },
  migrations: {
    directory: require('path').join(__dirname, 'db', 'migrations'),
    tableName: 'knex_migrations',
  },
};

module.exports = config;
