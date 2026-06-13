require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initialize } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ contentSecurityPolicy: false }));

// In production the React build is served by this same Express server (same origin),
// so CORS is only relevant for local development.
const corsOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : true)
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({ origin: corsOrigins, credentials: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
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
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
