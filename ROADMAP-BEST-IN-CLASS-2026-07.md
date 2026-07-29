# CapitalMatch · Roadmap zum Best-in-Class M&A-Marktplatz DACH

Stand: 26.07.2026 · Version der Plattform: v0.335
Ziel: der beste Marktplatz der DACH-Region für Unternehmensverkauf, Kapitalsuche
und Nachfolge, zuerst für Phalanx, dann als Mehrmandanten-Produkt für Dritte.

Dieses Dokument konsolidiert den Umsetzungsstand und definiert den Weg nach vorn.
Es ergänzt `ROADMAP.md` (Detailhistorie Sprint 6 bis 28), `KONSOLIDIERUNG-2026-07.md`
(Audit vom Juli 2026) und den Changelog. Verbindlich ist die priorisierte
Sprint-Sequenz in Abschnitt 12.

---

## 1. Vision in einem Satz

Eine sichere, DSGVO-feste Plattform, die den kompletten Weg einer Transaktion
begleitet (Unternehmensverkauf, Finanzierung, Nachfolge), mit einem schlanken
aber wirksamen CRM, rollengerechten Dashboards, einer bezahlten KI-Funktion
(Matchy powered by Phalanx) und einem Datensafe auf dem Niveau von Drooms oder
ideals, anschlussfähig an das künftige PhalanxOS.

---

## 2. Drei Marktplätze unter einem Dach

1. Unternehmensverkauf (M&A Sell-Side): Teaser, NDA, IM, Datenraum, Q&A, LOI,
   Bieterverfahren, Signing, Closing.
2. Kapitalsuche (Fundraising): Pitch, Freigabe statt NDA, Datenraum, Runden.
3. Nachfolge und Personal: Nachfolge-Netzwerk mit Profil, Matching, Events,
   Kandidat-zu-Mandat-Zuordnung und bezahlter Freischaltung.

Alle drei teilen sich CRM, Datensafe, Benachrichtigungen, Bewertung, Dashboards
und künftig Matchy. Das ist der Kern der Mehrmandanten-Strategie: ein Baukasten,
den Phalanx zuerst selbst nutzt und dann anderen Beratern zugänglich macht.

---

## 3. Was heute schon steht (Konsolidierung)

Fundament und Betrieb:
- Mehrmandanten-Architektur mit erzwungener Row-Level-Security (fail-closed),
  fünf Rollen mit Rechte-Matrix, 2FA, append-only Audit-Log.
- Prüfschleifen: `npm run check` (Texte, Tests), `npm run check:full` (plus Build).
- Sicherheits-Härtung begonnen (v0.319): server/.env aus dem Repo entfernt,
  Start-Check gegen schwache JWT-Schlüssel.

Marktplatz und M&A-Prozess:
- Öffentlicher Marktplatz mit anonymisierten Teasern, Filter, Karten- und
  Tabellenansicht, Umsatz- und Branchenklassen (NACE).
- Prozesskette Teaser, NDA mit Online-Signatur, IM/Exposé mit Gate, Datenraum,
  Q&A, Deal-Funnel bis Closing.
- Bewertung: Quick-Check und Detailbewertung mit DCF und Benchmarks.

Datensafe (heutiger Stand):
- Ordnerbaum, versionierte Uploads, SHA-256-Prüfsumme, Papierkorb und Restore,
  Speicher-Quota, Veröffentlichung in Dokumente mit Zugriffsstufen.
- Dynamisches Wasserzeichen auf den Empfänger, signierte ablaufende Links,
  Zugriffe im append-only Log.

CRM:
- Firmen und Kontakte mit Positions-Historie, Dubletten und Merge, Kampagnen,
  DSGVO-Einladung mit Double-Opt-in, Lead-Ingest, Import und Export, Aufgaben,
  Mailvorlagen, Ausgangsbuch, Selbstpflege-Portal.
- Einladungs- und Onboarding-Strecke (E-Mail-Paste oder Excel) mit reichem Profil.

Nachfolge-Netzwerk (Schritt 1 vollständig):
- Registrierungs-Weiche Nachfolge gegen professionellen Käufer, Nachfolge-Profil
  nach dem Fragebogen CH-NF-03, öffentliche Info-Seite.
- Matching Profil gegen Mandat (Branche, Region, Umsatz) mit Begründung, plus
  automatische Benachrichtigung bei passenden neuen Mandaten.
- CRM-Kanban mit Notizen, Kandidat-zu-Mandat-Zuordnung mit eigenem Status.
- Übergeber-Sicht mit zugeordneten und passenden Kandidaten, Freischalt-Gate und
  Bezahl-Freischaltung über das austauschbare Payment-Interface.

Benachrichtigung und Mail:
- Newsletter, Folgen-Mails, Ähnlichkeitsvorschläge, Prozess-Updates.
- Eingehende Mails werden über einen Webhook als Antworten und Leads eingelesen.

Dashboards:
- Getrennte Bereiche für Admin, Käufer und Verkäufer, Admin-Analytics mit Funnel.

---

## 4. Leitplanken für alles Weitere

- Phalanx zuerst: Jede Funktion muss Phalanx im Tagesgeschäft nützen. Dritte
  bekommen sie über die vorhandene Mehrmandanten-Trennung, ohne Umbau.
- Mehrmandanten by design: Neue Tabellen immer mit tenant_id und RLS-Policy.
  White-Label (Logo, Farben, Subdomain) ist im Datenmodell bereits angelegt.
- PhalanxOS-Anschlussfähigkeit: Klare, versionierte interne Schnittstellen und
  ein sauberes Rollen- und Rechtemodell, damit Module später aus dem PhalanxOS
  heraus angesprochen werden können. Kein Alleingang bei Identitäten und Rechten.
- YMYL und E-E-A-T: Unternehmensverkauf und Finanzen bewertet Google streng.
  Vertrauenssignale (Autorenschaft, Fallzahlen, Zertifikate) sind Pflicht.
- DSGVO und Sicherheit sind kein Sprint, sondern eine Dauerlinie. Datenschutz
  gehört in jedes Feature, nicht nur in Sprint 29.

---

## 5. Sicherheit, Datenschutz und Datensafe auf Drooms-Niveau

Der Datensafe ist das Herz eines seriösen M&A-Marktplatzes. Ziel ist ein Safe,
der sich neben Drooms und ideals sehen lassen kann.

Sofort (härtet den Bestand, siehe auch Sprint 29):
- JWT-Schlüssel rotieren und Start in Produktion fail-closed, Git-History bereinigen.
- CSP und HSTS aktivieren, CORS schließen, HTML-Escaping in Mails.
- Integrationstests für Auth, RLS und Gates.

Datensafe-Ausbau (das Alleinstellungsmerkmal):
- Schwärzen (Redaction): einzelne Wörter, Passagen oder Seitenbereiche in PDFs
  dauerhaft unkenntlich machen, mit einer geschwärzten und einer Klar-Fassung,
  gesteuert je Empfänger oder Gruppe.
- Klare Zugriffsstruktur: Rechte je Ordner und je Dokument, je Nutzer oder Gruppe,
  von nur lesen bis herunterladen, mit zeitlicher Befristung und Widerruf.
- Zugriffs-Dokumentation: revisionssicheres Protokoll je Nutzer, welches Dokument
  wann, wie lange und wie oft angesehen oder heruntergeladen wurde. Als Bericht
  für den Verkäufer aufbereitet (Interessen-Heatmap je Bieter).
- Sichere Vorschau: Dokumente werden mit Wasserzeichen gestreamt statt roh
  ausgeliefert, mit Schutz gegen einfaches Kopieren.
- Fristen und Fence-View: zeitlich gesteuerter Zugang, gestufte Freigabe je Runde.
- Virenscan der Uploads als austauschbarer Provider-Stub.

DSGVO-Feinschliff:
- Vollexport nach Art. 15, dokumentiertes Aufbewahrungs- und Löschkonzept,
  Auftragsverarbeitung und Unterauftragsverarbeiter sauber gelistet.
- EU-Hosting und Verschlüsselung ruhender Daten belegen.

---

## 6. M&A-Prozess und Due Diligence zu Ende bauen

- Bieterverfahren und Angebotsabgabe: strukturiertes Angebots-Objekt (Betrag,
  Struktur, Bedingungen, Runde, Frist), indikativ gegen verbindlich, moderiertes
  Live-Angebotstool mit Timer, nur auf Freischaltung.
- LOI-Ablage und -Vergleich, sichtbar je nach Rolle.
- DD-Anforderungsliste und Checklisten (Legal, Financial, Tax, HR, Commercial),
  Status angefordert gegen bereitgestellt, Zuständigkeit und Frist.
- Q&A 2.0: Kategorien, Zuweisung, Priorität, Frist, Export.
- Prozessfahrplan mit Meilensteinen und Fristen je Mandat.
- Signing und Closing: SPA-Signatur über das NDA hinaus, Closing-Checkliste.

---

## 7. CRM und Customer Journey mit Zwei-Wege-Kommunikation

- Zwei-Wege-Mail: nicht nur senden, sondern empfangen und je Kontakt zu einem
  Thread bündeln. Eingehende Mails (Webhook ist vorhanden) werden dem Kontakt und
  Mandat zugeordnet, sodass eine durchgehende Customer Journey entsteht.
- Geteilter Team-Posteingang je Mandat, mit Zuordnung, Status und Wiedervorlage.
- Sequenzen und Wiedervorlagen, stufengetriggert, mit Vorlagen je Zielgruppe.
- Aktivitäts-Timeline je Kontakt (Mails, Aufgaben, Stufenwechsel, Termine).
- KI-gestützte Ansprache je Zielgruppe (Käufer, Verkäufer, Nachfolger, Berater),
  siehe Matchy.

---

## 8. Management-Informationssystem und rollengerechte Dashboards

Ein MIS, das jeder Rolle genau ihre Sicht gibt:
- Berater und Admin: Pipeline über alle Mandate, Conversion je Stufe, Aging,
  einfacher Forecast, Aktivität, Umsatz und Abrechnung.
- Verkäufer und Übergeber: Prozessstand des eigenen Mandats, Interessenten-
  Engagement, Datenraum-Zugriffe, Angebote.
- Käufer und Investoren: eigene Deals als Prozesskarten, freigegebene Unterlagen,
  Datenraum-Zugang, nächste Schritte.
- Kennzahlen konsistent aus einer Quelle, exportierbar, später als Datenfeed
  für das PhalanxOS.

---

## 9. Matchy powered by Phalanx (bezahlte KI-Funktion)

Matchy ist die kostenpflichtige KI-Schicht. Sie läuft hinter dem vorhandenen
Billing-Interface, sodass sie sich sauber abrechnen und je Mandant freischalten lässt.

Erste nützliche Fähigkeiten:
- Bessere Dealbeschreibungen: aus Stichpunkten einen anonymisierten Teaser und ein
  Exposé-Gerüst erzeugen, auf Wunsch mit Schwächen-Check aus Käufersicht.
- Nachfolger- und Käuferprofile optimieren: Lücken finden, Formulierungen schärfen,
  Suchkriterien vorschlagen.
- Matching-Begründungen in Klartext und Vorschläge für die Ansprache je Zielgruppe.
- Q&A-Assistent im Datenraum, der auf Basis freigegebener Dokumente antwortet.

Aufbau:
- Ein Custom-GPT-artiger Assistent mit klaren Leitplanken (keine Rechts- oder
  Anlageberatung, DSGVO-fest, keine Weitergabe vertraulicher Inhalte).
- Eine Wissensdatenbank als Fundament: Leitfäden, Prozesswissen, Bewertungslogik,
  anonymisierte Muster. Dieselbe Basis speist Matchy und den Content-Hub (SEO).
- Abrechnung je Nutzung oder als Paket, klar getrennt von den kostenfreien Funktionen.

Namensschutz und Auftritt: Matchy tritt als Marke von Phalanx auf, mit sichtbarem
Hinweis, dass es sich um ein Assistenzwerkzeug handelt.

---

## 10. SEO und Content, um ohne Werbebudget zu ranken

Grundlage ist die YMYL- und E-E-A-T-Bewertung. Fünf Hebel:

1. Landingpages nach Suchintention trennen:
   - Verkäufer: eigene Seite mit dem Unternehmenswert-Rechner als Lead-Magnet,
     Ziel-Begriffe wie Unternehmenswert berechnen, Firma verkaufen Ablauf,
     Unternehmensnachfolge KMU.
   - Käufer und Investoren: öffentlicher, anonymisierter Katalog mit Teasern,
     für den Google-Bot lesbar (ohne Registrierungswand), damit viele Listings
     indexiert werden.
2. E-E-A-T-Verstärker: Autorenboxen mit Profil, akademischem Hintergrund und
   Publikationen, Fallzahlen und Zertifikate im sichtbaren Bereich, strukturierte
   Daten nach Schema.org.
3. Programmatic SEO: generierte Kategorieseiten je Branche und Region, zum
   Beispiel unternehmensnachfolge/maschinenbau oder firma-verkaufen/bayern, und
   frei indexierbare anonyme Exposés mit H1, Branche, Umsatzklasse und Region.
4. Content-Hub: interaktive Werkzeuge (Rechner, KI-Leitfaden) für hohe Verweildauer,
   Leitfäden mit Download, zum Beispiel eine Checkliste zur Unternehmensübergabe.
5. Backlinks und Digital PR: Gastbeiträge und Experteninterviews auf Fachportalen,
   einmal im Jahr ein kleiner KMU-Nachfolge-Index aus eigenen Bewertungsdaten, den
   Fachmedien gern als Quelle verlinken.

Technische SEO-Basis: saubere URLs, sprechende Titel und Meta-Angaben, Sitemap,
schnelle Ladezeit (Code-Splitting des Clients), serverseitig gerenderte oder
vorgerenderte öffentliche Seiten, damit Inhalte ohne JavaScript indexierbar sind.

---

## 11. Wissenschaft, Datenpool und PhalanxOS

- Forschungs-Datenpool: anonymisierte, aggregierte Daten rund um Bewertung und
  Multiples für Forschungsarbeiten, mit klarer Einwilligung und Zweckbindung.
  Tiefer in die Anwendung eingebettet, sodass jede Bewertung freiwillig zum Pool
  beitragen kann. Ausgabe als kuratierter, anonymisierter Datensatz und als
  jährlicher Marktbericht (der zugleich SEO und PR speist).
- PhalanxOS-Anschluss: Befragungs- und Newsletter-Werkzeug als eigenes Modul,
  das der Marktplatz mitnutzt. Einheitliche Identitäten, Rechte und Datenfeeds,
  damit der Marktplatz später ein Modul im PhalanxOS ist und nicht ein Solitär.
  Solange PhalanxOS noch definiert wird: interne Schnittstellen versionieren und
  entkoppeln, keine harten Abhängigkeiten einbauen.

---

## 12. Priorisierte Sprint-Sequenz

Reihenfolge nach Wert und Abhängigkeit. Sicherheit trägt alles, danach das, was
den Marktplatz einzigartig macht (Datensafe, Prozess), dann Reichweite (SEO) und
Ertrag (Matchy).

- Sprint 29 · Sicherheit, Datenschutz, Testabdeckung härten (Grundlage).
- Sprint 30 · Datensafe Stufe 1: Zugriffsstruktur je Ordner und Nutzer,
  Zugriffs-Dokumentation und Bericht, sichere Vorschau mit Wasserzeichen.
- Sprint 31 · Datensafe Stufe 2: Schwärzen von Passagen, Fristen und Fence-View,
  Virenscan-Stub.
- Sprint 32 · Due Diligence: Anforderungsliste, Q&A 2.0, Prozessfahrplan.
- Sprint 33 · Bieterverfahren und LOI, danach Signing und Closing.
- Sprint 34 · Zwei-Wege-Mail und Customer Journey (Empfang, Threads, Team-Posteingang).
- Sprint 35 · MIS und rollengerechte Dashboards, eine Kennzahlenquelle.
- Sprint 36 · Matchy Stufe 1: Deal- und Profil-Texthilfe, hinter Billing, plus
  Grundstock der Wissensdatenbank.
- Sprint 37 · SEO-Fundament: öffentliche indexierbare Teaser, Landingpages nach
  Intention, Schema.org, Sitemap, Vorrendern der öffentlichen Seiten.
- Sprint 38 · Programmatic SEO: Kategorieseiten je Branche und Region, Content-Hub
  mit Leitfäden und Rechnern.
- Sprint 39 · Matchy Stufe 2: Q&A-Assistent im Datenraum, Ansprache-Optimierung
  je Zielgruppe, Custom-GPT-Anbindung.
- Sprint 40 · Forschungs-Datenpool und jährlicher Marktbericht, Anbindung an das
  PhalanxOS-Befragungs- und Newsletter-Modul.
- Sprint 41 · Mehrmandanten-Feinschliff und White-Label für Dritte, Self-Service-
  Einrichtung eines neuen Mandanten.

Die bestehenden Nachfolge-Konzepte (frühere Sprints 26, 27) laufen als kleinere
Pakete zwischen den obigen Sprints weiter (Events, Club, Reifegrade).

---

## 13. Monetarisierung (Überblick)

- Kostenfrei: Nachfolge-Interessierte, öffentlicher Marktplatz, Quick-Bewertung.
- Bezahlt: Freischaltung der Nachfolge-Kandidaten für Übergeber (bereits gebaut),
  Deal-Setup und Datenraum-Staffel (Interface vorhanden), Matchy je Nutzung oder
  Paket, später Mandanten-Abo für Dritte im White-Label.

---

## 14. Risiken und Abhängigkeiten

- Sicherheit vor Reichweite: Erst wenn Datensafe und DSGVO fest sind, ist breite
  SEO-Sichtbarkeit unkritisch. Sonst zieht man Aufmerksamkeit auf ungehärtete Teile.
- KI und Haftung: Matchy darf keine Rechts- oder Anlageberatung geben. Klare
  Leitplanken und Kennzeichnung als Assistenz.
- PhalanxOS noch in Definition: keine harten Kopplungen, nur versionierte
  Schnittstellen, damit spätere Integration ohne Umbau gelingt.
- Datenschutz beim Forschungs-Pool: nur anonymisiert und mit Einwilligung.

---

## 15. Nächster konkreter Schritt

Empfehlung: mit Sprint 29 (Sicherheit) starten, weil er alles Folgende trägt und
die kritischen Audit-Punkte schließt. Direkt danach Datensafe Stufe 1, weil der
Safe das stärkste Unterscheidungsmerkmal gegenüber einfachen Börsen ist.
