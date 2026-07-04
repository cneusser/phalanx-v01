# CapitalMatch — Roadmap Sprint 6–9: Bewertung, Container-Safe, Exposé-Builder

Stand: Juli 2026 · Analysebasis: kmurechner.de, KERN-Unternehmenswertrechner &
Firmen-Exposé-Leitfaden, DUB-Exposé-Struktur (Beispiel-ID 17680), HWK-Leitfaden.

---

## Analyse-Ergebnis (Kurzfassung)

**Bewertung als Lead-Magnet (Referenz KMUrechner/KERN):**
Beide Referenzen nutzen dieselbe Trichter-Logik: kostenloser Schnellrechner →
Wertkorridor statt Punktwert → Hinweis „Wert ≠ Marktpreis" → Kontakt zum Berater.
Der KMUrechner ist modular aufgebaut (1. Ertragswert, 2. Kapitaldienstfähigkeit,
3. Preisvorstellungen, 4. Vergleichs-Multiples) und liefert einen PDF-Abschluss-
bericht. KERN arbeitet mit der Faustformel **Ø-EBIT (3 Jahre) × Branchen-Multiple
(3,5–7)** und verweist auf zwei Multiple-Quellen: FINANCE-Multiples (Großunter-
nehmen) und **DUB-KMU-Multiples** (< 20 Mio. € Umsatz — unsere Zielgruppe).
Methodenkanon für die ausführliche Stufe: Multiplikatorverfahren, vereinfachtes
Ertragswertverfahren (§ 199 ff. BewG, Kapitalisierungsfaktor 13,75),
Ertragswertverfahren (IDW-S1-Logik mit risikogerechtem Zins), Substanzwert als
Untergrenze, AWH-Standard für Handwerk, DCF nur für stabile größere Firmen.

**Konsequenz für CapitalMatch:** Drei Ausbaustufen — (A) öffentlicher
Schnellrechner als Lead-Magnet, (B) ausführliche geführte Bewertung mit
Methoden-Mix und Report, (C) langfristig datengetriebenes Tool (ZDF → indikative
Bewertung), das auf der Engine aus (B) aufsetzt. Wichtig: immer als **indikative
Bewertung** deklarieren (kein IDW-S1-Gutachten), Korridor statt Punktwert.

**Exposé (Referenz DUB/KERN/HWK):**
Das DUB-Exposé folgt einem klaren Raster: **Keyfacts-Grid** (Land, Region,
Umsatzband, operatives Ergebnis, Gesellschaftergehalt, Mitarbeiter, Standorte,
Gründungsjahr, Rechtsform, abzugebender Anteil, Preisband) + Fließtext-
Beschreibung + strukturierte Zusatzfelder (Branchen, Beteiligungsart,
Kaufpreiszahlung, Käuferanforderungen, Kommentare zu Preis/Umsatz/Immobilien,
Verkaufsgrund, GF-Verfügbarkeit). KERN ergänzt: Historie, Geschäftsmodell,
Mitarbeiter/Organisation, Finanzübersicht (GuV/Bilanz/Cashflow gekürzt),
Wettbewerbsanalyse, Risiken, Management — und den Prozessgrundsatz **„erst NDA,
dann Exposé; vorab anonymes Kurzprofil"** (= exakt unser bestehendes
Teaser→NDA→IM-Gate-Modell; das Exposé ist unser IM).

**Container-Safe:** Bisher sind Uploads einzeln, an ein Projekt gebunden und in
drei Kategorien (Teaser/IM/Datenraum). Es fehlt eine Roh-Ablage („Safe") für
komplette Ordnerstrukturen, Bilder und beliebige Dateien — getrennt gesichert,
als Quelle für Exposé-Bilder und als Vorstufe zur gezielten Freigabe in den
Datenraum. Achtung Infrastruktur: Das Railway-Volume ist begrenzt und nicht für
große Datenmengen gedacht → **StorageProvider-Interface** mit S3-kompatiblem
Object Storage (z. B. Cloudflare R2, Hetzner) als Zielarchitektur, Volume als
Fallback.

---

## Sprint 6 — Schnellbewertung als Lead-Magnet (öffentlich)

**Ziel:** Möglichst viele Interessenten/Verkäufer ansprechen: kostenloser
Unternehmenswert-Rechner à la KERN-Faustformel, Ergebnis als Korridor,
Lead-Erfassung, PDF-Kurzreport, CTA „Ausführliche Bewertung anfordern".

**Datenmodell (Migration 010):**
- `valuation_multiples(id, tenant_id, industry_code, label, ebit_multiple_min/-max, revenue_multiple_min/-max, valid_from)` — konfigurierbare Multiple-Bänder je NACE-Gruppe (Startwerte konservativ nach KERN-Spanne 3,5–7; später DUB-KMU-Multiples lizenzieren/pflegen)
- `valuation_leads(id, tenant_id, salutation, name, email, phone, company, industry_code, revenue_y1..y3, ebit_y1..y3, gf_gehalt, adjusted_ebit, result_low/mid/high, wants_full_valuation, privacy_consent_at, created_at)`

**Ablauf (öffentliche Seite `/unternehmenswert`):**
1. Branche (NACE-Auswahl, vorhandene Konstanten), Umsatz + EBIT der letzten 3 Jahre, GF-Gehalt-Bereinigung (kalkulatorisch, KERN-Kriterium Nr. 1), Rechtsform-Hinweis (Einzelunternehmen/Personengesellschaft → Unternehmerlohn abziehen)
2. Berechnung: Ø-bereinigtes EBIT × Multiple-Band der Branche → Korridor (niedrig/mittel/hoch); Plausibilisierung gegen Umsatz-Multiple; Warnhinweis „Wert ≠ Marktpreis"
3. Ergebnis erst nach Lead-Formular (E-Mail Pflicht + DSGVO-Einwilligung, Anrede/Name; Double-Opt-in-fähig)
4. PDF-Kurzreport (2–3 Seiten, CI): Eingaben, Korridor, Methodik-Erklärung, Disclaimer, CTA Phalanx-Kontakt + „ausführliche Bewertung"
5. Admin: neuer Tab „Bewertungs-Leads" (Liste, Status neu/kontaktiert, CSV-Export), Mail-Benachrichtigung an NOTIFICATION_EMAIL je Lead

**Akzeptanzkriterien:** Rechner ohne Login nutzbar · 0/negative EBITs sauber behandelt (Hinweis statt Korridor) · Lead ohne Consent unmöglich · Report reproduzierbar aus Lead-Datensatz · Multiples ohne Deploy in DB änderbar.

**Aufwand:** ~1 Sprint. Abhängigkeiten: keine.

---

## Sprint 7 — Ausführliche Bewertung (Engine + Report)

**Ziel:** Geführte, mehrstufige Bewertung für registrierte Verkäufer/Leads —
Fundament für das langfristige „ZDF→Bewertung"-Tool.

**Datenmodell (Migration 011):** `valuations(id, tenant_id, user_id, project_id NULLABLE, status[draft|submitted|reviewed], inputs_json, results_json, report_pdf_ref, created_at, reviewed_by)`

**Fragebogen (Stepper, speicherbar als Entwurf):**
1. **Finanzdaten:** GuV-Kernzeilen 3 Ist-Jahre + laufendes/Planjahr (Umsatz, Materialeinsatz, Personal, EBITDA, EBIT), Bereinigungen (GF-Gehalt marktüblich, Einmaleffekte, Mieten an Gesellschafter), Nettoverschuldung (Cash, Darlehen — Equity-Bridge light)
2. **Qualitative Faktoren (Scorecard):** Inhaberabhängigkeit, Kundenkonzentration (> x % Umsatz je Kunde — DUB weist das prominent aus), Team/zweite Ebene, Marktposition/Wettbewerb, Saisonalität/Zyklizität, Investitionsstau, Digitalisierung/Prozesse — je Faktor Zu-/Abschlag auf das Multiple
3. **Substanz (optional):** Verkehrswerte Maschinen/Immobilien, Schulden → Substanzwert als Untergrenze

**Engine (server/utils/valuationEngine.js, reine Funktionen + Tests):**
- Multiplikatorverfahren: bereinigtes Ø-EBIT × (Basis-Multiple ± Scorecard-Anpassung, Größenabschlag < 1 Mio. € EBIT)
- Vereinfachtes Ertragswertverfahren (§ 199 BewG, Faktor 13,75) — als Vergleichswert mit Steuer-Kontext-Hinweis
- Ertragswert mit risikogerechtem Zins (Basiszins + Marktrisiko + individuelle Zuschläge aus Scorecard — KMUrechner-Logik)
- Kapitaldienstfähigkeits-Check (KMUrechner Modul 2): Ist der Korridor aus Käufersicht über ~6–8 Jahre finanzierbar? → dämpft unrealistische Erwartungen (DIHK: 43 % überhöhte Preisforderungen)
- Ergebnis: Wertkorridor + Methodenvergleich + Sensitivität (± 1 Multiple-Punkt)

**Output:** ausführlicher PDF-Report (10–15 Seiten, CI) mit Methodik, Bereinigungsrechnung, Scorecard, Korridor, Kapitaldienst-Tabelle, Disclaimer „indikativ, kein IDW-S1-Gutachten". Admin-Review-Schritt (status=reviewed, Kommentar) vor Versand. Verknüpfbar mit Mandat (`project_id`) → Preisband im Exposé referenzierbar.

**Aufwand:** 1–1,5 Sprints. Abhängigkeiten: Sprint 6 (Multiples-Tabelle, Lead-Übernahme).

---

## Sprint 8 — Container-Safe (Ordner-Uploads, Object Storage)

**Ziel:** Komplette Ordner, Bilder und beliebige Dateien je Mandat sicher
ablegen — getrennt von Teaser/IM/Datenraum, als Quelle für Exposé und gezielte
Datenraum-Freigaben.

**Architektur:**
- **StorageProvider-Interface** (`server/providers/storage/`): `put(key, stream)`, `get(key)`, `delete(key)`, `list(prefix)` — Implementierungen: `LocalVolumeProvider` (Default, heutiges Verhalten) und `S3Provider` (S3-kompatibel: Cloudflare R2/Hetzner/AWS; ENV: STORAGE_PROVIDER, S3_ENDPOINT/BUCKET/KEY/SECRET). Empfehlung: R2 (kein Egress-Entgelt, S3-API)
- **Migration 012:** `safe_items(id, tenant_id, project_id, parent_id NULLABLE → Ordnerbaum, name, is_folder, storage_key, size, mime, checksum_sha256, version, uploaded_by, created_at)`; Kategorie-Erweiterung `documents.category` um `'safe'` entfällt — Safe ist eine **eigene Tabelle/Zone**, kein Dokumenten-Level
- **Zugriff:** ausschließlich Admin + Projekt-Pfleger (can_manage). KEIN Investor-Zugriff — bewusst härter als Datenraum. Jeder Zugriff im activity_log
- **Freigabe-Workflow:** Aktion „In Datenraum/IM/Teaser übernehmen" kopiert ein Safe-Item als `documents`-Eintrag (Kategorie wählbar) → ab dann greifen die bestehenden Gates/Wasserzeichen/Links. Bilder: „Als Exposé-Bild markieren" (Sprint 9)

**UI:** Datei-Explorer im Mandat (Pflege-Ansicht): Ordnerbaum, Multi-Upload ganzer Ordner (webkitdirectory + Drag&Drop), Bildvorschau/Galerie, Fortschrittsanzeige, Versionierung bei Namenskollision, Papierkorb (30 Tage), Speicherverbrauch je Mandat/Tenant (Anknüpfung Billing-„Datenraum-Staffel" aus Sprint 5).

**Akzeptanzkriterien:** 500-Dateien-Ordner-Upload stabil · Safe-Inhalte für Investoren unter keiner URL erreichbar (Gate-Test) · Checksummen verifiziert · Provider per ENV umschaltbar ohne Codeänderung · Killswitch löscht Safe mit.

**Aufwand:** 1–1,5 Sprints. Entscheidung vorab nötig: R2/S3-Konto (sonst Start auf Volume mit klarem Limit-Hinweis).

---

## Sprint 9 — Exposé-Builder (DUB-Standard, IM-Gate)

**Ziel:** Professionelle Exposés strukturell nach DUB, inhaltlich nach
KERN/HWK — als gated Web-Exposé (ersetzt/erweitert die Detail-Tabs) und
PDF-Export in CI; anonymes Kurzprofil (Teaser) wird daraus abgeleitet.

**Datenmodell (Migration 013):** `exposes(id, tenant_id, project_id UNIQUE, status[draft|published], keyfacts_json, sections_json, hero_image (safe_item), gallery_json, updated_by, published_at)`

**Struktur (Vorlage, Sektionen ein-/ausblendbar):**
1. **Keyfacts-Grid** (DUB-Raster): Land, Region, Umsatzband, operatives Ergebnis, Gesellschaftergehalt (auf Anfrage möglich), Mitarbeiter, Standorte, Gründungsjahr, Rechtsform, abzugebender Anteil, Preisband/„auf Anfrage", Branchen (NACE, mehrfach), Beteiligungsart, Kaufpreismodalitäten
2. Unternehmen & Historie · 3. Leistungsspektrum/Geschäftsmodell · 4. Markt & Wettbewerb · 5. Organisation & Mitarbeiter (inkl. GF-Verfügbarkeit nach Übergabe) · 6. Finanzen (Kurzübersicht 3 Jahre; optional Korridor aus Sprint-7-Bewertung) · 7. Stärken & Entwicklungspotenziale (SWOT-light; DUB-Stil „Kommentar zu Umsatz/Gewinn") · 8. Immobilien/Anlagen (gemietet/Eigentum) · 9. Käuferanforderungen & Verkaufsgrund · 10. Prozess & nächste Schritte
3. **Bilder** aus dem Container-Safe (Galerie, anonymisierungs-geprüft durch Pfleger)

**Editor & Ausspielung:** Sektionseditor in der Mandats-Pflege (Admin + Verkäufer/can_manage, Autosave, Vorschau) · Web-Exposé hinter dem bestehenden **IM-Gate** (nda_signed/im_granted — „erst NDA, dann Exposé") · PDF-Export mit Wasserzeichen des Empfängers (Sprint-4-Mechanik) · Kurzprofil-Ableitung: markierte Felder/Kurztexte speisen automatisch Teaser-Karte + öffentliche Detailseite (Anonymisierungs-Checkliste vor Publikation).

**Aufwand:** 1,5 Sprints. Abhängigkeiten: Sprint 8 (Bilder), optional Sprint 7 (Finanz-/Korridor-Sektion).

---

## Empfohlene Reihenfolge & offene Entscheidungen

**Reihenfolge:** 6 → 8 → 9 → 7. Begründung: Der Schnellrechner (6) bringt sofort
Leads und ist klein. Safe (8) vor Exposé (9), weil der Builder die Bilder/Quellen
braucht. Die ausführliche Bewertungs-Engine (7) ist fachlich am tiefsten und
profitiert davon, dass bis dahin echte Leads aus (6) die Anforderungen schärfen.
Alternativ 6 → 7 zuerst, wenn Bewertungs-Leads das primäre Geschäftsziel sind.

**Vom Betreiber zu entscheiden:**
1. Multiple-Quellen: Start mit konservativen Eigenwerten je NACE-Gruppe oder DUB-KMU-Multiples lizenzieren?
2. Object Storage: Cloudflare-R2-Konto anlegen (Empfehlung) oder Start auf Railway-Volume?
3. Schnellrechner-Ergebnis: sofort anzeigen (mehr Nutzer) oder erst nach Lead-Formular (mehr Leads — Empfehlung: Korridor grob sofort, PDF + Detail nur gegen Lead)?
4. Ausführliche Bewertung: Selbstbedienung mit Auto-Report oder immer mit Admin-Review vor Zustellung (Empfehlung: Review — Qualitätssicherung + Beratungsanlass)?

**Rechtliche Leitplanken (alle Sprints):** Jede Bewertung als „indikative
Werteinschätzung, kein Gutachten nach IDW S1" kennzeichnen · Disclaimer im
Report · Lead-Verarbeitung nur mit dokumentierter Einwilligung (Mechanik aus
Sprint 5.1 vorhanden) · Exposé-Publikation erst nach Anonymisierungs-Check.
