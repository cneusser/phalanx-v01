# CapitalMatch (Phalanx GmbH) — M&A- & Fundraising-Plattform

Ein sicherer Online-Marktplatz für Unternehmenstransaktionen und Startup-Finanzierungen.

## Tech Stack

- **Backend:** Node.js + Express + **PostgreSQL (Knex)** + JWT
- **Frontend:** React + Vite + React Router
- **Deploy:** Railway (Auto-Deploy bei Push auf `main`)

---

## Datenbank (seit Sprint 1: PostgreSQL)

Die App benötigt eine PostgreSQL-Datenbank. Die Verbindung kommt **ausschließlich**
aus der Umgebungsvariable `DATABASE_URL`. Ohne sie startet der Server nicht
(mit klarer Fehlermeldung).

Migrationen liegen in `server/db/migrations/` und werden **bei jedem
Serverstart automatisch** ausgeführt (`knex migrate:latest`). Danach läuft ein
idempotenter Startup-Seed: Admin-Upsert + Beispiel-Mandate (nur wenn die
Projekte-Tabelle leer ist). Mandats-Stammdaten sind in `server/db/seedData.js`
konfigurierbar.

### Railway einrichten (einmalig)

1. Railway-Projekt öffnen → **„+ New" → „Database" → „Add PostgreSQL"**.
2. Im **App-Service** (phalanx-v01) → Tab **„Variables"** → **„+ New Variable"**:
   - Name: `DATABASE_URL`
   - Wert: **Reference** auswählen → `Postgres` → `DATABASE_URL`
   (Railway trägt dann automatisch die interne Verbindungs-URL ein.)
3. Deploy auslösen (Push oder „Redeploy"). Beim ersten Start legt die App
   Schema, Default-Tenant `phalanx`, Admin und Beispiel-Mandate selbst an.

Das bisherige Volume wird für die SQLite-Datei nicht mehr gebraucht, bleibt
aber für **hochgeladene Dokumente** (`uploads/`) und **signierte NDA-PDFs**
(`server/data/ndas/`) weiterhin nötig.

### Lokale Entwicklung

PostgreSQL lokal starten (eine Möglichkeit von vielen):

```bash
# macOS (Homebrew)
brew install postgresql@16 && brew services start postgresql@16
createdb capitalmatch

# oder mit Docker
docker run -d --name capitalmatch-pg -p 5432:5432 \
  -e POSTGRES_USER=capitalmatch -e POSTGRES_PASSWORD=capitalmatch \
  -e POSTGRES_DB=capitalmatch postgres:16
```

Dann in `server/.env`:

```
DATABASE_URL=postgres://capitalmatch:capitalmatch@localhost:5432/capitalmatch
```

Nützliche Befehle (im Ordner `server/`):

```bash
npm run migrate    # Migrationen manuell ausführen
npm run seed       # DESTRUKTIV: alles löschen + Auslieferungszustand seeden
npm run dev        # Entwicklung (führt Migrationen + Seed beim Start aus)
```

### Multi-Tenancy (Vorbereitung)

Jede Tabelle trägt bereits eine Spalte `tenant_id` (Default: Tenant 1 =
`phalanx`). Die Mandantentrennung (Row-Level-Security, Rollen, Branding)
wird in Sprint 5 scharf geschaltet.

### Admin-Zugang

Der Admin-User wird bei jedem Start idempotent sichergestellt.
E-Mail/Passwort sind per ENV überschreibbar: `ADMIN_EMAIL`, `ADMIN_PASSWORD`
(Defaults in `server/db/seedData.js`).

---

## Schnellstart (Entwicklung)

```bash
# Voraussetzungen: Node.js >= 18, laufendes PostgreSQL (siehe oben)
cd phalanx-v01
./start.sh
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

## Projektstruktur

```
phalanx-v01/
├── server/                 # Express Backend
│   ├── index.js            # Server Entry Point
│   ├── knexfile.js         # Knex-/Postgres-Konfiguration (DATABASE_URL)
│   ├── db/
│   │   ├── database.js     # DB-Layer (Knex) + Startup-Seed
│   │   ├── migrations/     # Knex-Migrationen (Schema-Versionierung)
│   │   ├── seedData.js     # Konfigurierbare Mandats-Stammdaten
│   │   └── seed.js         # CLI-Voll-Reseed (destruktiv)
│   ├── routes/             # API-Routen (auth, projects, ndas, admin, …)
│   ├── middleware/auth.js  # JWT-Authentifizierung
│   └── utils/              # NDA-PDF-Generator, E-Mail, asyncHandler
├── client/                 # React Frontend (Vite)
└── Dockerfile              # Railway-Build
```

## Roadmap (Sprints)

- **Sprint 0 ✓** Stabilisierung (Logo, Admin-Upsert, Filter-Counts, Anonymisierung)
- **Sprint 1 ✓** PostgreSQL-Migration (Knex, Migrations, tenant_id)
- **Sprint 2** Deal-Zustandsautomat mit Gates (deals, interests, permissions, activity_log)
- **Sprint 3** NDA-Automatik + E-Signatur-Provider-Interface + gestufter Zugang
- **Sprint 4** Sicherer Datenraum (Wasserzeichen, signierte Links) + Admin-CRM
- **Sprint 5** Multi-Tenant (RLS), Branding je Tenant, Billing-Interface
