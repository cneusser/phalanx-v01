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
      // Phalanx OS liefert die eingebettete Terminauswahl. Ueber
      // TERMIN_ORIGIN austauschbar, ohne Code anzufassen.
      frameSrc: ["'self'", 'https://challenges.cloudflare.com',
        process.env.TERMIN_ORIGIN || 'https://phalanx-os-production.up.railway.app'],
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
// Antworten auf noch laufende Datei-Uploads zurückhalten, sonst geht die
// Fehlermeldung im Verbindungsabriss unter (siehe utils/hochladen.js).
app.use(require('./utils/hochladen').spurLegen);
app.use(require('./utils/hochladen').mitAbfluss);
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));

// ── Ein leerer Rumpf ist ein leeres Objekt (v0.475) ─────────────────────────
//
// Express 4 setzte `req.body` immer auf `{}`, auch wenn nichts ankam. Express 5
// laesst es in dem Fall undefiniert. Im Bestand stehen rund 330 Stellen, die
// `req.body` direkt auslesen oder zerlegen; jede davon wuerde bei einer
// Anfrage ohne Inhaltstyp mit einem Serverfehler enden statt mit „Feld fehlt".
//
// Diese drei Zeilen stellen das alte Verhalten wieder her. Das ist ehrlicher
// als 330 Stellen anzufassen, von denen jede einzelne ein Ort zum Vertippen
// waere, und es laesst sich spaeter Stueck fuer Stueck wieder entfernen.
app.use((req, _res, next) => { if (req.body === undefined) req.body = {}; next(); });

// ── Die Teststufe hinter einem Tor (v0.482) ─────────────────────────────────
//
// Der Einladungslink steht vor dem Tor, sonst käme er selbst nicht durch. Auf
// der Produktion tun beide Zeilen nichts: Sie fragen bei jeder Anfrage die
// Stufe neu, und ohne CM_STUFE=teststufe reichen sie durch.
const teststufe = require('./middleware/teststufenTor');
app.get('/teststufe/:schluessel', teststufe.einladung);
app.use(teststufe.tor);

// Welche Stufe ist das? Die Oberfläche fragt das vor der Anmeldung, um den
// Hinweisbalken zu zeigen. Der Schlüssel kommt in der Antwort nie vor.
app.get('/api/stufe', (req, res) => {
  res.json({ success: true, data: require('./utils/stufe').fuerDieOberflaeche() });
});

// ── Während des Starts antworten statt schweigen (v0.485) ───────────────────
//
// Anlass: Der erste Start der Teststufe hing minutenlang, und von aussen kam
// „Application failed to respond", der Fehler 502 von Railway.
//
// Der Grund lag im Aufbau: Bis v0.484 rief index.js erst `initialize()` auf
// und erst danach `app.listen()`. Auf einer leeren Datenbank bedeutet das über
// 300 Migrationen und den Startseed, bevor überhaupt jemand lauscht. Railway
// wartet nicht so lange, haelt den Dienst fuer tot und startet ihn neu, mitten
// im Lauf. Der naechste Versuch beginnt wieder von vorn.
//
// Das ist nicht nur beim Einrichten laestig. Es trifft jedes Deployment, das
// eine lange Migration mitbringt, auch auf der Produktion.
//
// Deshalb lauscht die Anwendung jetzt sofort und sagt waehrend des Starts, was
// los ist: 503 mit einer Begruendung. Der Dienstzustand antwortet dabei mit
// 200 und dem Vermerk „startet", damit die Ueberwachung den Dienst als lebendig
// erkennt und ihn in Ruhe arbeiten laesst.
let bereit = false;
let startFehler = null;
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: bereit ? 'ok' : 'starting', fehler: startFehler } });
});
app.use((req, res, next) => {
  if (bereit) return next();
  if (req.path.startsWith('/api/')) {
    return res.status(503).json({
      success: false,
      error: startFehler
        ? 'Der Start ist fehlgeschlagen. Bitte die Protokolle ansehen.'
        : 'Die Anwendung startet gerade. Migrationen laufen, bitte in einem Moment erneut versuchen.',
      status: startFehler ? 'failed' : 'starting',
    });
  }
  res.status(503).type('html').send(`<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${startFehler ? '' : '<meta http-equiv="refresh" content="10">'}
<title>${startFehler ? 'Start fehlgeschlagen' : 'Startet'}</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
         background:#0f172a; color:#e2e8f0; }
  main { max-width:30rem; padding:2.5rem; }
  h1 { font-size:1.15rem; margin:0 0 .9rem; }
  p { font-size:.92rem; line-height:1.6; color:#94a3b8; margin:0 0 .7rem; }
</style></head>
<body><main>
  <h1>${startFehler ? 'Der Start ist fehlgeschlagen' : 'CapitalMatch startet'}</h1>
  <p>${startFehler
    ? 'Die Anwendung konnte die Datenbank nicht vorbereiten. Die Protokolle des Dienstes nennen den Grund.'
    : 'Die Datenbank wird gerade vorbereitet. Beim ersten Start eines neuen Dienstes dauert das einige Minuten. Diese Seite lädt sich von selbst neu.'}</p>
</main></body></html>`);
});

// Sprint 5: Tenant über Subdomain auflösen (Fallback: Default-Tenant)
app.use(require('./middleware/tenant').resolveTenant);

// Routes
app.use('/api', require('./routes/version'));
// Schnittstelle fuer Phalanx OS: nur mit Schluessel, ohne Schluessel abgeschaltet.
app.use('/api/extern', require('./routes/extern'));
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
// Stammdatenpflege (v0.405): oeffentliche Pflegeseite ohne Anmeldung, dazu die
// internen Routen fuer Datenpflege und Aktualisierungsmailing.
const stammdaten = require('./routes/stammdaten');
app.use('/api/stammdaten', stammdaten.publicRouter);
app.use('/api/pflege', stammdaten.router);
app.use('/api/succession', require('./routes/succession'));
app.use('/api/inbound', require('./routes/inbound'));
app.use('/api/share', require('./routes/share'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/ndas', require('./routes/ndas'));
app.use('/api/nda-dokumente', require('./routes/ndaDokumente'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/documents', require('./routes/documents'));

// Der Dienstzustand steht seit v0.485 weiter oben, damit er schon waehrend des
// Starts antwortet. Hier bleibt die ausfuehrliche Auskunft fuer den Betrieb.
app.get('/api/health/details', (req, res) => {
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
  // index.html darf nie aus dem Zwischenspeicher kommen, die Dateien darunter
  // dürfen es immer.
  //
  // Anlass: Nach einem Deploy war nicht mehr zu unterscheiden, ob eine Änderung
  // nicht wirkt oder ob der Browser noch den alten Stand zeigt. Ich habe
  // deshalb dreimal eine Korrektur geprüft, die der Browser vielleicht gar
  // nicht geladen hatte.
  //
  // Die Dateien unter /assets tragen einen Namen mit Prüfsumme: ändert sich der
  // Inhalt, ändert sich der Name. Sie dürfen also für immer liegenbleiben.
  // index.html nennt diese Namen und ist damit die einzige Datei, die bei jedem
  // Aufruf frisch kommen muss.
  app.use('/assets', express.static(path.join(clientDist, 'assets'), {
    immutable: true, maxAge: '1y',
  }));
  app.use(express.static(clientDist, { index: false, etag: true, maxAge: 0 }));
  // Express 5 verlangt fuer den Platzhalter einen Namen: aus '*' wird
  // '{*rest}'. Gemeint ist dasselbe, naemlich alles, was keine Datei war.
  app.get('{*rest}', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.set('Cache-Control', 'no-store, must-revalidate');
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

// ── Erst lauschen, dann vorbereiten (v0.485) ────────────────────────────────
//
// Bis v0.484 stand hier initialize().then(() => app.listen(...)). Die
// Reihenfolge war falsch herum: Auf einer leeren Datenbank lauschte erst nach
// mehreren Minuten jemand, und bis dahin antwortete der Dienst gar nicht.
// Jetzt steht der Port sofort offen, die Middleware oben erklaert waehrend der
// Vorbereitung, was los ist, und `bereit` schaltet die Anwendung frei.
app.listen(PORT, () => {
  console.log(`📡 Backend lauscht auf Port ${PORT}, Datenbank wird vorbereitet.`);
});

initialize().then(() => {
  bereit = true;
  {
    const fassung = (() => { try { return require('./package.json').version; } catch { return '?'; } })();
    console.log(`\n💼  CapitalMatch Platform v${fassung} (eine Marke der Phalanx GmbH)`);
    console.log(`📡 Backend: http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📧 Download-Notifications → ${process.env.NOTIFICATION_EMAIL || 'neusser@phalanx.de'} ${process.env.SMTP_HOST ? '(SMTP aktiv)' : '(nur Logs – SMTP nicht konfiguriert)'}\n`);
    // Zeigen die öffentlichen Adressen dorthin, wo der Kunde sie erwartet?
    // Eine falsche FRONTEND_URL fällt sonst erst beim Login oder, schlimmer,
    // in einer längst verschickten Mail auf.
    try { require('./utils/adressenPruefen').pruefeUndMelde(); }
    catch (e) { console.warn('Adressprüfung nicht möglich:', e.message); }

    // Sprint 10: Digest-Scheduler (daily/weekly Match-Benachrichtigungen)
    // Rollen-/Rechte-Matrix in den Cache laden (Fallback: Code-Matrix)
    try { require('./middleware/permissions').reloadRoles().then(m => m && console.log(`🔐 Rollen geladen: ${Object.keys(m).join(', ')}`)); }
    catch (e) { console.warn('Rollen konnten nicht geladen werden, Code-Matrix greift:', e.message); }
    try { require('./utils/digest').startScheduler(); } catch (e) { console.warn('Digest-Scheduler nicht gestartet:', e.message); }
    try { require('./utils/campaigns').startScheduler(); } catch (e) { console.warn('Kampagnen-Scheduler nicht gestartet:', e.message); }
    try { require('./sync/phalanxpool').startScheduler(); } catch (e) { console.warn('Phalanx-OS-Sync-Scheduler nicht gestartet:', e.message); }
    try { require('./utils/ndaReminders').startScheduler(); } catch (e) { console.warn('NDA-Erinnerungen nicht gestartet:', e.message); }
    try { require('./utils/docNotify').startScheduler(); } catch (e) { console.warn('Unterlagen-Hinweise nicht gestartet:', e.message); }
    try { require('./utils/nachrichtVersand').startScheduler(); } catch (e) { console.warn('Nachrichten-Zustellung nicht gestartet:', e.message); }
  }
}).catch((err) => {
  // Der Port bleibt offen, damit die Ursache lesbar ist statt „Application
  // failed to respond". Beendet wird trotzdem, sonst sieht die Ueberwachung
  // einen gesunden Dienst, der nichts kann. Die fuenf Sekunden geben einem
  // Browser, der gerade wartet, noch die Seite mit der Begruendung.
  startFehler = err.message || String(err);
  console.error('Failed to initialize database:', err);
  setTimeout(() => process.exit(1), 5000);
});
