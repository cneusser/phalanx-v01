# CapitalMatch — Roadmap Sprint 6–9: Bewertung, Container-Safe, Exposé

Stand: Juli 2026 · Analysebasis: kmurechner.de, KERN-Unternehmenswertrechner,
HWK-Exposé-Leitfaden, DUB-Exposé (Beispiel „Antriebstechnik", DUB-ID 17680)

---

## Analyse der Vorbilder

**KMUrechner (gemeinnützig, BMWK-gefördert).** Vier Module: (1) detaillierte
Ertragswertberechnung, (2) individuelle Kapitaldienstfähigkeit, (3) individuelle
Preisvorstellungen, (4) vergleichende Wert-Multiples. Kostenlose Basisversion +
Vollversion, Ergebnis als personalisierbarer PDF-Abschlussbericht. Über 1.000
Basisbewertungen/Monat — das Format funktioniert als Reichweiten-Instrument.

**KERN-Rechner.** Positionierung als Lead-Magnet: „Gratis und 100 % vertraulich"
→ Rechner → Report → Beratungsgespräch. Methodisch sauber eingeordnet:
Faustformel (Ø-EBIT der letzten 3 Jahre × Branchen-Multiple 3,5–7),
Ertragswertverfahren nach IDW S 1, vereinfachtes Ertragswertverfahren
(§ 199 ff. BewG, Kapitalisierungsfaktor 13,75), Substanzwert (Mindestpreis),
AWH-Standard für Handwerk, DCF für größere Unternehmen. Kernbotschaft überall:
**Wert ≠ Marktpreis** — der Rechner liefert einen Korridor, das Gespräch den Preis.

**DUB-Exposé (inhaltliches Vorbild).** Aufbau: (a) Kopf mit 4 Icon-Keyfacts
(operatives Ergebnis, Region, abzugebender Anteil, Rechtsform) + Kontakt-CTA,
(b) Stammdaten-Tabelle (Land, Region, Umsatzband, operatives Ergebnis,
Gesellschaftergehalt, Mitarbeiterzahl, Standorte, Gründungsjahr, Rechtsform,
Anteil, Preisband), (c) Fließtext „Beschreibung des Verkaufsangebots",
(d) Keyfacts-Block (ID, Branchen, Beteiligungsart, „Exposé liegt vor",
Kaufpreiszahlung, **Anforderungen an den Käufer**, Kommentare zu Preis /
Umsatz & Gewinn / Grundstücke, Verkaufsgrund, Verfügbarkeit der
Geschäftsführung), (e) „Wie geht es weiter"-CTA-Block. Alle Zahlen als
**Bänder**, konsequent anonymisiert.

**HWK/KERN-Exposé (Gliederung).** Standard-Sektionen eines Firmen-Exposés /
Information Memorandums: Deckblatt (anonym) · Executive Summary · Unternehmen
& Historie · Geschäftsmodell/Produkte · Markt & Wettbewerb · Kunden & Vertrieb
· Organisation & Mitarbeiter (Inhaberabhängigkeit!) · Finanzen (GuV/Bilanz/
Cashflow, 3 Jahre) · Transaktion (Anteil, Preis, Grund, Zeitplan) · Anlagen
(Fotos, Zertifikate). Zweistufig: **anonymes Kurzprofil zur Erstansprache →
Exposé erst nach NDA**. Das deckt sich exakt mit unserem Gate-Modell.

**Fit mit CapitalMatch.** Alles Nötige ist vorhanden: NACE-Branchen (Sprint 5.1),
Zustandsautomat/Gates, Datenraum mit Rechten, PDF-Erzeugung (pdfkit), Billing-
und Provider-Muster, Mail-Strecke, RLS. Die vier Sprints bauen aufeinander auf:
Der **Quick-Check** (6) erzeugt Leads und Bewertungs-Rohdaten, der
**Container-Safe** (7) liefert Dateien/Bilder, der **Exposé-Builder** (8) macht
daraus Teaser/IM, die **ausführliche Bewertung** (9) veredelt die Finanzdaten
aus 6 zum bezahlbaren Produkt.

---

## SPRINT 6 — Bewertungs-Quick-Check als Lead-Magnet

Ziel: Öffentlicher Unternehmenswert-Rechner à la KERN/KMUrechner, der
Verkäufer-Leads erzeugt und in den Mandats-Funnel führt.

- Öffentliche Seite `/unternehmenswert` (ohne Login): mehrstufiger Wizard
  1. Branche (NACE-Auswahl, vorhandene Konstanten) + Rechtsform + Gründungsjahr
  2. Umsatz & EBIT der letzten 3 Jahre (+ optional Plan-Jahr)
  3. Bereinigungen: kalkulatorisches Geschäftsführergehalt, Einmaleffekte
  4. Qualitätsfaktoren (je −/0/+): Inhaberabhängigkeit, Kundenkonzentration,
     wiederkehrende Umsätze, Investitionsstau, Team/zweite Ebene
- Rechen-Engine `server/valuation/valuationEngine.js` (reine Funktion, testbar):
  - **Multiplikatorverfahren**: bereinigtes Ø-EBIT × Branchen-Multiple;
    Qualitätsfaktoren verschieben innerhalb des Multiple-Bandes
  - **Vereinfachtes Ertragswertverfahren** (§ 199 BewG, Faktor 13,75) als
    Vergleichswert mit Einordnung („steuerlicher Wert, meist zu hoch")
  - **Substanzwert** (optional, Vermögen − Schulden) als Mindestwert
  - Ergebnis als **Korridor** (konservativ / Basis / optimistisch) + klarer
    Disclaimer „Wert ≠ Marktpreis, indikativ, keine Rechts-/Steuerberatung"
- Tabelle `valuation_multiples(nace_section, ebit_multiple_min/avg/max,
  revenue_multiple_min/max, source, valid_from)` — **eigene, von Phalanx
  gepflegte Werte** (DUB/FINANCE-Multiples nur als Recherchequelle, nicht
  kopieren — Lizenz!). Admin-CRUD zum Pflegen.
- Lead-Capture: Ergebnis on-screen als Korridor-Grafik; **PDF-Report in
  Phalanx-CI gegen E-Mail + DSGVO-Consent** (Tabelle `valuations`: inputs_json,
  results_json, Lead-E-Mail bzw. user_id, Report-PDF). Admin-Benachrichtigung,
  Anzeige im Admin („Bewertungs-Leads"), CTA im Report: „Ausführliche Bewertung
  anfragen" + „Mandat starten".
- Querschnitt: Rate-Limit für den öffentlichen Rechner, activity_log,
  Feature-Flag `VALUATION_ENABLED`.

Liefert: Migration (valuation_multiples, valuations), Engine + Unit-Tests,
Wizard-UI, Report-PDF, Admin-Leads-Tab, README/TESTPLAN.

---

## SPRINT 7 — Container-Safe & Datenraum 2.0 (Ordner, Bilder, alle Dateitypen)

Ziel: Weg vom statischen Einzel-Upload — ganze Ordner, Bilder und beliebige
Dateien in einem geschützten „Safe" je Mandat, strikt getrennt von Teaser/IM/
Datenraum, mit gezielter Veröffentlichung.

- Neue Dokument-Kategorie **`safe`** (Container-Safe): NUR Admin, Ersteller und
  zugeordnete Projektmitglieder — **nie** für Investoren sichtbar, kein Gate
  öffnet ihn. Quellenlager für alles (Jahresabschlüsse, Fotos, Verträge …).
- Tabelle `folders(id, tenant_id, project_id, parent_id, name, category)` —
  echte Ordnerbäume je Container (safe/dataroom); `documents.folder_id`.
- Upload-UX: Mehrfach-Upload + **Ordner-Upload** (webkitdirectory) + Drag&Drop;
  **ZIP-Upload mit serverseitiger Extraktion** in die Ordnerstruktur; alle
  Dateitypen im Safe erlaubt (Blocklist statt Whitelist: keine ausführbaren
  Dateien), Bilder mit Thumbnail-Vorschau (Galerie).
- **Veröffentlichen-Workflow**: Datei im Safe auswählen → „Freigeben als …"
  (Teaser / IM / Datenraum[+Ordner]) → kopiert Metadaten + setzt Kategorie;
  Safe-Original bleibt unangetastet (Versionsstand dokumentiert).
- `StorageProvider`-Interface (analog Signature/Payment): `local` (Railway-
  Volume, heute) und dokumentierte S3-kompatible Anbindung (Hetzner/Backblaze)
  für später — Volume-Füllstand im Admin-Dashboard anzeigen. Optionaler
  AV-Scan-Hook als Stub (dokumentierte Anbindung).
- Bestehende Gates/Wasserzeichen/signierte Links gelten unverändert für
  veröffentlichte Dateien.

Liefert: Migration (folders, documents.folder_id, category 'safe'),
Storage-Interface, Upload-/Explorer-UI (Baum, Galerie), Publish-Flow,
Volumen-KPI, Tests (Safe nie über Investor-APIs erreichbar).

---

## SPRINT 8 — Exposé-Builder (inhaltlich à la DUB/KERN/HWK)

Ziel: Aus strukturierten Daten + Safe-Bildern professionelle Exposés erzeugen —
als Web-Ansicht (Tab) und PDF in Phalanx-CI, zweistufig: anonymer Teaser
(öffentlich) und Voll-Exposé/IM (ab NDA).

- Datenmodell `expose_data` je Mandat (alle Felder optional, Editor zeigt
  Vollständigkeitsgrad): Stammdaten nach DUB-Vorbild (Land, Bundesland,
  Umsatzband, operatives Ergebnis-Band, Gesellschaftergehalt [„auf Anfrage"],
  Mitarbeiter, Standorte, Gründungsjahr, Rechtsform, abzugebender Anteil,
  Preisband + Kommentar, Beteiligungsart, Kaufpreiszahlung), Textsektionen
  (Beschreibung, Historie & Meilensteine, Produkte/Leistungen, Markt &
  Wettbewerb, Kunden & Vertrieb, Team & Organisation, Immobilien/Anlagen,
  Kommentar Umsatz & Gewinn, **Anforderungen an den Käufer**, Verkaufsgrund,
  Verfügbarkeit der Geschäftsführung), Bildauswahl aus dem Safe (anonymisierte
  fürs Teaser-Level markieren).
- **Zwei Render-Stufen** aus einem Datensatz: (a) Teaser-Exposé — anonymisiert,
  nur Bänder, öffentliche Bilder, ohne Login; (b) Voll-Exposé/IM — alle
  Sektionen, echte Zahlen, hinter NDA-Gate (`im`/`nda_signed`), mit
  Wasserzeichen-Overlay (Nutzer + Datum, wie Datenraum).
- **Exposé-Editor** (Admin + zugeordnete Verkäufer, nutzt Marktplatz-Pflege aus
  Sprint 5.1): geführte Eingabe je Sektion, Live-Vorschau, Bild-Referenzen aus
  dem Container-Safe (Sprint 7).
- **Exposé-Templates** je Mandatstyp (M&A / Fundraising) — konfigurierbar in DB,
  Mechanik wie NDA-Vorlagen (Sprint 3).
- Ausgabe: (a) **Web-Exposé** als eigener Tab auf der Detailseite (gate-
  geschützt), (b) **PDF-Export** in Phalanx-CI (bestehende pdfkit-Mechanik).
- Optional: Bewertungs-Korridor aus Sprint 6/9 als Sektion einbettbar.

Liefert: Migration (expose_data, expose_templates), Editor-UI, Web-Renderer +
PDF-Export, Gate-Anbindung (Teaser frei / Exposé ab NDA), Tests, TESTPLAN.

---

## SPRINT 9 — Ausführliche Bewertung 2.0 (datengetrieben, indikativ)

Ziel: Langfrist-Wunsch — aus Zahlen/Daten/Fakten automatisiert eine belastbarere
indikative Bewertung, angereichert mit Marktdaten; für mandatierte Nutzer, optional
kostenpflichtig.

- Mehrjahres-Financials strukturiert erfassen (Import aus Excel/DATEV-Export;
  nutzt xlsx-Kompetenz), automatische **Bereinigungen** (kalk. GF-Gehalt,
  Einmaleffekte, Betriebsnotwendigkeit von Vermögen).
- Erweiterte Multiples: Umsatz- UND EBIT/EBITDA-Multiples je NACE-Untergruppe,
  Größen-/Wachstums-/Risiko-Adjustierung (Scorecard-Faktoren wie in der
  bestehenden ika-/Nexora-Bewertung).
- **Ertragswert (regulär)** mit Planjahren + Kapitalisierungszins (Basiszins +
  Risikozuschlag), **Kapitaldienstfähigkeit** aus Käufersicht (KMUrechner-Modul 2),
  optionales **DCF-Modul**, **Sensitivitäts-/Szenarioanalyse** (Best/Base/Worst).
- Benchmarking gegen anonyme Plattform-Daten (sobald genug Mandate vorhanden).
- Versionierte Bewertungen je Deal, Übernahme in Exposé (Sprint 8) & CRM;
  ausführlicher PDF-Bericht. Optional hinter Billing-Flag als kostenpflichtige
  Position.
- Verifikation: Referenz-Fälle, Sensitivitäts-Bandbreiten, Reproduzierbarkeit.

---

## Querschnitt (in allen Sprints)

- Neue Tabellen immer mit `tenant_id` + RLS-Policy (Sprint-5-Muster, fail closed).
- Alle Zugriffe/Downloads ins `activity_log` (append-only).
- Externe Dienste (Storage/S3, AV-Scan, ggf. Marktdaten) als austauschbare
  **Provider-Stubs** mit dokumentierter Anbindung — wie Signature/Payment.
- Haftung: Bewertungen durchgängig als **indikativ** deklariert (kein IDW-S1/S6-
  Gutachten). Getrennt von der bestehenden IDW-S6-Sanierungskompetenz.
- Nach jedem Sprint: geänderte Dateien, Commit-Message, GitHub-Desktop-Push-
  Anleitung, Railway-Hinweise (Env/Volume), TESTPLAN-Ergänzung.

---

## Getroffene Entscheidungen (04.07.2026)

1. **Schnellrechner:** öffentlich & anonym, ohne Login (maximale Reichweite);
   E-Mail nur optional für den PDF-Versand.
2. **Reihenfolge:** Sprint 6 (Bewertungsrechner) zuerst, dann 7 → 8 → 9.
3. **Branchen-Multiples:** eigene, von Phalanx gepflegte indikative Startwerte
   (klar als „indikativ" deklariert; keine Fremd-Multiples kopieren).
4. **Preis:** Schnellrechner gratis, ausführliche Bewertung (Sprint 9)
   kostenpflichtig hinter dem bestehenden Billing-Flag.
