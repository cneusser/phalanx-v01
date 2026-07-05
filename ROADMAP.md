# CapitalMatch — Roadmap: Bewertung, Container-Safe, Exposé-Builder

Stand: Juli 2026 · Analysebasis: kmurechner.de, KERN-Unternehmenswertrechner,
HWK-/KERN-Exposé-Leitfaden, DUB-Exposé-Struktur (Beispiel-ID 17680), DUB KMU-Multiples.

> **Konsolidierte Fassung.** Ersetzt die früheren Dateien `ROADMAP-SPRINT-6-9.md`
> und `ROADMAP_Sprint6-9.md`, deren Sprint-Nummerierung voneinander abwich. Es geht
> kein Thema verloren — die Reihenfolge ist unten verbindlich festgelegt.

---

## Verbindliche Reihenfolge

| Sprint | Thema | Status |
|-------|-------|--------|
| 6 | Bewertungs-Quick-Check (öffentlicher Lead-Magnet) | ✅ fertig |
| 6.1 | Multiples auf Branche × Größenklasse (DUB), Report-Briefbogen, Admin-Multiples | ✅ fertig |
| 7 | Ausführliche Bewertung (Engine + Report) | ✅ fertig |
| 8 | Container-Safe (Ordner-Uploads, Object Storage) | ✅ fertig |
| 9 | Exposé-Builder (DUB-Standard, IM-Gate) | ✅ fertig |
| **10** | **Käufer-UX: Deal-Liste + Suchprofile + Match-Benachrichtigungen** | 🟡 teilweise (Tabelle, Suchprofile, Sofort-Match ✅; Digest/Tags offen) |
| 11 | In-App-Chat & Kontakte (Netzwerk) | geplant |
| 12 | Ausführliche Bewertung 2.0 (datengetrieben, DCF, Benchmarking) | Ausbaustufe |

**Empfehlung & Begründung:** Sprint 7 (ausführliche Bewertung) vor Container-Safe,
weil er direkt auf Sprint 6 aufbaut (Multiples-Tabelle, Engine, Lead-Erfassung →
hohe Wiederverwendung), keinen externen Blocker hat und den Geschäfts-Funnel
schließt: öffentlicher Quick-Check → ausführliche Bewertung (registriert) → Mandat.
Container-Safe ist Infrastruktur, die erst mit vielen aktiven Mandaten/Dateien zahlt,
eine R2/S3-Entscheidung voraussetzt und logisch mit dem Exposé-Builder zusammengehört
(der die Safe-Bilder konsumiert).

---

## Sprint 6 — Bewertungs-Quick-Check (öffentlich) — ✅ FERTIG

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

## Sprint 7 — Ausführliche Bewertung (Engine + Report) — ✅ FERTIG

**Ziel:** Geführte, mehrstufige Bewertung für registrierte Verkäufer/Leads — das
Fundament für das langfristige „ZDF → Bewertung"-Tool. Baut auf Sprint 6 auf.

**Datenmodell (Migration):** neue Tabelle `detailed_valuations(id, tenant_id, user_id,
project_id NULLABLE, status[draft|submitted|reviewed], inputs_json, results_json,
report_pdf_ref, reviewed_by, created_at, updated_at)` — tenant_id + RLS (fail closed).

**Fragebogen (Stepper, jederzeit als Entwurf speicherbar):**
1. **Finanzdaten:** GuV-Kernzeilen 3 Ist-Jahre + laufendes/Planjahr (Umsatz,
   Materialeinsatz, Personal, EBITDA, EBIT), Bereinigungen (marktübliches GF-Gehalt,
   Einmaleffekte, Mieten an Gesellschafter), Nettoverschuldung (Cash, Darlehen →
   Equity-Bridge light).
2. **Qualitative Faktoren (Scorecard):** Inhaberabhängigkeit, Kundenkonzentration
   (> x % Umsatz je Kunde — DUB weist das prominent aus), Team/zweite Ebene,
   Marktposition/Wettbewerb, Saisonalität/Zyklizität, Investitionsstau,
   Digitalisierung/Prozesse — je Faktor Zu-/Abschlag auf das Multiple.
3. **Substanz (optional):** Verkehrswerte Maschinen/Immobilien, Schulden →
   Substanzwert als Untergrenze.

**Engine (`server/valuation/detailedEngine.js`, reine Funktionen + Tests):**
- Multiplikatorverfahren: bereinigtes Ø-EBIT × (Branchen-/Größenklassen-Multiple aus
  Sprint 6 ± Scorecard-Anpassung, Größenabschlag < 1 Mio. € EBIT).
- Vereinfachtes Ertragswertverfahren (§199 BewG, Faktor 13,75) — Vergleichswert
  mit Steuer-Kontext-Hinweis.
- Ertragswert mit risikogerechtem Zins (Basiszins + Marktrisiko + individuelle
  Zuschläge aus Scorecard — KMUrechner-Logik).
- Kapitaldienstfähigkeits-Check (KMUrechner Modul 2): Ist der Korridor aus Käufersicht
  über ~6–8 Jahre finanzierbar? → dämpft überhöhte Preiserwartungen.
- Ergebnis: Wertkorridor + Methodenvergleich + Sensitivität (± 1 Multiple-Punkt).

**Output:** ausführlicher PDF-Report (mehrseitig, Phalanx-CI) mit Methodik,
Bereinigungsrechnung, Scorecard, Korridor, Kapitaldienst-Tabelle, Disclaimer
„indikativ, kein IDW-S1-Gutachten". **Admin-Review-Schritt** (status=reviewed,
Kommentar) vor Versand. Verknüpfbar mit Mandat (`project_id`) → Preisband im Exposé
referenzierbar (Sprint 9).

**Preis:** optional hinter dem bestehenden Billing-Flag (`BILLING_ENABLED`) als
kostenpflichtige Position — der öffentliche Quick-Check (Sprint 6) bleibt gratis.

**Aufwand:** 1–1,5 Sprints. Abhängigkeiten: Sprint 6 (Multiples-Tabelle, Lead-Übernahme).

---

## Sprint 8 — Container-Safe (Ordner-Uploads, Object Storage)

**Ziel:** Komplette Ordner, Bilder und beliebige Dateien je Mandat sicher ablegen —
getrennt von Teaser/IM/Datenraum, als Quelle für Exposé und gezielte Freigaben.

**Architektur:**
- **StorageProvider-Interface** (`server/providers/storage/`): `put/get/delete/list` —
  `LocalVolumeProvider` (Default, heutiges Verhalten) und `S3Provider` (S3-kompatibel:
  Cloudflare R2 / Hetzner / AWS; ENV `STORAGE_PROVIDER`, `S3_ENDPOINT/BUCKET/KEY/SECRET`).
  Empfehlung: **R2** (kein Egress-Entgelt, S3-API).
- **Migration:** `safe_items(id, tenant_id, project_id, parent_id NULLABLE → Ordnerbaum,
  name, is_folder, storage_key, size, mime, checksum_sha256, version, uploaded_by,
  created_at)` — eigene Zone, kein Dokumenten-Level.
- **Zugriff:** ausschließlich Admin + Projekt-Pfleger (`can_manage`). **Kein**
  Investor-Zugriff (härter als Datenraum). Jeder Zugriff ins `activity_log`.
- **Freigabe-Workflow:** „In Datenraum/IM/Teaser übernehmen" kopiert ein Safe-Item als
  `documents`-Eintrag (Kategorie wählbar) → ab dann greifen Gates/Wasserzeichen/Links.

**UI:** Datei-Explorer im Mandat (Ordnerbaum, Multi-Upload ganzer Ordner via
`webkitdirectory` + Drag&Drop, Bildgalerie, Fortschritt, Versionierung bei Kollision,
Papierkorb 30 Tage, Speicherverbrauch je Mandat/Tenant — Anknüpfung Billing-Staffel).

**Akzeptanz:** 500-Dateien-Ordner stabil · Safe für Investoren unter keiner URL
erreichbar (Gate-Test) · Checksummen verifiziert · Provider per ENV umschaltbar ·
Killswitch löscht Safe mit.

**Entscheidung vorab:** R2/S3-Konto anlegen — sonst Start auf Volume mit klarem Limit.

---

## Sprint 9 — Exposé-Builder (DUB-Standard, IM-Gate) — ✅ FERTIG

Umgesetzt: Migration `exposes` (RLS), Editor mit DUB-Keyfacts-Raster + ein-/
ausblendbaren Sektionen, Titelbild/Galerie aus dem Container-Safe, Autosave,
Anonymisierungs-Checkliste vor Publikation. Web-Exposé hinter dem IM-Gate
(erst NDA, dann Exposé), PDF-Export in Phalanx-CI mit Empfänger-Wasserzeichen,
automatische Übernahme des geprüften Bewertungskorridors (Sprint 7) als
Kaufpreisvorstellung. Offen als Folgeausbau: automatische Ableitung der
öffentlichen Teaser-Karte aus markierten Exposé-Feldern.

### Ursprüngliche Planung

**Ziel:** Professionelle Exposés strukturell nach DUB, inhaltlich nach KERN/HWK — als
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
im_granted — „erst NDA, dann Exposé") · PDF-Export mit Empfänger-Wasserzeichen ·
Kurzprofil-Ableitung speist Teaser-Karte + öffentliche Detailseite (Anonymisierungs-
Checkliste vor Publikation).

**Aufwand:** 1,5 Sprints. Abhängigkeiten: Sprint 8 (Bilder), optional Sprint 7 (Korridor).

---

## Sprint 10 — Käufer-UX: Deal-Liste, Suchprofile, Match-Benachrichtigungen (teilweise ✅)

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

**Noch offen (Refinement):**
- Spaltenauswahl/Sortierung & Tags/Aufgaben je Deal (Dealum-CRM-Feeling).
- **Digest**: täglicher/wöchentlicher Sammel-Versand (Scheduler) für Frequenz
  „täglich"/„wöchentlich".
- Feinere Kriterien (Umsatz-/EBITDA-Band, Ticketgröße) in Suchprofilen.

---

## Sprint 11 — In-App-Chat & Kontakte (Netzwerk)

- Direktnachrichten zwischen berechtigten Kontakten (nach NDA/Freigabe); Kontakte
  gegenseitig hinzufügen/annehmen (Netzwerk wie Dealsuite).
- Tabellen `connections` (requester/addressee/status) und `messages` (thread_id,
  sender, body, read_at); RLS; Benachrichtigung per Branded-Mail bei neuer Nachricht.
- Diskretionssteuerung: sichtbar nur, was der Nutzer teilt; Admin-Moderation.

---

## Querschnitt-Ergänzung — Prozess-Benachrichtigungen

Jeder Funnel-Schritt löst eine **Branded-Mail** (Phalanx-Header + Impressum-Footer,
werblicher Ton) aus: Registrierung, Freigabe, NDA angefordert/signiert/freigegeben,
IM/Datenraum-Freigabe, neue Unterlagen, Q&A-Frage/-Antwort, LOI. Ziel: der Kunde ist
über **jeden** Schritt informiert. (Basis bereits gelegt: `sendProcessUpdateEmail`.)

---

## Sprint 12 — Ausführliche Bewertung 2.0 (datengetrieben) — Ausbaustufe

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

## Querschnitt (in allen Sprints)

- Neue Tabellen immer mit `tenant_id` + RLS-Policy (Sprint-5-Muster, fail closed).
- Alle Zugriffe/Downloads ins `activity_log` (append-only).
- Externe Dienste (Storage/S3, AV-Scan, ggf. Marktdaten) als austauschbare
  **Provider-Stubs** mit dokumentierter Anbindung — wie Signature/Payment.
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
