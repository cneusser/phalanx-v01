# CapitalMatch · Roadmap: Bewertung, Container-Safe, Exposé-Builder

Stand: Juli 2026 · Analysebasis: kmurechner.de, KERN-Unternehmenswertrechner,
HWK-/KERN-Exposé-Leitfaden, DUB-Exposé-Struktur (Beispiel-ID 17680), DUB KMU-Multiples.

> **Konsolidierte Fassung.** Ersetzt die früheren Dateien `ROADMAP-SPRINT-6-9.md`
> und `ROADMAP_Sprint6-9.md`, deren Sprint-Nummerierung voneinander abwich. Es geht
> kein Thema verloren: die Reihenfolge ist unten verbindlich festgelegt.

---

## Verbindliche Reihenfolge

| Sprint | Thema | Status |
|-------|-------|--------|
| 6 | Bewertungs-Quick-Check (öffentlicher Lead-Magnet) | ✅ fertig |
| 6.1 | Multiples auf Branche × Größenklasse (DUB), Report-Briefbogen, Admin-Multiples | ✅ fertig |
| 7 | Ausführliche Bewertung (Engine + Report) | ✅ fertig |
| 8 | Container-Safe (Ordner-Uploads, Object Storage) | ✅ fertig |
| 9 | Exposé-Builder (DUB-Standard, IM-Gate) | ✅ fertig |
| 10 | Käufer-UX: Deal-Liste + Suchprofile + Match-Benachrichtigungen | ✅ fertig (Tabelle, Suchprofile, Sofort- + Digest-Match, Merkliste/Tags) |
| 11 | In-App-Chat & Kontakte (Netzwerk) | ✅ Kern fertig (Kontakte, 1:1-Chat, Mail-Benachrichtigung) |
| · | E-Mail-Verifizierung + Paygate-Vorbereitung ausf. Bewertung | ✅ (Verifizierung Pflicht; Paywall greift ab 31.08.2026) |
| · | Mobile-First / responsive Darstellung (v0.238) | ✅ (Hamburger-Nav, stapelnde Layouts, scrollbare Tabellen) |
| **12** | **Ausführliche Bewertung 2.0 (datengetrieben, DCF, Benchmarking)** | ✅ Kern fertig (DCF mit WACC/Terminal Value, Sensitivitätsmatrix, Branchen-Benchmarks, Methodenvergleich, erweiterter PDF-Report) |
| 13 | 2-Faktor-Authentifizierung (TOTP) | ✅ fertig (TOTP nach RFC 6238, Backup-Codes, Pflicht per REQUIRE_2FA_STAFF) |
| 14 | **CRM / Beziehungs- & Deal-Management (Sell-Side)** | geplant (Analyse folk.app, Konzept unten) |
| 15 | **Connect & Interaktion Käufer ↔ Verkäufer (Chat-Vernetzung, Prozess-Trigger)** | ✅ Kern fertig (Interesse→Intro→Chat, Systemnachrichten NDA/DD/LOI/Closing) |
| **16** | **Admin-Dashboard 2.0 (Analytics, Funnel, Kennzahlen, interaktiv)** | ✅ Kern fertig (Funnel, Sparklines, Ranking, Badges, CSV-Export) |
| 17 | **Gamification / XP-Punktesystem (Interaktion & Deal-Abwicklung)** | ✅ Kern fertig (XP-Events, Level, Vergabe an NDA/DD/LOI/Closing, „Mein Bereich"-Badge) |
| 18 | **Engagement-Mailings: Newsletter, Folgen-Option, Änderungs-Mails, Ähnlichkeits-Matching** | ✅ Kern fertig (Newsletter, Auto-/Manuell-Folgen, Follower-Mails, Ähnlichkeits-Score, Opt-out-Center) |
| 19 | **CRM I: Unternehmen & Kontakte** (Stammdaten, Dubletten, Verknüpfungen, Import) | ✅ Kern fertig (Unternehmen, Kontakte, n:m + Historie, Konzern, Dubletten, CSV; + Mandats-Einladungen) |
| 20 | **CRM II: Transaktionen, Beteiligtenrollen & konfigurierbarer Kanban-Funnel** | ✅ Kern fertig (Funnel-Board, Rollen, Verweildauer, Stagnation; Import echter Kontakte) |
| 21 | **CRM III: Kommunikation & Aufgaben** (Mandats-Mailings, Reminder, Vorlagen, BCC-Ingest) | ✅ Kern fertig (Massenmailing, Double-Opt-in + Pflege-Link in einer Mail, Reminder Tag 7/21, Prozess-Updates, **11 Prozess-Mailvorlagen + Admin-Editor**); ✅ BCC-Ingest + Wiedervorlagen fertig) |
| 22 | **CRM IV: Dokumente, Suche/Auswertungen & Kontakt-Selbstpflege-Portal** | ▶ Selbstpflege-Portal ✅ fertig (Link, Protokoll, Freigabe, Abmeldung); Dokumente/Auswertungen offen |
| 23 | **CRM V: Rollen/Rechte granular, API/Webhooks, Multi-Tenant, DSGVO-Härtung + 2FA** | ✅ Kern fertig (5 Rollen + Rechte-Matrix, Mandats-Sichtbarkeit, 2FA, DSGVO-Auskunft + Anonymisierung); API/Webhooks offen |
| · | Mehrsprachigkeit DE/EN | ▶ Fundament fertig (Umschalter, i18n-Kontext, Navigation); Seiten werden schrittweise übersetzt |
| 24 | **CRM VI: Ausbaustufen** (Anreicherung, Käufer-Matching, E-Signatur, Datenraum, Mobile, Portal) | geplant |
| · | Sprache: menschliche Texte, kein Gedankenstrich, Textwächter im Build (v0.267) | ✅ fertig |
| · | Anrede per Sie in allen Mails; Mandat-Spalte im Mail-Ausgang (v0.268) | ✅ fertig |
| · | Inbound-Leads (NDA, Interesse, Beobachten) automatisch im Deal-Funnel, Spalte „Eingang" (v0.269) | ✅ fertig |

**Empfehlung & Begründung:** Sprint 7 (ausführliche Bewertung) vor Container-Safe,
weil er direkt auf Sprint 6 aufbaut (Multiples-Tabelle, Engine, Lead-Erfassung →
hohe Wiederverwendung), keinen externen Blocker hat und den Geschäfts-Funnel
schließt: öffentlicher Quick-Check → ausführliche Bewertung (registriert) → Mandat.
Container-Safe ist Infrastruktur, die erst mit vielen aktiven Mandaten/Dateien zahlt,
eine R2/S3-Entscheidung voraussetzt und logisch mit dem Exposé-Builder zusammengehört
(der die Safe-Bilder konsumiert).

---

## Sprint 6 · Bewertungs-Quick-Check (öffentlich) · ✅ FERTIG

Öffentlicher, anonymer Unternehmenswert-Rechner unter `/unternehmenswert` (ohne Login).
Zwei Verfahren (EBIT-Multiplikator + vereinfachtes Ertragswertverfahren §199 BewG) →
**Werte-Korridor** (konservativ/Basis/optimistisch). Gegen E-Mail + DSGVO-Consent
**PDF-Report** (Download + Mailversand), Erfassung als **Bewertungs-Lead** im Admin.

**6.1-Erweiterung (v0.227):** `valuation_multiples` auf **20 Branchen × 3 Größenklassen**
(Micro < 5 Mio. €, Small 5–50 Mio. €, Mid > 50 Mio. € Umsatz) umgestellt; Engine wählt
die Größenklasse automatisch nach Ø-Umsatz. Startwerte aus **DUB KMU-Multiples (Q2/2026)**,
offen als Quelle ausgewiesen und im Admin-Tab **„Multiples"** pflegbar. PDF-Report im
Phalanx-Briefbogen (Logo, Tagline, 1,5-zeilig, Blocksatz, werblicher Abschluss-Block).

---

## Sprint 7 · Ausführliche Bewertung (Engine + Report) · ✅ FERTIG

**Ziel:** Geführte, mehrstufige Bewertung für registrierte Verkäufer/Leads, das
Fundament für das langfristige „ZDF → Bewertung"-Tool. Baut auf Sprint 6 auf.

**Datenmodell (Migration):** neue Tabelle `detailed_valuations(id, tenant_id, user_id,
project_id NULLABLE, status[draft|submitted|reviewed], inputs_json, results_json,
report_pdf_ref, reviewed_by, created_at, updated_at)`, tenant_id + RLS (fail closed).

**Fragebogen (Stepper, jederzeit als Entwurf speicherbar):**
1. **Finanzdaten:** GuV-Kernzeilen 3 Ist-Jahre + laufendes/Planjahr (Umsatz,
   Materialeinsatz, Personal, EBITDA, EBIT), Bereinigungen (marktübliches GF-Gehalt,
   Einmaleffekte, Mieten an Gesellschafter), Nettoverschuldung (Cash, Darlehen →
   Equity-Bridge light).
2. **Qualitative Faktoren (Scorecard):** Inhaberabhängigkeit, Kundenkonzentration
   (> x % Umsatz je Kunde: DUB weist das prominent aus), Team/zweite Ebene,
   Marktposition/Wettbewerb, Saisonalität/Zyklizität, Investitionsstau,
   Digitalisierung/Prozesse: je Faktor Zu-/Abschlag auf das Multiple.
3. **Substanz (optional):** Verkehrswerte Maschinen/Immobilien, Schulden →
   Substanzwert als Untergrenze.

**Engine (`server/valuation/detailedEngine.js`, reine Funktionen + Tests):**
- Multiplikatorverfahren: bereinigtes Ø-EBIT × (Branchen-/Größenklassen-Multiple aus
  Sprint 6 ± Scorecard-Anpassung, Größenabschlag < 1 Mio. € EBIT).
- Vereinfachtes Ertragswertverfahren (§199 BewG, Faktor 13,75), Vergleichswert
  mit Steuer-Kontext-Hinweis.
- Ertragswert mit risikogerechtem Zins (Basiszins + Marktrisiko + individuelle
  Zuschläge aus Scorecard: KMUrechner-Logik).
- Kapitaldienstfähigkeits-Check (KMUrechner Modul 2): Ist der Korridor aus Käufersicht
  über ~6–8 Jahre finanzierbar? → dämpft überhöhte Preiserwartungen.
- Ergebnis: Wertkorridor + Methodenvergleich + Sensitivität (± 1 Multiple-Punkt).

**Output:** ausführlicher PDF-Report (mehrseitig, Phalanx-CI) mit Methodik,
Bereinigungsrechnung, Scorecard, Korridor, Kapitaldienst-Tabelle, Disclaimer
„indikativ, kein IDW-S1-Gutachten". **Admin-Review-Schritt** (status=reviewed,
Kommentar) vor Versand. Verknüpfbar mit Mandat (`project_id`) → Preisband im Exposé
referenzierbar (Sprint 9).

**Preis:** optional hinter dem bestehenden Billing-Flag (`BILLING_ENABLED`) als
kostenpflichtige Position: der öffentliche Quick-Check (Sprint 6) bleibt gratis.

**Aufwand:** 1–1,5 Sprints. Abhängigkeiten: Sprint 6 (Multiples-Tabelle, Lead-Übernahme).

---

## Sprint 8 · Container-Safe (Ordner-Uploads, Object Storage)

**Ziel:** Komplette Ordner, Bilder und beliebige Dateien je Mandat sicher ablegen, 
getrennt von Teaser/IM/Datenraum, als Quelle für Exposé und gezielte Freigaben.

**Architektur:**
- **StorageProvider-Interface** (`server/providers/storage/`): `put/get/delete/list`, 
  `LocalVolumeProvider` (Default, heutiges Verhalten) und `S3Provider` (S3-kompatibel:
  Cloudflare R2 / Hetzner / AWS; ENV `STORAGE_PROVIDER`, `S3_ENDPOINT/BUCKET/KEY/SECRET`).
  Empfehlung: **R2** (kein Egress-Entgelt, S3-API).
- **Migration:** `safe_items(id, tenant_id, project_id, parent_id NULLABLE → Ordnerbaum,
  name, is_folder, storage_key, size, mime, checksum_sha256, version, uploaded_by,
  created_at)`: eigene Zone, kein Dokumenten-Level.
- **Zugriff:** ausschließlich Admin + Projekt-Pfleger (`can_manage`). **Kein**
  Investor-Zugriff (härter als Datenraum). Jeder Zugriff ins `activity_log`.
- **Freigabe-Workflow:** „In Datenraum/IM/Teaser übernehmen" kopiert ein Safe-Item als
  `documents`-Eintrag (Kategorie wählbar) → ab dann greifen Gates/Wasserzeichen/Links.

**UI:** Datei-Explorer im Mandat (Ordnerbaum, Multi-Upload ganzer Ordner via
`webkitdirectory` + Drag&Drop, Bildgalerie, Fortschritt, Versionierung bei Kollision,
Papierkorb 30 Tage, Speicherverbrauch je Mandat/Tenant, Anknüpfung Billing-Staffel).

**Akzeptanz:** 500-Dateien-Ordner stabil · Safe für Investoren unter keiner URL
erreichbar (Gate-Test) · Checksummen verifiziert · Provider per ENV umschaltbar ·
Killswitch löscht Safe mit.

**Entscheidung vorab:** R2/S3-Konto anlegen: sonst Start auf Volume mit klarem Limit.

---

## Sprint 9 · Exposé-Builder (DUB-Standard, IM-Gate) · ✅ FERTIG

Umgesetzt: Migration `exposes` (RLS), Editor mit DUB-Keyfacts-Raster + ein-/
ausblendbaren Sektionen, Titelbild/Galerie aus dem Container-Safe, Autosave,
Anonymisierungs-Checkliste vor Publikation. Web-Exposé hinter dem IM-Gate
(erst NDA, dann Exposé), PDF-Export in Phalanx-CI mit Empfänger-Wasserzeichen,
automatische Übernahme des geprüften Bewertungskorridors (Sprint 7) als
Kaufpreisvorstellung. Offen als Folgeausbau: automatische Ableitung der
öffentlichen Teaser-Karte aus markierten Exposé-Feldern.

### Ursprüngliche Planung

**Ziel:** Professionelle Exposés strukturell nach DUB, inhaltlich nach KERN/HWK, als
gated Web-Exposé (erweitert die Detail-Tabs) und PDF-Export in CI; anonymes Kurzprofil
(Teaser) wird daraus abgeleitet.

**Datenmodell (Migration):** `exposes(id, tenant_id, project_id UNIQUE, status[draft|
published], keyfacts_json, sections_json, hero_image (safe_item), gallery_json,
updated_by, published_at)`.

**Struktur (Sektionen ein-/ausblendbar):** 1. Keyfacts-Grid (DUB-Raster: Land, Region,
Umsatzband, operatives Ergebnis, GF-Gehalt „auf Anfrage", Mitarbeiter, Standorte,
Gründungsjahr, Rechtsform, abzugebender Anteil, Preisband, Branchen NACE, Beteiligungsart,
Kaufpreismodalitäten) · 2. Unternehmen & Historie · 3. Leistungsspektrum/Geschäftsmodell ·
4. Markt & Wettbewerb · 5. Organisation & Mitarbeiter (GF-Verfügbarkeit nach Übergabe) ·
6. Finanzen (3 Jahre; optional Korridor aus Sprint-7-Bewertung) · 7. Stärken &
Potenziale (SWOT-light) · 8. Immobilien/Anlagen · 9. Käuferanforderungen & Verkaufsgrund ·
10. Prozess & nächste Schritte · Bildergalerie aus Container-Safe (Sprint 8).

**Editor & Ausspielung:** Sektionseditor in der Mandats-Pflege (Admin + `can_manage`,
Autosave, Vorschau) · Web-Exposé hinter dem bestehenden **IM-Gate** (nda_signed/
im_granted: „erst NDA, dann Exposé") · PDF-Export mit Empfänger-Wasserzeichen ·
Kurzprofil-Ableitung speist Teaser-Karte + öffentliche Detailseite (Anonymisierungs-
Checkliste vor Publikation).

**Aufwand:** 1,5 Sprints. Abhängigkeiten: Sprint 8 (Bilder), optional Sprint 7 (Korridor).

---

## Sprint 10 · Käufer-UX: Deal-Liste, Suchprofile, Match-Benachrichtigungen (teilweise ✅)

Vorbilder: **Dealum** (Funnel-Tabelle) und **Dealsuite** (flexible Filter, gespeicherte
Suchen, tägliche/wöchentliche Match-Benachrichtigungen, diskretes Netzwerk).

**Bereits umgesetzt:**
- ✅ **Tabellarische Ansicht** im Marktplatz (Umschalter Karten ⇄ Tabelle): Spalten
  Mandat, Typ, Branche, Region, Umsatz, EBITDA, Deal-Typ, „Neu seit".
- ✅ **Suchprofile / gespeicherte Suchen** (`search_profiles`, CRUD): aktuelle Filter
  über „Suche speichern" sichern; Verwaltung unter `/suchprofile` (löschen, Frequenz,
  Treffer ansehen).
- ✅ **Sofort-Match-Benachrichtigung**: Wird ein Mandat veröffentlicht, erhalten Käufer
  mit passendem Suchprofil (Frequenz „sofort") eine Branded-Mail.

**Ebenfalls umgesetzt (Sprint-10-Rest):**
- ✅ **Digest**: täglicher/wöchentlicher Sammel-Versand (Scheduler) für Frequenz
  „täglich"/„wöchentlich".
- ✅ **Merkliste** mit eigenen **Tags & Notizen** je Mandat (`/merkliste`).
- ✅ Feinere Kriterien: **Umsatz-/EBITDA-Band** im Filter, Suchprofil und Matching.

**Noch offen (spätere Kür):** Spaltenauswahl/Sortierung in der Tabelle, Aufgaben je
Deal (volles Käufer-CRM).

---

## Sprint 11 · In-App-Chat & Kontakte (Netzwerk)

- Direktnachrichten zwischen berechtigten Kontakten (nach NDA/Freigabe); Kontakte
  gegenseitig hinzufügen/annehmen (Netzwerk wie Dealsuite).
- Tabellen `connections` (requester/addressee/status) und `messages` (thread_id,
  sender, body, read_at); RLS; Benachrichtigung per Branded-Mail bei neuer Nachricht.
- Diskretionssteuerung: sichtbar nur, was der Nutzer teilt; Admin-Moderation.

---

## Querschnitt-Ergänzung · Prozess-Benachrichtigungen

Jeder Funnel-Schritt löst eine **Branded-Mail** (Phalanx-Header + Impressum-Footer,
werblicher Ton) aus: Registrierung, Freigabe, NDA angefordert/signiert/freigegeben,
IM/Datenraum-Freigabe, neue Unterlagen, Q&A-Frage/-Antwort, LOI. Ziel: der Kunde ist
über **jeden** Schritt informiert. (Basis bereits gelegt: `sendProcessUpdateEmail`.)

---

## Sprint 12 · Ausführliche Bewertung 2.0 (datengetrieben) · Ausbaustufe

Langfrist-Wunsch, nach genügend Mandaten: aus Zahlen/Daten/Fakten automatisiert eine
belastbarere indikative Bewertung, angereichert mit Marktdaten.

- Mehrjahres-Financials strukturiert erfassen (Import aus Excel/DATEV-Export; nutzt
  xlsx-Kompetenz), automatische Bereinigungen (kalk. GF-Gehalt, Einmaleffekte,
  Betriebsnotwendigkeit von Vermögen).
- Erweiterte Multiples: Umsatz- UND EBIT/EBITDA-Multiples je NACE-Untergruppe,
  Größen-/Wachstums-/Risiko-Adjustierung (Scorecard).
- Ertragswert (regulär) mit Planjahren + Kapitalisierungszins, optionales **DCF-Modul**,
  **Sensitivitäts-/Szenarioanalyse** (Best/Base/Worst).
- Benchmarking gegen anonyme Plattform-Daten (sobald genug Mandate vorhanden).
- Versionierte Bewertungen je Deal, Übernahme in Exposé & CRM. Optional kostenpflichtig.

---

## Sprint 14 · CRM / Beziehungs- & Deal-Management (Sell-Side) · geplant

**Motiv.** Langfristiger Mehrwert für Phalanx als M&A-Sell-Side-Berater *und* für die
Kunden (Verkäufer/Käufer). Vorbild-Analyse: **folk.app** („CRM für den Vertrieb").
folk baut auf fünf Säulen: (1) **Migrieren/Zentralisieren** aller Kontakte aus
Mail/Kalender/Netzwerken, (2) **Erfassen** von Leads per LinkedIn-Erweiterung (folkX),
(3) **Anreichern** fehlender Kontaktdaten per 1-Klick (Waterfall-Enrichment),
(4) **Outreach** mit KI-Entwürfen, E-Mail-Sequenzen und automatisierten Follow-ups,
(5) **Close** über anpassbare, kollaborative Pipelines mit Dashboards, alles auf einer
**einheitlichen Multi-Channel-Zeitleiste** (WhatsApp/Gmail/LinkedIn), plus Rollen/Rechte,
Mobile-App und API. Kern-Verkaufsargument: „ein CRM, das die Nachverfolgung übernimmt,
damit man Zeit für Beziehungen hat".

**Übertragung auf M&A-Sell-Side (CapitalMatch).** Der Deal-Funnel ist ein CRM-Funnel:
Mandat gewinnen → Käuferuniversum aufbauen → anonymisiert ansprechen (Teaser) → NDA →
IM/Exposé → Management-Call → LOI/indikatives Angebot → DD → SPA/Closing. Vieles ist
bereits vorhanden und muss nur zu einem CRM verdichtet werden: Mandate (`projects`),
Kontakte/Netzwerk (`connections`), Chat (`messages`), NDA-, Exposé-, Bewertungs- und
Aktivitäts-Logs. Es fehlt die **verbindende CRM-Schicht**: Kontakt-Objekt mit Historie,
Buyer-Longlist je Mandat, Deal-Pipeline mit Stages, Aufgaben/Wiedervorlagen und
Reporting.

**Zwei Nutzergruppen (bewusst getrennt).**
- *Intern (Phalanx-Cockpit):* Christians Arbeits-CRM, Käuferlisten, Ansprache-Status,
  Wiedervorlagen, Pipeline über alle Mandate, Reporting.
- *Kunde (Mehrwert im Produkt):* Verkäufer sehen transparent den Ansprache-/Interesse-
  Status ihrer Buyer-Longlist; Käufer sehen ihre verfolgten Deals als kleine Pipeline
  (baut auf Merkliste/Suchprofilen auf).

**Umsetzungsstufen (an CapitalMatch-Architektur angepasst: Postgres/Knex, RLS je
`tenant_id`, Provider-Stubs für externe Dienste).**

*Stufe A: CRM-Kern (hoher Nutzen, geringe Abhängigkeit):*
- Migration `crm_contacts` (Person/Organisation, Typ Käufer/Verkäufer/Intermediär/
  Investor, Quelle, Tags, Owner) + `crm_interactions` (append-only Zeitleiste:
  Mail/Call/Meeting/Note, verknüpft mit Mandat & Kontakt), beide mit RLS.
- **Buyer-Longlist je Mandat**: `deal_buyers` (Mandat × Kontakt × Ansprache-Status:
  identifiziert → angesprochen → NDA → IM → Q&A → LOI → raus). Speist sich aus
  bestehenden NDA-/Exposé-Zugriffen automatisch.
- **Deal-Pipeline (Kanban)**: Mandats-Stages als konfigurierbare Spalten; Drag&Drop
  (das Pipeline-Muster existiert bereits aus der Projekt-Pipeline).
- **Aufgaben/Wiedervorlagen**: `crm_tasks` (fällig am, Owner, verknüpft) + Reminder-Mail
  über den bestehenden Digest-/Scheduler-Mechanismus.

*Stufe B: Produktivität & Reporting:*
- **Unified Timeline** je Kontakt/Deal: bündelt Interaktionen + Plattform-Events
  (NDA signiert, IM angesehen, Frage gestellt) an einer Stelle.
- **Dashboards**: Funnel je Mandat (wie viele Käufer je Stage), Conversion, Alter der
  Deals, überfällige Wiedervorlagen: nutzt vorhandene Chart-/Dashboard-Kompetenz.
- **Serien-Outreach** an Buyer-Longlist mit Vorlagen (Teaser-Versand) über den
  bestehenden Brevo-Mailweg; Sequenzen/Follow-ups optional über Scheduler.

*Stufe C: Anreicherung & Kanäle (externe Abhängigkeiten, als Provider-Stubs):*
- **Kontakt-Anreicherung** (Firmendaten/E-Mail) über austauschbaren Enrichment-Provider
  (Stub wie Storage/Payment): DSGVO-konform, opt-in, Quellennachweis.
- **Import** aus Outlook/Gmail/CSV; später leichte LinkedIn-Erfassung (Lesezeichen/
  Bookmarklet statt Scraping: rechtlich sauber halten).
- **Kanäle**: E-Mail zuerst; WhatsApp/LinkedIn nur, wenn rechtlich/AGB-seitig tragfähig.

**Abgrenzung/Prinzipien.** Kein Vollersatz für HubSpot/Salesforce, sondern ein
**schlankes, M&A-spezifisches Beziehungs-CRM**, eng verzahnt mit Mandat, NDA, Exposé
und Bewertung. DSGVO: Kontaktdaten mit Rechtsgrundlage, Löschkonzept, Auftragsverarbeiter
für Enrichment. Alles mandantenfähig (RLS) und optional hinter Billing-Flag als
Premium-Modul für Kunden.

**Empfehlung Reihenfolge.** Stufe A liefert sofort Nutzen aus vorhandenen Bausteinen und
sollte zuerst kommen (nach Bewertung 2.0). Enrichment/Kanäle (Stufe C) zuletzt, da extern
und rechtlich prüfpflichtig.

---

## Sprint 15 · Connect & Interaktion Käufer ↔ Verkäufer · geplant

**Motiv.** Der bestehende In-App-Chat (Sprint 11) wird zum Herzstück der Vernetzung
zwischen Käufer und Verkäufer entlang des gesamten Deal-Prozesses, statt loser
Nachrichten ein geführter, prozessgetriebener Austausch. Vorbild ist die **AddedVal.io-
Strecke**: Der Interessent lädt ein Pitch Deck / bekundet Interesse → das System stellt
per E-Mail eine **Intro** her („Get to know each other", Reply-all) → beide Seiten sind
verbunden. Zusätzlich erhalten Nutzer **regelmäßige E-Mails über neue Pitch Decks/Mandate**
(bei uns bereits als Digest vorhanden). Diese Mechanik übertragen wir sauber auf beide
Fokusstränge der Plattform: **Transaktion (M&A)** *und* **Startup-Finanzierung**
(letzteres bereits mit Beispielen bestückt: Projekt Umami, Nexora, sowie neu Betongold
[Nachfolge/Skalierung] und Cudd [Transformation] im M&A-Strang).

**Kernidee: „Interesse → Intro → Chat".** Aus einer Interessens-/Deck-Anfrage wird
automatisiert eine Verbindung + ein Chat-Thread, kontextbezogen zum Mandat.

*Bausteine:*
- **Interesse-→-Connect-Trigger:** „Interesse bekunden"/„Deck anfordern" erzeugt (nach
  Freigabe/NDA-Logik) automatisch eine Verbindungsanfrage **und** einen mandats-
  gebundenen Chat-Thread; begleitende Intro-Mail an beide Seiten (Muster AddedVal).
- **Mandatsbezogener Chat:** Threads sind an ein Projekt gekoppelt (nicht nur 1:1),
  sodass Verkäufer/Berater und Interessent im Deal-Kontext sprechen; Sichtbarkeit/
  Freigabe gestuft (anonym → nach NDA Klarname).
- **Prozess-Trigger & Statuswechsel im Chat:** Systemnachrichten bei Meilensteinen
  (NDA angefragt/signiert, IM freigegeben, Q&A gestellt, LOI), der Chat wird zur
  Deal-Timeline. Baut auf `deal_status` (teaser_live→in_diligence→loi→closed) auf.
- **Benachrichtigungen:** E-Mail + In-App bei neuer Nachricht/Statuswechsel; Opt-in
  „neue passende Mandate" nutzt die bestehende Digest-/Match-Engine.
- **Moderation/Diskretion:** Berater (Admin) kann Intros kuratieren/freigeben, bevor
  Klarnamen geteilt werden: passend zum vertraulichen M&A-Kontext (Unterschied zu
  AddedVal, wo Intros offener sind).

*Technik:* nutzt vorhandene `connections`/`messages` (Sprint 11); Erweiterung um
`project_id`-Bezug am Thread, Systemnachrichten-Typ, Trigger aus Interesse/NDA/QA/LOI,
Reminder über den bestehenden Scheduler. Alles mandantenfähig (RLS).

---

## Sprint 16 · Admin-Dashboard 2.0 (Analytics & Auswertung) · als Nächstes

**Motiv.** Das aktuelle Admin-Dashboard ist funktional, aber statisch: acht KPI-Kacheln
plus ein fixer Schnellzugriff aus vier Blöcken zu je drei Links. Es fehlen (a) eine
weniger starre, datengetriebene Gliederung und (b) echte **statistische Auswertungen**
für das Transaktionscontrolling. Ziel ist ein **lebendiges Cockpit**, das den
Deal-Funnel, Trends und Engpässe auf einen Blick zeigt, als Grundlage für Steuerung
und (später) Gamification.

**A: Weg von den statischen 3er-Blöcken.**
- Der fixe Schnellzugriff wird zu **datengetragenen Kacheln**: jeder Einstieg trägt eine
  Live-Kennzahl/ein Badge (z. B. „NDA-Anfragen · 2 offen", „Q&A · 1 unbeantwortet",
  „Feedback · 3 neu"), sodass die Kachel Information statt bloßer Navigation liefert.
- Layout wird **rollen-/kontextabhängig** und priorisiert nach Handlungsbedarf
  (offene Aufgaben zuerst), statt vier gleich aussehender Spalten.

**B: Statistische Werte & Auswertungen.**
- **Deal-Funnel (Kern):** Teaser-Ansicht → Interesse/NDA angefragt → NDA signiert →
  Datenraum → LOI → Closing, je Mandat und aggregiert; mit **Conversion-Raten**
  (Interesse→NDA, NDA→Datenraum, →LOI) und **Ø Verweildauer je Phase**.
- **Zeitreihen (7/30/90 Tage, YTD):** neue Nutzer, NDA-Anfragen, Datenraum-Zugriffe,
  Nachrichten, veröffentlichte Mandate: als kompakte Sparklines/Balken.
- **Mandats-Ranking:** aktivste Mandate (Zugriffe/Interessenten) und **stagnierende
  Mandate** (kein Fortschritt seit X Tagen) als Handlungssignal.
- **Deal-Alter & Pipeline-Wert:** Alter je Deal-Phase; optionale Summe der
  Ask-/Bewertungsbänder als indikativer Pipeline-Wert.
- **Aktivitäts-Feed/Heatmap** aus `activity_log` (letzte Ereignisse, Aktivität je Tag).

**C: Interaktivität.**
- **Zeitraum-Filter** (7/30/90/YTD) und **Mandats-Filter** global auf dem Dashboard.
- KPI-Kacheln sind **klickbar** und öffnen den passenden, vorgefilterten Tab.
- **Export** der Kennzahlen (CSV/PDF) fürs Reporting/Transaktionscontrolling.

**Technik.**
- Neuer, zeitfenster-parametrisierter Aggregations-Endpoint
  `GET /api/admin/analytics/overview?range=30d`, bündelt Kennzahlen aus
  `activity_log`, `interests`, `nda_requests`, `messages`, `users`, `projects`
  (effiziente `GROUP BY`/Window-Queries, RLS/mandantenfähig, nur Admin/Berater).
- **Visualisierung bewusst leichtgewichtig:** Inline-SVG-Sparklines/Balken statt
  schwerer Chart-Abhängigkeit (konsistent mit dem Inline-Style-Ansatz; hält das
  Client-Bundle klein). Optional später ein kleines Chart-Modul.
- Baut auf den in Sprint 15 eingeführten Prozess-Events auf und **liefert die
  Datengrundlage für die XP-Gamification (Sprint 17)**.

**Abgrenzung.** Kennzahlen sind indikativ/steuerungsorientiert (kein Finanz-Reporting
im engeren Sinn). Performance im Blick behalten (Aggregate cachen/downsampeln, wenn
Datenmengen wachsen).

---

## Sprint 17 · Gamification / XP-Punktesystem · geplant

**Motiv.** AddedVal.io nutzt sichtbare **XP/Level** („210 XP · Level Entdecker",
„1001 free Downloads") als Aktivierungs- und Bindungsmechanik. Für CapitalMatch soll
Gamification **echte Prozessfortschritte** belohnen, nicht bloßes Klicken, , um
Interaktion und vor allem **abgeschlossene Deals über die Plattform** zu fördern.

**Prinzip: Punkte für werthaltige Interaktion, große Boni für Abwicklung über die
Plattform.** Beispiel-Wertung (final zu kalibrieren):

| Aktion | XP (Idee) | Ziel |
|-------|-----------|------|
| Profil vollständig, E-Mail verifiziert | 10 | Onboarding |
| Suchprofil angelegt / Mandat gemerkt | 5 | Aktivierung |
| Interesse bekundet / Intro angenommen | 15 | Vernetzung |
| NDA signiert | 40 | Ernsthaftigkeit |
| Am Q&A/Datenraum aktiv teilgenommen | 25 | Due Diligence |
| LOI abgegeben/erhalten | 75 | Deal-Fortschritt |
| **Deal über die Plattform abgewickelt (Closing)** | **300+** | **Kernziel** |

*Bausteine:*
- **Event-basierte Vergabe:** XP hängen an denselben Prozess-Events wie Sprint 15
  (NDA, DD/Q&A, LOI, Closing): eine `xp_events`-Tabelle (append-only, idempotent je
  Event) + aggregierter Punktestand je Nutzer; Level-Schwellen (z. B. Entdecker →
  Insider → Dealmaker).
- **Anzeige:** dezenter XP-/Level-Badge im „Mein Bereich" und Navbar (mobil-tauglich);
  optionale (anonymisierte) Bestenliste, im vertraulichen M&A-Kontext bewusst
  zurückhaltend/opt-in.
- **Anti-Gaming:** Punkte nur für verifizierte, nicht rückgängig gemachte Prozess-
  schritte; Missbrauchsschutz (kein XP für selbst ausgelöste Dummy-NDAs etc.).
- **Belohnung real koppeln (optional, später):** XP schalten Vorteile frei (z. B.
  Freischaltungen, Sichtbarkeit, Rabatte auf kostenpflichtige Bewertungen), analog
  AddedVals „free Downloads"/Virtual Shares, aber M&A-gerecht.

*Abwägung/Prinzipien:* Gamification darf Seriosität und Vertraulichkeit nicht
untergraben. Daher Fokus auf **prozess-echte** Punkte, dezente Darstellung, Opt-in bei
öffentlicher Sichtbarkeit. Technisch schlank (ein Eventlog + Aggregat), verzahnt mit
Sprint 15 (Prozess-Trigger) und dem CRM (Sprint 14).

---

## Sprint 18 · Engagement-Mailings: Newsletter, Folgen, Änderungs-Mails, Ähnlichkeit · geplant

**Motiv.** Käufer aktiv und automatisiert an passende Mandate heranführen (Vorbild
AddedVal-Strecke „neue Pitch Decks per E-Mail"). Baut auf Digest-/Match-Engine (Sprint 10),
Merkliste/Watchlist und Suchprofilen auf.

- **Newsletter zu neuen Mandaten:** opt-in Abo (alle neuen / gefiltert nach Branche,
  Region, Umsatz-/EBITDA-Band, Mandatstyp). Versand über den bestehenden Scheduler/Brevo;
  Frequenz sofort/täglich/wöchentlich; Abmeldelink (DSGVO).
- **Folgen-Option je Mandat:** „Folgen"-Stern (baut auf Watchlist auf), **automatisch bei
  Interesse/NDA** gesetzt, zusätzlich **manuell** per Sternchen. Wer folgt, erhält Updates.
- **Änderungs-Mails bei Mandats-Updates:** Benachrichtigung an Follower/Interessenten bei
  relevanten Änderungen (neuer Teaser/IM, neue Dokumente, Preis-/Status-Änderung, neues Q&A).
  Ereignisgesteuert, gebündelt (kein Spam), je Nutzer konfigurierbar.
- **Ähnlichkeits-Matching (tag-basiert):** aus dem Interesse-Funnel eines Nutzers (welche
  Branchen/Regionen/Größen er via Interesse/NDA/Watchlist zeigt) automatisch **„ähnliche
  Mandate"** vorschlagen und per Mail/In-App anstoßen. Nutzt Projekt-Tags/Kategorien
  (in CRM I formalisiert) + Suchprofil-Signale; einfache Scoring-Heuristik zuerst, KI später.
- **Zentrale Benachrichtigungs-Einstellungen:** ein Ort für alle E-Mail-/In-App-Präferenzen
  (Newsletter, Folgen, Änderungen, Digest) mit granularem Opt-in/Opt-out.

---

## Sell-Side-CRM · mehrstufiger Ausbau (Sprint 19–24)

**Zielbild.** Eine webbasierte, in CapitalMatch integrierte CRM-Anwendung für die
Sell-Side-M&A-Beratung: modular, mit offenen Schnittstellen, schnell bedienbar (kein
überladenes CRM), zentrale Verwaltung von **Unternehmen, Kontakten, Transaktionen und
Kommunikation**, rollen-/rechtebasiert für vertrauliche M&A-Daten. **Multi-User** und
perspektivisch **durch Dritte nutzbar** → Mandantenfähigkeit (RLS ist bereits Fundament)
und **DSGVO-Konformität** sind durchgängig verbindlich. Bewusst in kleinen, lauffähigen
Stufen, damit nach und nach implementierbar.

**Prinzipien (in jeder Stufe):** neue Tabellen mit `tenant_id` + RLS (fail closed);
revisionsfähige Änderungsprotokolle (`audit_logs`/`activity_log`); Verschlüsselung
sensibler Daten; EU-Hosting; SSO über das bestehende Nutzerkonto; Übernahme des
vorhandenen Rollen-/Rechtesystems; keine doppelte Datenhaltung; offene API + Webhooks.

### Sprint 19 · CRM I: Unternehmen & Kontakte (Fundament)
Entspricht Spec §1, §2 (+ Basis §10). **Mindestumfang-Kern.**
- **Unternehmen** (`crm_companies`): Firmenname, Anschrift, Website, Branche, Umsatz,
  Mitarbeiterzahl, Region, Unternehmensart, Käuferkategorie, Investitionskriterien,
  Beschreibung, Notizen; frei definierbare Schlagwörter/Kategorien; Dubletten-Erkennung;
  Verknüpfung Mutter/Tochter/Beteiligung.
- **Kontakte** (`crm_contacts` + n:m `crm_company_contacts`): mehrere Ansprechpartner je
  Unternehmen, ein Kontakt in mehreren Unternehmen; Name, Position, E-Mail, Tel./Mobil,
  LinkedIn, Standort, Verantwortungsbereich, Beziehung, persönliche Notizen; Kennzeichnung
  Entscheider; Positions-/Wechsel-Historie; Einwilligungen/Kontaktstatus (DSGVO).
- **Import/Export:** CSV/Excel (nutzt vorhandene xlsx-Kompetenz).
- Aggregierte Ansicht: alle Kontakte, Transaktionen, Aufgaben, Kommunikation je Unternehmen.

### Sprint 20 · CRM II: Transaktionen, Beteiligte & Kanban-Funnel
Entspricht Spec §4, §5. Baut auf vorhandener Projekt-/Deal-Pipeline auf.
- **Transaktionen/Mandate** (Erweiterung des `projects`-Modells oder `crm_deals`):
  Projektname, interne Nr., Branche, Region, Umsatz, EBITDA, Kaufpreisvorstellung,
  Transaktionsart, Status, Verantwortlicher, Vertraulichkeitsstufe.
- **Beteiligtenrollen** (`crm_deal_parties`): Zielunternehmen, Verkäufer, Käufer,
  Interessent, Berater, Bank, Anwalt … je Unternehmen/Kontakt und Transaktion.
- **Konfigurierbare Kanban-Boards** je Transaktion/Mandat/Nutzer; Sell-Side-Funnel
  (Longlist → nicht angesprochen → Ansprache vorbereitet → kontaktiert → Rückmeldung offen
  → Interesse → NDA versandt/unterzeichnet → Teaser → IM → Management-Gespräch → indikatives
  Angebot → DD → verbindliches Angebot → Vertragsverhandlung → abgeschlossen/abgesagt);
  Drag-and-drop, automatische Status-/Zeitstempel, **Verweildauer je Stufe**, Warnung bei
  inaktiven/überfälligen Vorgängen; getrennte Funnel für Käuferansprache/Akquise/Investorenpflege.

### Sprint 21 · CRM III: Aufgaben/Wiedervorlagen & Kommunikation
Entspricht Spec §6, §7. **Mindestumfang-Kern für Kommunikation.**
- **Aktivitäten/Aufgaben/Wiedervorlagen** (`crm_tasks`): Zuordnung zu Kontakt/Unternehmen/
  Transaktion; Fälligkeit, Priorität, Verantwortlicher; Erinnerungen (Rückrufe, offene NDAs,
  Rückmeldungen, Angebotsfristen, Datenraum, Folgeansprachen); persönliche + Team-Ansicht;
  automatische Aufgaben bei Funnel-Wechseln; Kalender-Integration (später).
- **Kommunikation:** E-Mail-Versand aus dem CRM (persönliche/zentrale Absender), Vorlagen
  (Erstansprache, NDA-Versand, Teaser, IM, Erinnerung, Termin, Absage) mit Platzhaltern;
  **E-Mail-Ingest zuerst über BCC-/Weiterleitungsadresse** (M365/Gmail/IMAP/API später),
  automatische Zuordnung zu Kontakt/Unternehmen/Projekt; vollständige Historie; Kennzeichnung
  vertraulich/intern; Vermeidung doppelter Ansprache; Serienansprache mit Freigabeprozess.

### Sprint 22 · CRM IV: Dokumente, Auswertungen & Selbstpflege-Portal
Entspricht Spec §3, §8, §9.
- **Dokumentenmanagement:** Zuordnung zu Unternehmen/Kontakt/Transaktion, Versionierung,
  Versand-/Empfangsstatus, Vertraulichkeitskennzeichen, rollenabhängiger Zugriff, gängige
  Formate; Anschluss an bestehenden Container-Safe/Datenraum; Zugriffsprotokoll.
- **Suche/Filter/Auswertungen:** globale Suche (Unternehmen, Kontakte, Projekte, E-Mails,
  Dokumente); kombinierbare, gespeicherte Filter; KPI-Auswertungen (angesprochene Käufer,
  Rücklauf-, NDA-, Interessenten-, Angebots-, Abschlussquote; Ø Dauer je Funnel-Stufe;
  Aktivität je Mitarbeiter; Käuferaktivität je Branche); Export Excel/CSV. (Nutzt Sprint-16-Analytics.)
- **Kontakt-Selbstpflege-Portal:** gesicherter persönlicher Link für externe Kontakte zur
  Prüfung/Aktualisierung ihrer Daten (Kontakt, Position, Unternehmen, Investitionsschwerpunkte,
  Brancheninteressen, geografischer Fokus, Ticketgrößen, Kommunikationspräferenzen);
  Protokollierung; direkte Übernahme oder interne Freigabe; Abmeldung/Einschränkung der
  Kontaktaufnahme; automatische Aktualisierungs-Erinnerung. **DSGVO-zentral.**

### Sprint 23 · CRM V: Rechte, Integration, Multi-Tenant, DSGVO + 2FA
Entspricht Spec §10, §11, §12. **Voraussetzung für Nutzung durch Dritte.**
- **Rollen/Rechte granular:** Administrator, Projektleiter, Projektmitarbeiter, externer
  Berater, Leseberechtigter, externer Kontakt; Rechte auf Modul-/Unternehmens-/Kontakt-/
  Transaktions-/Dokument-/Kommunikationsebene; besonders vertrauliche Projekte nur für
  freigegebene Nutzer sichtbar; lückenlose Protokollierung.
- **Integration/API:** eigenständiges, integrierbares Modul; REST-API + Webhooks;
  SSO über bestehendes Konto; Übernahme Stammdaten; Import bestehender CRM-/Excel-Kontakte.
- **Mandantenfähigkeit aktiv schalten** (RLS-Fundament vorhanden), echte Trennung je
  Kanzlei/Beratung als Voraussetzung für Dritte.
- **DSGVO-Härtung + 2FA** (vorm. Sprint 13): Zwei-Faktor (SMS/TOTP, Mobil-Pflicht bereits
  vorbereitet), Auftragsverarbeitung/Einwilligungen, Löschkonzept, Verschlüsselung, EU-Hosting,
  automatische Datensicherung, revisionsfähige Protokolle.

### Sprint 24 · CRM VI: Ausbaustufen (später)
Entspricht Spec §14. Nach Bedarf und Datenlage:
- Datenanreicherung aus öffentlichen Quellen; Erkennung von Unternehmenswechseln bei Kontakten;
  KI-Zusammenfassung von Kommunikation; Next-Best-Action-Vorschläge; automatische E-Mail-
  Kategorisierung; Kaufwahrscheinlichkeits-Scoring; **Käufer-Matching auf Investitionskriterien**
  und automatische **Longlist-Erstellung**; Serienansprachen mit Freigabe; E-Signatur-Integration;
  tiefere Datenraum-Integration; Auswertung der Ansprachequalität; **Mobile App**;
  **Portalfunktion für Verkäufer und Käufer**.

---

## Querschnitt (in allen Sprints)

- Neue Tabellen immer mit `tenant_id` + RLS-Policy (Sprint-5-Muster, fail closed).
- Alle Zugriffe/Downloads ins `activity_log` (append-only).
- Externe Dienste (Storage/S3, AV-Scan, ggf. Marktdaten) als austauschbare
  **Provider-Stubs** mit dokumentierter Anbindung, wie Signature/Payment.
- Haftung: Bewertungen durchgängig als **indikativ** deklariert (kein IDW-S1/S6-
  Gutachten). Getrennt von der bestehenden IDW-S6-Sanierungskompetenz.
- Nach jedem Sprint: geänderte Dateien, Commit-Message (mit Versionsnummer),
  GitHub-Desktop-Push-Anleitung, Railway-Hinweise (Env/Volume), TESTPLAN-Ergänzung.

---

## Getroffene Entscheidungen

1. **Schnellrechner:** öffentlich & anonym, ohne Login; E-Mail nur optional für den
   PDF-Versand. (04.07.2026)
2. **Reihenfolge:** Sprint 6 zuerst, dann 7 (ausführliche Bewertung) → 8 (Container-Safe)
   → 9 (Exposé) → 10 (Bewertung 2.0). (05.07.2026, konsolidiert)
3. **Branchen-Multiples:** DUB KMU-Multiples (Q2/2026) als Startwerte, offen als Quelle
   ausgewiesen, im Admin pflegbar; Größenklassen Micro/Small/Mid. (04.07.2026, aktualisiert)
   → Lizenz/Nutzungsrecht der DUB-Werte liegt beim Betreiber; jederzeit auf eigene
   Schätzungen umstellbar.
4. **Preis:** Schnellrechner gratis; ausführliche Bewertung (Sprint 7) optional
   kostenpflichtig hinter dem bestehenden Billing-Flag.
