# Changelog — CapitalMatch (Phalanx GmbH)

Wird bei jeder Release mitgeführt. Die In-App-Ansicht (Admin → „Changelog") wird
über Seed-Migrationen gespeist; diese Datei ist die kuratierte Gesamtübersicht.

## v0.246 — 11.07.2026 · Sprint 18: Engagement-Mailings
- **Newsletter** zu neuen Mandaten (opt-in, jederzeit abbestellbar)
- **Folgen**: automatisch bei Interesse/NDA (`watchlist.source='auto'`), zusätzlich manuell per Stern auf der Mandatsseite
- **Änderungs-Mails** an Follower: Mandatspflege, Exposé veröffentlicht, Deal-Status (Due Diligence, LOI, Abschluss)
- **Ähnlichkeits-Matching** aus dem Interesse-Funnel (Score: Branche 3, Region 2, Mandatstyp/Umsatz/Deal-Art je 1)
- **Anti-Doppel-Mail-Kaskade** bei Publish: Suchprofil → Ähnlichkeit → Newsletter; jeder Nutzer erhält höchstens EINE Mail
- Neuer Profil-Bereich „Benachrichtigungen" (granulares Opt-in/Opt-out, DSGVO); „Ähnliche Mandate" auf der Mandatsseite
- Schema: `notification_prefs` (RLS), `watchlist.source`; Endpoints `/api/community/notifications`, `/api/community/similar/:projectId`

## v0.245 — 11.07.2026 · Exposé-PDF: dynamisches Layout
- Eckdaten-Raster jetzt **dynamisch vermessen** (`heightOfString`): Zeilenhöhe = max. Höhe beider Spalten
- Label über Wert gestapelt → beliebig lange Werte brechen sauber um, keine Überlappung mehr (vorher fixe 22-pt-Boxen)
- Überschriften nie allein am Seitenende; Vertraulichkeitshinweis wird vor dem Zeichnen vermessen
- Typografie: Zahl + Einheit werden nicht getrennt („60 %", „€ 3,46 Mio.", „p. a.")

## v0.244 — 11.07.2026 · Dokument-Upload, vollständige Exposés & Exposé-PDF
- Neuer Endpoint `POST /api/documents/:projectId/:docId/file`: Datei an ein **bestehendes** Dokument hängen (Nachreichen/Ersetzen)
- Admin-Dokumentliste: Badge „keine Datei" + Upload-/Ersetzen-Button je Eintrag
- Exposés für „Betongold" und „Cudd" vollständig befüllt (14 DUB-Eckdaten + alle Sektionen, anonymisiert, veröffentlicht)
- Exposé-PDF-Upload: `POST /api/exposes/:projectId/pdf-upload` legt ein fertiges PDF im Safe ab; `GET /pdf` liefert es dann statt der Generierung (`pdf-remove` schaltet zurück)
- Schema: `exposes.pdf_item_id` → `safe_items`

## v0.243 — 10.07.2026 · Sprint 17: Gamification (XP & Level)
- XP für echte Prozessschritte: Interesse (15), NDA signiert (40), Datenraum (25), LOI (75), Watchlist (5), Kontakt (10)
- Großer Bonus für Deal-Abschluss über die Plattform (300) an die beteiligten Käufer
- Level Entdecker → Insider → Dealmaker → Power-/Elite-Dealmaker; Fortschrittsanzeige im „Mein Bereich"
- Idempotentes Eventlog `xp_events` (RLS); Endpoint `GET /api/gamification/me`; Vergabe an denselben Events wie die Deal-Timeline

## v0.242 — 10.07.2026 · Sprint 16: Admin-Dashboard 2.0 (Analytics)
- Statische Schnellzugriff-Blöcke → datengetragene Kacheln mit Live-Kennzahlen (offene NDAs, Feedback, Q&A, …)
- Deal-Funnel mit Conversion-Raten (Interesse → NDA → signiert → Datenraum → LOI → Closing)
- Zeitreihen-Sparklines (7/30/90 Tage, YTD): neue Nutzer, NDAs, Datenraum-Zugriffe, Nachrichten
- Mandats-Ranking mit Stagnations-Warnung; klickbare KPIs; CSV-Export fürs Transaktionscontrolling
- Backend: `GET /api/admin/analytics?range=…` (Funnel, Zeitreihen, Ranking, Badges, Feed)

## v0.241 — 10.07.2026 · Sprint 15: Vernetzung Käufer ↔ Berater (Chat)
- Interesse/NDA verbindet Käufer automatisch mit dem Mandatsberater und legt einen mandatsbezogenen Chat-Thread an
- Neuer Einstieg „Chat mit Ihrem Berater starten" im Mandat (`POST /api/messages/contact-advisor`)
- Prozess-Ereignisse als Systemnachrichten/Timeline im Chat: NDA angefordert/unterzeichnet, Due Diligence, LOI, Closing
- Intro-Mail an den Käufer; Mandats-Codename als Kontext an jeder Nachricht
- Technik: `messages.project_id` + `type` (user/system), Helfer `utils/dealChat.js`, Trigger in NDA- & Deal-Status-Flow

## v0.240 — 10.07.2026 · Zwei neue M&A-Mandate & erweiterte Roadmap
- Neues Mandat „Betongold" — Nachfolge/Komplettverkauf einer Architekturbeton-Manufaktur (3. Gen., € 3,46 Mio. Umsatz 2024)
- Neues Mandat „Cudd" — Transformations-/Turnaround-Case einer Premium-Kindermarke (2025: € 13,1 Mio., 2026e ~€ 10 Mio. Run-Rate)
- Roadmap Sprint 15: Vernetzung Käufer↔Verkäufer über Chat (Interesse → Intro → mandatsbezogener Chat, Prozess-Trigger)
- Roadmap Sprint 16: XP-/Level-Gamification für Prozessschritte (NDA, DD, LOI) und Deal-Abschluss über die Plattform
- Öffentliche Roadmap um beide Punkte ergänzt

## v0.239 — 06.07.2026 · Roadmap aktualisiert & CRM aufgenommen
- Öffentliche Roadmap: Käufer-Cockpit, In-App-Nachrichten & Mobil-Optimierung auf „Verfügbar" gesetzt
- Neuer geplanter Punkt: Beziehungs- & Deal-Management (CRM) — Analyse folk.app, Konzept in ROADMAP.md (Sprint 14)
- Standing Rule dokumentiert: Changelog + Roadmap werden bei jeder Änderung automatisch mitgeführt

## v0.238 — 06.07.2026 · Mobile-First: responsive Darstellung
- Navigation mit Hamburger-Menü auf Smartphone & Tablet
- Mehrspaltige Layouts (Marktplatz, Nachrichten, ausführliche Bewertung, Admin) stapeln sich auf kleinen Bildschirmen
- Breite Datentabellen sind auf dem Handy horizontal scrollbar statt abgeschnitten
- Filter-Seitenleiste im Marktplatz auf Mobil optimiert (nicht mehr klebend)
- Globale Basis: kein horizontales Verrutschen, touch-freundliche Bedienelemente, Viewport-gerechte Schriftgrößen
- Umsetzung: `useIsMobile`-Hook + globales `index.css` (Inline-Grids brechen per `!important` auf eine Spalte um)

## v0.237 — 05.07.2026 · E-Mail-Bestätigung, Nachrichten & Paygate-Vorbereitung
- Registrierung erst nach Bestätigung der E-Mail-Adresse abgeschlossen (Login-Gate + „erneut senden")
- In-App-Nachrichten & Kontakte (Netzwerk) zwischen bestätigten Nutzern
- Ausführliche Bewertung: Paygate vorbereitet, kostenlos bis 31.08.2026 (`VALUATION_FREE_UNTIL`/`VALUATION_PAYWALL`)
- Changelog-Historie vervollständigt (v0.232, v0.233, v0.235 nachgezogen)

## v0.236 — 05.07.2026 · Käufer-Cockpit, Merkliste & Kontakt
- Marktplatz: Tabellenansicht (Dealum-Stil), Suchprofile mit Umsatz-/EBITDA-Filter
- Merkliste mit eigenen Tags und Notizen je Mandat
- Digest-Mails (täglich/wöchentlich) für passende neue Mandate
- Neue Kontaktseite; Robot-/Spam-Schutz (Honeypot + Rate-Limit) für Nachrichten
- Links in E-Mails auf capitalmatch.de umgestellt

## v0.235 — 05.07.2026 · Feedback, Changelog & Suchprofile
- Feedback-Seite (Käufer/Verkäufer) mit öffentlicher Roadmap; Admin-Tabs Feedback + Changelog
- Suchprofile/gespeicherte Suchen + Sofort-Match-Benachrichtigung bei Veröffentlichung

## v0.234 — 05.07.2026 · Kommunikation & Sicherheit
- Alle Kunden-E-Mails im Phalanx-Design mit Impressum-Footer
- Q&A: Direkt-Antwort für Berater, Antwort automatisch an den Fragenden
- Teaser-/Exposé-PDF mit sichtbarem Audit-Stempel
- Mobilnummer im Profil verpflichtend (Basis 2-Faktor-Authentifizierung)

## v0.233 — 05.07.2026 · Q&A, Verkäufer-Pflege & Teaser-PDF
- Q&A für Admin/Pfleger nutzbar; Exposé-/Safe-Einstiege für Verkäufer
- Teaser als PDF mit Briefbogen, Markierung und Audit-Trail

## v0.231 — 05.07.2026 · Exposé-Builder (Sprint 9)
- Strukturiertes Verkaufs-Exposé (DUB-Eckdaten, Sektionen, Safe-Bildergalerie)
- Web-Exposé hinter NDA-Gate; PDF-Export mit Empfänger-Wasserzeichen

## v0.229 — 05.07.2026 · Container-Safe (Sprint 8)
- Sichere Ablage ganzer Ordner/Bilder/Dateien; Papierkorb, Versionierung, Prüfsummen
- Speicher wahlweise Railway-Volume oder Cloudflare R2

## v0.228 — 05.07.2026 · Ausführliche Bewertung (Sprint 7)
- Geführte Bewertung mit Scorecard und Kapitaldienst-Check; mehrseitiger Report; Admin-Review

## v0.227 — 04.07.2026 · Bewertung 2.0 (DUB-Multiples)
- Branche × Größenklasse, Report im Briefbogen, Multiples im Admin pflegbar

## v0.226 — 04.07.2026 · Bewertungsrechner (Sprint 6)
- Öffentlicher Quick-Check + PDF-Report; Admin-Leads

## v0.224 — 04.07.2026 · Pipeline & Dokumente
- Deal-Pipeline mit Drag & Drop; Dokument-Zugriffslevel änderbar; NDA-Download
