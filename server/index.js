require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initialize } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Railway/Reverse-Proxy: echte Client-IP aus X-Forwarded-For lesen.
// Ohne dies zählt der Rate-Limiter ALLE Besucher als eine IP (globale Sperre)
// und Audit-Logs enthalten nur die Proxy-IP.
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));

// In production the React build is served by this same Express server (same origin),
// so CORS is only relevant for local development.
const corsOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : true)
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({ origin: corsOrigins, credentials: true }));

// JSON-Fehlermeldung, damit der Client sie sauber anzeigen kann
const limiterJson = (msg) => ({
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: msg },
});
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, ...limiterJson('Zu viele Anfragen — bitte in einigen Minuten erneut versuchen.') });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, ...limiterJson('Zu viele Anmeldeversuche — bitte in 15 Minuten erneut versuchen.') });
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sprint 5: Tenant über Subdomain auflösen (Fallback: Default-Tenant)
app.use(require('./middleware/tenant').resolveTenant);

// Routes
app.use('/api/tenant', require('./routes/tenant'));
app.use('/api/valuation', require('./routes/valuation'));
app.use('/api/detailed-valuations', require('./routes/detailedValuation'));
app.use('/api/safe', require('./routes/safe'));
app.use('/api/exposes', require('./routes/exposes'));
app.use('/api/community', require('./routes/community'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/ndas', require('./routes/ndas'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/documents', require('./routes/documents'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', version: '0.1.0', timestamp: new Date().toISOString(), dirname: __dirname, clientDist: path.join(__dirname, '../client/dist') } });
});

// Serve React in production
const clientDist = path.join(__dirname, '../client/dist');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Interner Serverfehler' });
});

// Initialize DB then start server
initialize().then(() => {
  app.listen(PORT, () => {
    console.log(`\n💼  CapitalMatch Platform v0.2.0 (eine Marke der Phalanx GmbH)`);
    console.log(`📡 Backend: http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📧 Download-Notifications → ${process.env.NOTIFICATION_EMAIL || 'neusser@phalanx.de'} ${process.env.SMTP_HOST ? '(SMTP aktiv)' : '(nur Logs – SMTP nicht konfiguriert)'}\n`);
    // Sprint 10: Digest-Scheduler (daily/weekly Match-Benachrichtigungen)
    try { require('./utils/digest').startScheduler(); } catch (e) { console.warn('Digest-Scheduler nicht gestartet:', e.message); }
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
