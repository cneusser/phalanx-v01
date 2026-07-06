# Changelog — CapitalMatch (Phalanx GmbH)

Wird bei jeder Release mitgeführt. Die In-App-Ansicht (Admin → „Changelog") wird
über Seed-Migrationen gespeist; diese Datei ist die kuratierte Gesamtübersicht.

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
