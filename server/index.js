require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initialize } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Sicherheits-Startcheck: In Produktion bricht der Start bei schwachem
// JWT_SECRET ab (fail-closed, Notausgang ALLOW_WEAK_JWT=1). Außerhalb der
// Produktion nur eine Warnung.
require('./utils/jwtSecret').assertStrongOrExit();

// Railway/Reverse-Proxy: echte Client-IP aus X-Forwarded-For lesen.
// Ohne dies zählt der Rate-Limiter ALLE Besucher als eine IP (globale Sperre)
// und Audit-Logs enthalten nur die Proxy-IP.
app.set('trust proxy', 1);

// Sicherheits-Header inkl. Content-Security-Policy und HSTS. Die CSP ist bewusst
// so gewählt, dass die SPA (externes Bundle, Inline-Styles über style-Attribute)
// und der Cloudflare-Roboter-Test funktionieren. Notausgang bei Problemen: CSP_DISABLED=1.
const cspEnabled = process.env.CSP_DISABLED !== '1';
app.use(helmet({
  contentSecurityPolicy: cspEnabled ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://challenges.cloudflare.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'https:'],
      frameSrc: ["'self'", 'https://challenges.cloudflare.com'],
      objectSrc: ["'self'", 'blob:'],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
    },
  } : false,
  hsts: { maxAge: 15552000, includeSubDomains: true },
  crossOriginEmbedderPolicy: false,
}));

// Same-Origin in Produktion: der Client-Build wird vom selben Server ausgeliefert,
// CORS ist dort nur für einen ausdrücklich gesetzten FRONTEND_URL nötig. Ohne
// diesen wird keine fremde Origin mehr gespiegelt (kein Wildcard).
const corsOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : false)
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({ origin: corsOrigins, credentials: true }));

// JSON-Fehlermeldung, damit der Client sie sauber anzeigen kann
const limiterJson = (msg) => ({
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: msg },
});
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, ...limiterJson('Zu viele Anfragen, bitte in einigen Minuten erneut versuchen.') });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, ...limiterJson('Zu viele Anmeldeversuche, bitte in 15 Minuten erneut versuchen.') });
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// Limit erhöht: weitergeleitete Mails (Brevo Inbound) und Kampagnen-HTML können
// größer als die Express-Standardgrenze von 100 kB sein.
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));

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
app.use('/api/gamification', require('./routes/gamification'));
app.use('/api/invitations', require('./routes/invitations'));
app.use('/api/crm', require('./routes/crm'));
app.use('/api/succession', require('./routes/succession'));
app.use('/api/inbound', require('./routes/inbound'));
app.use('/api/share', require('./routes/share'));
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
// Client ausliefern, sobald ein Build vorliegt, unabhängig von NODE_ENV.
// Vorher hing das an NODE_ENV=production; fehlte die Variable, lieferte der Server
// bei jedem Deep-Link (/projekte, /crm, F5, geteilte Links) nichts aus.
// Der SPA-Fallback darf die API nicht verschlucken: /api/* wird durchgereicht.
const clientDist = path.join(__dirname, '../client/dist');
const fs = require('fs');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log('🖥️  Client-Build wird ausgeliefert:', clientDist);
} else {
  console.warn('⚠️  Kein Client-Build gefunden (client/dist/index.html), nur die API ist erreichbar.');
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
    // Rollen-/Rechte-Matrix in den Cache laden (Fallback: Code-Matrix)
    try { require('./middleware/permissions').reloadRoles().then(m => m && console.log(`🔐 Rollen geladen: ${Object.keys(m).join(', ')}`)); }
    catch (e) { console.warn('Rollen konnten nicht geladen werden, Code-Matrix greift:', e.message); }
    try { require('./utils/digest').startScheduler(); } catch (e) { console.warn('Digest-Scheduler nicht gestartet:', e.message); }
    try { require('./utils/campaigns').startScheduler(); } catch (e) { console.warn('Kampagnen-Scheduler nicht gestartet:', e.message); }
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
