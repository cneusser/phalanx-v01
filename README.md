# CapitalMatch (Phalanx GmbH) · M&A- & Fundraising-Plattform

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

Branchen-Multiples liegen als **pflegbare** Werte in `valuation_multiples`, je
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

## Ausführliche Bewertung (Sprint 7)

Geführte, mehrstufige Bewertung für **registrierte** Nutzer unter `/bewertung`
(Login-Pflicht). Ein Stepper erfasst Finanzdaten inkl. Bereinigungen (kalk.
GF-Gehalt, Einmaleffekte, Gesellschafter-Miete), eine **Qualitäts-Scorecard**
(7 Faktoren, je −2…+2), optionalen **Substanzwert** und Kapitaldienst-Annahmen.

Die Engine (`server/valuation/detailedEngine.js`, rein/testbar) kombiniert das
EBIT-Multiplikatorverfahren (Branchen-/Größenklassen-Multiple aus Sprint 6 ±
Scorecard, Größenabschlag < 1 Mio. € EBIT), das vereinfachte Ertragswertverfahren
(§199 BewG), einen **Ertragswert mit risikogerechtem Kapitalisierungszins**
(Basiszins + Marktrisiko + Scorecard-Risikozuschlag) und einen
**Kapitaldienstfähigkeits-Check** aus Käufersicht (finanzierbarer Preis / DSCR-
Ampel). Ergebnis: Werte-Korridor + Methodenvergleich + Sensitivität (±1 Punkt).

Ausgabe ist ein **mehrseitiger PDF-Report** in Phalanx-CI. Entwürfe sind
speicherbar (`status = draft`), Berechnung setzt `submitted`. Admin/Berater prüfen
im Admin-Tab **„Ausf. Bewertungen"** (Kommentar, optionale **Mandatszuordnung**
`project_id`, `status = reviewed` → schreibgeschützt).

Endpoints unter `/api/detailed-valuations` (alle mit Login). Vorerst **gratis**;
Bezahlschranke vorbereitet über `VALUATION_PAID` (Default aus). Daten in
`detailed_valuations` (tenant_id + RLS).

---

## Container-Safe (Sprint 8)

Sichere Ablage ganzer Ordner, Bilder und **beliebiger Dateitypen** je Mandat unter
`/mandat/:id/safe`: getrennt von Teaser/IM/Datenraum. Zugriff **ausschließlich für
Admin und Projekt-Pfleger** (`can_manage`); **kein Investor-Zugriff** (härter als
der Datenraum). Jeder Zugriff landet im `activity_log`/Audit.

Funktionen: Ordnerbaum, Multi-Upload inkl. ganzer Ordner (`webkitdirectory` +
Drag & Drop), Bildergalerie, **SHA-256-Checksumme** je Datei, **Versionierung** bei
Namenskollision, **Papierkorb** (Soft-Delete, 30 Tage) mit Wiederherstellen,
Speicherverbrauch je Mandat. Über **„In Datenraum übernehmen"** wird eine Safe-Datei
als `documents`-Eintrag kopiert (Zugriffsebene wählbar), ab dann greifen die
bestehenden Gates/Wasserzeichen. Daten in `safe_items` (Ordnerbaum via `parent_id`,
tenant_id + RLS).

**Speicher-Provider (umschaltbar ohne Codeänderung):** `server/providers/storage/`
mit `LocalVolumeProvider` (Default, Railway-Volume/Disk) und `S3Provider`
(S3-kompatibel: Cloudflare R2, AWS S3, Hetzner). Auswahl über `STORAGE_PROVIDER`.

**Cloudflare R2 aktivieren (empfohlen, egress-frei):**

1. In Cloudflare einen **R2-Bucket** anlegen (z. B. `capitalmatch-safe`).
2. Einen **R2-API-Token** erzeugen → Access Key ID + Secret.
3. In Railway folgende ENV setzen:
   - `STORAGE_PROVIDER=s3`
   - `S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com`
   - `S3_BUCKET=capitalmatch-safe`
   - `S3_KEY=<Access Key ID>`
   - `S3_SECRET=<Secret Access Key>`
   - `S3_REGION=auto` (R2)

Ohne diese Variablen läuft alles wie bisher auf dem Volume. Das Paket
`@aws-sdk/client-s3` wird nur bei `STORAGE_PROVIDER=s3` geladen (Lazy Require).

---

## Exposé-Builder (Sprint 9)

Strukturiertes Verkaufs-Exposé je Mandat (Struktur nach DUB, Inhalt nach KERN/HWK).
**Editor** unter `/mandat/:id/expose` (Admin/Pfleger): DUB-**Keyfacts-Raster**,
ein-/ausblendbare **Sektionen** (Unternehmen, Markt, Organisation, Finanzen, SWOT,
Käuferanforderungen, Prozess …), **Titelbild + Galerie** aus dem Container-Safe,
**Autosave**. Der geprüfte Bewertungs-Korridor aus Sprint 7 wird automatisch als
„Indikative Kaufpreisvorstellung" übernommen.

**Web-Exposé** unter `/projekte/:id/expose` liegt hinter dem **IM-Gate**
(`stageAllows(stage, 'im')` → erst NDA, dann Exposé); Pfleger sehen jederzeit eine
Vorschau. **PDF-Export** in Phalanx-CI mit **Empfänger-Wasserzeichen** (Name/E-Mail
diagonal + im Footer). Vor der Publikation ist eine **Anonymisierungs-Checkliste**
zu bestätigen (`anonymized_ack`). Bilder werden nur ausgeliefert, wenn sie im
veröffentlichten Exposé referenziert sind und der Abrufende das Gate passiert hat.

Endpoints unter `/api/exposes`. Daten in `exposes` (project_id UNIQUE, tenant_id +
RLS). Einstiege: Admin → Projekte → „📄 Exposé"; für Käufer nach NDA auf der
Mandatsseite („Vollständiges Exposé ansehen").

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

### Multi-Tenancy (Sprint 5 · AKTIV)

**Row-Level-Security ist scharf geschaltet** (ENABLE + FORCE auf allen
Tenant-Tabellen): Jede Query ist auf `current_setting('app.tenant_id')`
gefiltert, auch für den DB-Owner. Fail closed: ohne Session-Variable sind
null Zeilen sichtbar. Jede Verbindung startet im Default-Tenant 1 (phalanx,
`knexfile.js → pool.afterCreate`); Cross-Tenant-Operationen laufen
ausschließlich über `db.withTenant(tenantId, fn)` (SET LOCAL in Transaktion).

**Rollen:** `super_admin` (Plattform), `tenant_owner` (verwaltet eigenen
Mandanten, sieht per RLS NUR eigene Daten), `advisor`, `auditor` (nur
Lesezugriff auf Aktivitäts-/Audit-Protokolle), `seller`, `buyer`.

**Neuen Mandanten anlegen** (nur super_admin):
`POST /api/admin/tenants` mit `{ slug, name, subdomain, owner_email,
owner_password }`: legt Tenant + tenant_owner an. Erreichbar über die
Subdomain (`kunde1.capitalmatch.de`); DNS/Custom-Domain in Railway auf die
App zeigen lassen. Login/Registrierung/Token-Prüfung laufen automatisch im
Tenant-Kontext der Subdomain.

**Branding je Tenant:** `PUT /api/admin/tenants/:id` mit `display_name`,
`primary_color`, `accent_color`, `logo_url`, `subdomain`. Der Client lädt
`GET /api/tenant/branding` und wendet Farben/Name in der Navigation an.

### Billing (Sprint 5 · Feature-Flag)

Abrechnung über austauschbares **PaymentProvider-Interface**
(`server/providers/payment/`, Standard: Stub). Aktiv nur wenn BEIDES gesetzt:
ENV `BILLING_ENABLED=1` **und** `tenants.billing_enabled = 1`.

Komponenten: Tenant-Abo (`createSubscription`), **Setup-Gebühr je aktiviertem
Deal-Prozess** (automatisch beim Übergang `→ teaser_live`, doppelbuchungssicher),
optionale Datenraum-Staffel. Alle Vorgänge landen in `billing_events`
(`GET /api/admin/billing/events`). Preise via ENV:
`BILLING_SUBSCRIPTION_CENTS`, `BILLING_DEAL_SETUP_CENTS`, `BILLING_DATAROOM_CENTS`.
Echten Anbieter (z. B. Stripe) anbinden: Provider-Klasse implementieren,
registrieren, `PAYMENT_PROVIDER=stripe` setzen, dokumentiert in
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

## LinkedIn-Kandidaten importieren

Kandidaten aus dem LinkedIn-Netzwerk werden je Mandat als Excel-Liste importiert
(Spalten u. a. Vorname, Nachname, E-Mail, Firma, Position, LinkedIn, Standort,
Käufertyp, Mandat, Passung, Quelle, Notiz, Prio). Es werden keine E-Mails und keine
Einladungstokens erzeugt; die Ansprache läuft manuell über LinkedIn mit dem
allgemeinen Registrierungslink.

Ablauf:
1. Dubletten werden in der Reihenfolge E-Mail, LinkedIn-URL, eindeutiger
   Namensschlüssel erkannt; bei Treffer wird der Kontakt angereichert statt neu
   angelegt. Je Mandat entsteht ein Funnel-Eintrag auf Stufe 2 (Ansprache) mit
   Quelle `linkedin_import`. Kontakte mit Plattformkonto werden als „Konto
   vorhanden" markiert und bekommen keinen Funnel-Eintrag.
2. Registriert sich die Person später über den allgemeinen Link, wird der
   vorbereitete CRM-Kontakt automatisch verknüpft (E-Mail, dann LinkedIn-Feld,
   dann eindeutiger Name); Käufertyp und vorbereitetes Suchprofil werden übernommen.

Import über die CLI (empfohlen für die Erstbefüllung):

```
cd server
npm i exceljs
DATABASE_URL=... node scripts/linkedin-kandidaten-import.js \
  --dir ~/Downloads/linkedin-import/outreach
# Trockenlauf ohne Schreiben:  ... --dry
```

Das Skript schreibt je Mandat eine Ergebnis-CSV nach `<dir>/ergebnisse/` und
aktualisiert, falls vorhanden, die Outreach-Excel (`Registriert`, `NDA`), ohne die
Formatierung zu verändern. Alternativ steht der Import über die Admin-Oberfläche
(Excel-Upload mit Vorschau) bereit.

## Phalanx-OS-Anbindung

Die Plattform ist an den Datenpool und die Anmeldung von Phalanx OS angebunden.
Alle Zugangsdaten liegen ausschließlich als Railway-Umgebungsvariablen vor, nie im
Code oder Repository.

Umgebungsvariablen:

```
PHALANX_OS_BASE_URL        Basis-URL von Phalanx OS (z. B. https://phalanx-os-production.up.railway.app)
PHALANX_OS_CLIENT_ID       OIDC-/Pool-Client-ID (aus Phalanx OS, Verwaltung → SSO-Clients)
PHALANX_OS_CLIENT_SECRET   Client-Secret (nur ENV, nie loggen, nie ins Repo)
PHALANX_OS_REDIRECT_URI    optional; Standard: <FRONTEND_URL>/api/auth/phalanx/callback
PHALANX_SYNC_TAGS          optional; Standard: LI:Investor/Kapital,LI:Unternehmer/GF,LI:StB/WP/RA/Insolvenz
PHALANX_SYNC_INTERVALL_MIN optional; Standard 30, 0 schaltet den Scheduler aus
```

**SSO „Mit Phalanx OS anmelden"** (nur Admin/Staff): OpenID Connect mit
Authorization Code Flow und PKCE (S256). Die Verknüpfung erfolgt über die stabile
OIDC-Kennung (`sub`); bei der ersten Anmeldung wird ein bestehendes Admin-/Staff-
Konto mit übereinstimmender, verifizierter E-Mail verknüpft. Es werden keine neuen
Konten angelegt. Käufer- und Verkäufer-Logins bleiben unverändert. Der Knopf
erscheint auf der Anmeldung nur, wenn die drei Pflicht-ENV gesetzt sind. Die exakt
zu registrierende Redirect-URI ist `PHALANX_OS_REDIRECT_URI` (Standard oben).

**Datenpool-Sync (lesen)**: `server/sync/phalanxpool.js` holt per
`client_credentials`-Token die konfigurierten Segmente (Polling über
`updated_since`) und gleicht sie gegen `crm_contacts` ab, in genau der Dubletten-
Reihenfolge des LinkedIn-Imports: (1) E-Mail, (2) normalisierte LinkedIn-URL,
(3) eindeutiger Namensschlüssel; zusätzlich vorab die eigene `pool_contact_id` für
Idempotenz. Treffer werden angereichert (LinkedIn, Firma, Position, Tags,
`pool_contact_id`), fehlende neu angelegt (`relationship = 'LinkedIn-Kontakt'`,
`source = 'phalanx-pool'`, `buyer_type` heuristisch aus dem Segment). Mehrdeutige
Namen kommen auf die Warteliste „Zuordnung prüfen". Der Sync legt bewusst **keine**
Funnel-Einträge an Mandaten an und löscht nichts. Scheduler alle
`PHALANX_SYNC_INTERVALL_MIN` Minuten, zusätzlich Knopf „Jetzt synchronisieren".

**Rückmeldung (schreiben)**: erhält ein CRM-Kontakt ein Plattformkonto (Einladung,
Selbstregistrierung oder Zuordnung), wird er per idempotentem Upsert
(`source_id = crm-<id>`) an den Pool gemeldet. Fehlversuche landen in einer
Warteschlange mit Wiederholung und blockieren den Nutzerfluss nie.

**UWG § 7**: Adressen aus `emails_ohne_werbeeinwilligung` werden in der Spalte
`pool_email` abgelegt, nie in `email`. Da alle Massenversände `email IS NOT NULL`
verlangen, sind diese Kontakte automatisch von Newsletter und Kampagnen
ausgenommen; Einzelkorrespondenz bleibt möglich, `consent_status` bleibt `unknown`.

Verwaltung: Admin → **Phalanx OS** zeigt Verbindungsstatus (Ping mit Token),
letzten Sync mit Zahlen, die konfigurierten Segmente und die Warteliste. Kontakte
aus dem Pool tragen in der Kontaktliste das Kennzeichen „Phalanx-Netzwerk".
