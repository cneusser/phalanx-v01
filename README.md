# Phalanx M&A Plattform – V0.1 

Ein sicherer Online-Marktplatz für Unternehmenstransaktionen.

## Schnellstart

```bash
# Im Terminal (Node.js >= 18 erforderlich):
cd phalanx-v01
./start.sh
```

Die App öffnet sich unter:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

## Demo-Zugänge

| Rolle | E-Mail | Passwort |
|-------|--------|----------|
| Admin | admin@phalanx.de | Admin1234! |
| Berater | berater@phalanx.de | Berater1234! |
| Käufer | max.mueller@example.de | Buyer1234! |
| Käufer | petra.schreiber@example.de | Buyer1234! |

## Features V0.1

- Öffentliche Projektliste (6 anonymisierte Mandate)
- Registrierung & Login (JWT-basiert)
- Käufer-Dashboard mit NDA-Status
- NDA-Anfrage-Workflow
- Admin-Dashboard: KPIs, Projekte, NDA-Verwaltung, Käufer
- Projekt anlegen (Admin-Wizard)
- NDA-Freigabe durch Admin (1 Klick)
- Audit-Log aller Aktionen
- Buyer-Profil mit Suchkriterien

## Tech Stack

- **Backend:** Node.js + Express + sql.js (SQLite) + JWT
- **Frontend:** React + Vite + React Router
- **Stil:** Phalanx Brand (Navy #1B3A5C, Gold #C8A97E)

## Projektstruktur

```
phalanx-v01/
├── server/               # Express Backend
│   ├── index.js          # Server Entry Point
│   ├── db/               # Datenbank (sql.js + SQLite)
│   │   ├── database.js   # DB-Initialisierung & Schema
│   │   └── seed.js       # Demo-Daten
│   ├── routes/           # API-Routen
│   │   ├── auth.js       # Login / Register
│   │   ├── projects.js   # Projekte (public + protected)
│   │   ├── ndas.js       # NDA-Workflow
│   │   ├── profile.js    # Käuferprofil
│   │   └── admin.js      # Admin-Funktionen
│   └── middleware/
│       └── auth.js       # JWT-Authentifizierung
├── client/               # React Frontend
│   ├── src/
│   │   ├── App.jsx       # Routing
│   │   ├── context/      # AuthContext
│   │   ├── api/          # API-Client
│   │   ├── components/   # Navbar
│   │   └── pages/        # Alle Seiten
│   └── vite.config.js
├── start.sh              # Entwicklung starten
└── start-production.sh   # Production Build starten
```

## Roadmap

- **V0.2:** 2FA (TOTP), Dokumenten-Upload, E-Mail-Versand
- **V0.3:** E-Signatur-Integration (eIDAS), Deal Alerts
- **V1.0:** Matching-Engine, Datenraum, vollständiger Audit-Trail
