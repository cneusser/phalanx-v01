# CapitalMatch (Phalanx GmbH) — M&A- & Fundraising-Plattform

Ein sicherer Online-Marktplatz für Unternehmenstransaktionen und Startup-Finanzierungen.

## Tech Stack

- **Backend:** Node.js + Express + **PostgreSQL (Knex)** + JWT
- **Frontend:** React + Vite + React Router
- **Deploy:** Railway (Auto-Deploy bei Push auf `main`)

---

## Bewertungsrechner (Sprint 6)

Öffentlicher, anonymer Unternehmenswert-Rechner als Lead-Magnet unter
`/unternehmenswert` (ohne Login). Zwei Verfahren (Multiplikator + vereinfachtes
Ertragswertverfahren §199 BewG) liefern einen **Werte-Korridor**
(konservativ/Basis/optimistisch). Gegen E-Mail + DSGVO-Consent gibt es einen
**PDF-Report** in Phalanx-CI (Download + Mailversand); der Vorgang wird als
**Bewertungs-Lead** im Admin (`Admin → Bewertungs-Leads`) erfasst.

Branchen-Multiples liegen als **pflegbare** Werte in `valuation_multiples` — je
Branche (20 Kategorien) und **Größenklasse** (Micro < 5 Mio. €, Small 5–50 Mio. €,
Mid > 50 Mio. € Umsatz) ein EBIT-Multiple von–bis. Die Engine wählt die
Größenklasse automatisch anhand des Ø-Umsatzes. Quelle der Startwerte:
**DUB KMU-Multiples (Q2/2026)**. Pflege im Admin über den Tab **„Multiples"**
bzw. `GET/PUT /api/admin/valuation-multiples`. Alle Bewertungen bleiben
ausdrücklich **indikativ** (kein IDW-S1-Gutachten, kein Marktpreis).

Der PDF-Report ist im Phalanx-Briefbogen gehalten (Logo, Tagline, 1,5-zeilig,
Blocksatz) mit werblichem Abschluss-Block und Kontaktangaben.

Feature-Flag: `VALUATION_ENABLED` (Default an; `=0` deaktiviert die Endpoints).
Öffentlicher Rechner ist rate-limitiert.

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

### Multi-Tenancy (Sprint 5 — AKTIV)

**Row-Level-Security ist scharf geschaltet** (ENABLE + FORCE auf allen
Tenant-Tabellen): Jede Query ist auf `current_setting('app.tenant_id')`
gefiltert — auch für den DB-Owner. Fail closed: ohne Session-Variable sind
null Zeilen sichtbar. Jede Verbindung startet im Default-Tenant 1 (phalanx,
`knexfile.js → pool.afterCreate`); Cross-Tenant-Operationen laufen
ausschließlich über `db.withTenant(tenantId, fn)` (SET LOCAL in Transaktion).

**Rollen:** `super_admin` (Plattform), `tenant_owner` (verwaltet eigenen
Mandanten, sieht per RLS NUR eigene Daten), `advisor`, `auditor` (nur
Lesezugriff auf Aktivitäts-/Audit-Protokolle), `seller`, `buyer`.

**Neuen Mandanten anlegen** (nur super_admin):
`POST /api/admin/tenants` mit `{ slug, name, subdomain, owner_email,
owner_password }` — legt Tenant + tenant_owner an. Erreichbar über die
Subdomain (`kunde1.capitalmatch.de`); DNS/Custom-Domain in Railway auf die
App zeigen lassen. Login/Registrierung/Token-Prüfung laufen automatisch im
Tenant-Kontext der Subdomain.

**Branding je Tenant:** `PUT /api/admin/tenants/:id` mit `display_name`,
`primary_color`, `accent_color`, `logo_url`, `subdomain`. Der Client lädt
`GET /api/tenant/branding` und wendet Farben/Name in der Navigation an.

### Billing (Sprint 5 — Feature-Flag)

Abrechnung über austauschbares **PaymentProvider-Interface**
(`server/providers/payment/`, Standard: Stub). Aktiv nur wenn BEIDES gesetzt:
ENV `BILLING_ENABLED=1` **und** `tenants.billing_enabled = 1`.

Komponenten: Tenant-Abo (`createSubscription`), **Setup-Gebühr je aktiviertem
Deal-Prozess** (automatisch beim Übergang `→ teaser_live`, doppelbuchungssicher),
optionale Datenraum-Staffel. Alle Vorgänge landen in `billing_events`
(`GET /api/admin/billing/events`). Preise via ENV:
`BILLING_SUBSCRIPTION_CENTS`, `BILLING_DEAL_SETUP_CENTS`, `BILLING_DATAROOM_CENTS`.
Echten Anbieter (z. B. Stripe) anbinden: Provider-Klasse implementieren,
registrieren, `PAYMENT_PROVIDER=stripe` setzen — dokumentiert in
`providers/payment/index.js`.

### E-Signatur (Sprint 3)

NDAs werden aus einer **konfigurierbaren Vorlage** (Tabelle `nda_templates`,
Platzhalter wie `{{project_codename}}`, `{{buyer_name}}`, `{{court_venue}}`)
generiert und über ein **austauschbares SignatureProvider-Interface** signiert
(`server/providers/signature/`). Standard ist der **Stub-Provider** (Mock,
simuliert eIDAS FES mit sofortigem Abschluss). Jeder Signaturvorgang wird
revisionssicher in der Tabelle `ndas` abgelegt (signiertes PDF +
SHA-256-`audit_ref`).

Echten Dienst anbinden (z. B. Skribble, DocuSign): Provider-Klasse mit
`send/status/fetchSignedDoc` in `server/providers/signature/` implementieren,
registrieren und per ENV aktivieren:

```
SIGNATURE_PROVIDER=skribble   # Default: stub
SIGNATURE_LEVEL=fes           # fes (Standard) oder qes
```

Nach der NDA-Signatur wird das Informationsmemorandum **automatisch**
freigeschaltet (`interests.stage = im_granted`); der Datenraum bleibt bis zur
Admin-Freigabe gesperrt.

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
