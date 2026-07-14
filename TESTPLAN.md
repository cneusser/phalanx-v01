# CapitalMatch · Manueller Testplan (Sprint 0–3)

Stand: Juli 2026. Jeden Testfall auf der **Live-Seite** durchklicken und abhaken.
Du brauchst: den Admin-Zugang (neusser@phalanx.de) und eine zweite E-Mail-Adresse
für einen Test-Investor (z. B. Gmail-Adresse mit `+test`, etwa `name+investor1@gmail.com`).

**Tipp:** Für die Investor-Rolle ein privates/Inkognito-Fenster nutzen, dann kannst
du Admin und Investor parallel testen.

---

## A. Basis & Optik (Sprint 0 + Fixes)

- [ ] **A1 Logo:** Landing-Seite, Login, Registrierung, Navbar und Footer zeigen das
  echte CapitalMatch-Logo (deine Bildmarke, nicht die Schriftart-Version). Auf dunklen
  Flächen liegt es auf einer weißen Fläche und ist gut lesbar.
- [ ] **A2 Anonymisierung:** Nirgendwo taucht „ika ika" oder „Scopo" auf, weder auf
  der Landing-Page noch im Marktplatz oder in Dokumentnamen. Das Mandat heißt
  **„Projekt Umami"**.
- [ ] **A3 Landing-Kacheln:** Unter „Aktuelle Mandate" erscheinen zwei Kacheln
  (Projekt Umami, Nexora) mit Kennzahlen, geladen aus der Datenbank.
- [ ] **A4 Tab-Counts:** Im Marktplatz zeigen die Buttons „Alle (2) / M&A (0) /
  Fundraising (2)": auch die 0 wird angezeigt, und die Zahlen ändern sich NICHT,
  wenn du zwischen den Tabs wechselst.

## B. Marktplatz & Detailseite (Sprint 2-Fixes)

- [ ] **B1 Tab-Leiste:** Auf der Detailseite (z. B. Projekt Umami) liegt KEIN grauer
  Scrollbalken mehr über der Leiste „Überblick / Unternehmen / Markt & Potenzial / …".
- [ ] **B2 Klickbare Tags:** Klick auf den Tag „Food & Nutrition" im Kopf der
  Detailseite führt in den Marktplatz, wo der Branchenfilter bereits gesetzt ist
  (nur passende Mandate sichtbar, Filter links markiert). Gleiches mit Region und
  „Fundraising".
- [ ] **B3 Filter zurücksetzen:** Im Marktplatz „Filter zurücksetzen" klicken →
  wieder alle Mandate sichtbar.

## C. Registrierung & Freigabe (Gates, Teil 1)

- [ ] **C1 Registrieren:** Im Inkognito-Fenster als Investor registrieren
  (`name+investor1@…`). Es erscheint die Meldung, dass das Konto geprüft wird.
  **Kein** automatischer Login.
- [ ] **C2 Login vor Freigabe blockiert:** Login-Versuch mit dem neuen Konto →
  Meldung „Konto noch nicht freigeschaltet".
- [ ] **C3 Admin-Freigabe:** Als Admin einloggen → Admin-Bereich → Nutzer →
  der neue Investor steht in der Liste → „Freigeben" klicken.
- [ ] **C4 Login nach Freigabe:** Investor kann sich jetzt einloggen.

## D. NDA-Flow & gestufter Zugang (Sprint 2 + 3 · Kernstück)

Als **Investor** (Inkognito-Fenster), Projekt Umami öffnen:

- [ ] **D1 Vor NDA:** Nur der Tab „Überblick" ist offen; „Unternehmen", „Finanzen"
  etc. zeigen ein Schloss. Im Tab „Dokumente" ist nur der öffentliche Teaser
  gelistet, das IM ist gesperrt („NDA erforderlich").
- [ ] **D2 Kein Umgehen per URL:**: *optional, technisch*, Direktaufruf von
  `…/api/projects/1` im Browser liefert einen Fehler 401/403, keine Daten.
- [ ] **D3 Interesse/NDA anfordern:** Button für NDA/Interesse klicken →
  Status „NDA angefordert" erscheint.
- [ ] **D4 NDA lesen:** Das NDA-Dokument als PDF öffnen (Vorschau). Es ist mit
  deinen Daten und dem Projektnamen „Projekt Umami" befüllt (kommt jetzt aus der
  konfigurierbaren Vorlage in der Datenbank).
- [ ] **D5 Online signieren:** NDA online unterzeichnen (Name eintippen +
  bestätigen). Erfolgs-Meldung erscheint.
- [ ] **D6 IM automatisch frei (NEU Sprint 3):** Direkt nach der Signatur, ohne
  Admin-Zutun: ist im Tab „Dokumente" der Bereich „Vertrauliche Dokumente" mit
  Badge **„IM freigeschaltet (NDA signiert)"** sichtbar und das Pitchdeck/IM
  gelistet. Die Tabs „Unternehmen/Finanzen" (Datenraum-Ebene) bleiben gesperrt.
- [ ] **D7 Signiertes NDA-PDF:** Das unterzeichnete NDA lässt sich herunterladen;
  auf der letzten Seite stehen grüner Signaturblock + Audit-Trail (Name, E-Mail,
  Zeitstempel, IP).
- [ ] **D8 Datenraum-Freigabe:** Als Admin: NDA-Verwaltung → das signierte NDA
  „Freigeben". Als Investor: Seite neu laden → jetzt sind ALLE Tabs offen
  (Unternehmen, Markt & Potenzial, Finanzen, Kontakt).
- [ ] **D9 Ablehnung testet Terminal-Zustand:**, *optional*, Mit einem zweiten
  Test-Investor (`+investor2`) bis D3 gehen, dann als Admin „Ablehnen" → Investor
  sieht „Abgelehnt" und bekommt keinerlei Dokumente.

## E. Admin & Zustandsautomat (Sprint 2)

- [ ] **E1 Dashboard-Zahlen:** Admin-Dashboard zeigt plausible Zahlen (Projekte,
  Nutzer, NDAs): keine „NaN" oder zusammengeklebte Zahlen wie „11".
- [ ] **E2 Aktivitätslog:** Im Admin-Bereich erscheinen die letzten Aktionen
  (Login, NDA-Anfrage, Freigaben) mit Nutzer und Zeitstempel.
- [ ] **E3 Projekt anlegen:** Neues Test-Mandat anlegen (Platzhalter-Codename) →
  erscheint als Entwurf, nach „Veröffentlichen" im Marktplatz. Danach wieder
  zurückziehen oder löschen. Die Marktplatz-Zähler passen sich an.

## F. Stabilität (Sprint 1)

- [ ] **F1 Deploy-Festigkeit:** Nach dem nächsten Deployment (Push) sind
  Test-Investoren, NDAs und Freigaben **noch vorhanden** (PostgreSQL statt
  SQLite-Datei).
- [ ] **F2 Passwort vergessen:** „Passwort vergessen"-Flow anstoßen → Meldung
  erscheint (Versand-Link steht derzeit nur im Railway-Log, SMTP folgt später).

## G. Datenraum & CRM (Sprint 4)

Voraussetzung: Ein Investor mit Datenraum-Freigabe (D8) und mindestens eine
als Admin hochgeladene PDF-Datei mit Zugriffsstufe „Freigegeben" (Datenraum).

- [ ] **G1 Wasserzeichen:** Als Investor ein Datenraum-PDF herunterladen →
  jede Seite trägt diagonal „VERTRAULICH: [Ihr Name]" und in der Fußzeile
  Name, E-Mail und Datum.
- [ ] **G2 Ablaufender Link:** Der Download läuft über einen signierten Link
  (15 Min. gültig)., *optional technisch:* Link kopieren, 15 Min. warten →
  „Link ungültig oder abgelaufen".
- [ ] **G3 Granulare Rechte:** Admin → Pipeline → Deal öffnen → beim
  Interessenten „Datenraum: Nur lesen" wählen → Investor kann Liste sehen,
  Download wird mit klarer Meldung verweigert. Danach zurück auf
  „Lesen + Download".
- [ ] **G4 Q&A:** Investor stellt im Tab „Q&A" eine Frage → du bekommst eine
  Mail → im Deal-CRM antworten → Investor bekommt Mail und sieht die Antwort
  im Q&A-Tab. Bei entzogenem Q&A-Recht (G3-Dialog) kann er keine Fragen stellen.
- [ ] **G5 Kanban-Pipeline:** Admin-Tab „Pipeline (CRM)" zeigt die Deals in
  Spalten (Entwurf / Teaser live / In Diligence / LoI / Closed). Klick auf
  eine Karte öffnet das Deal-CRM. Statuswechsel nur entlang erlaubter Pfeile
  (z. B. Teaser live → In Diligence); unerlaubte Sprünge bietet die UI nicht
  an und der Server lehnt sie ab.
- [ ] **G6 Aufgaben:** Im Deal-CRM eine Aufgabe mit Fälligkeit anlegen →
  erscheint im Dashboard unter „Offene Aufgaben" (überfällige mit ⚠).
- [ ] **G7 Dashboard:** Übersicht zeigt die neuen Kacheln Datenraum-Zugriffe
  (7 Tage), offene Aufgaben, offene Q&A-Fragen.

## H. Multi-Tenant & Billing (Sprint 5)

- [ ] **H1 Alles läuft wie vorher:** Kompletter Kurzdurchlauf (Login,
  Marktplatz, NDA, Dokumente): die RLS-Umstellung darf im Tagesgeschäft
  nichts ändern. Im Railway-Log steht beim Start
  `🔐 RLS aktiv: App-Verbindung als "…_app"`.
- [ ] **H2 Mandant anlegen:**: *per API/technisch*, `POST /api/admin/tenants`
  legt Tenant + tenant_owner an; dessen Login funktioniert nur über die
  Tenant-Subdomain, auf der Hauptdomain ist er unsichtbar (401).
- [ ] **H3 Branding:** `GET /api/tenant/branding` liefert je Subdomain
  Name/Farben; die Navigation übernimmt Farbe und Namen des Mandanten.
- [ ] **H4 Auditor-Rolle:** Ein Nutzer mit Rolle `auditor` sieht
  Aktivitäts-/Audit-Protokolle, kann aber nichts freigeben oder ändern (403).
- [ ] **H5 Billing (Feature-Flag):** Erst mit `BILLING_ENABLED=1` (Railway)
  UND aktiviertem Tenant-Billing wird beim Statuswechsel eines Deals auf
  „Teaser live" einmalig eine Setup-Gebühr im Stub verbucht
  (`GET /api/admin/billing/events`): kein Doppelevent bei erneutem Wechsel.
  Ohne Flag: keinerlei Billing-Aktivität.

---

## I. Bewertungsrechner (Sprint 6)

- [ ] **I1 Öffentlich & anonym:** `/unternehmenswert` ohne Login aufrufen (auch
  im Inkognito-Fenster). Branche wählen, Umsatz + EBIT der letzten Jahre
  eingeben, Qualitätsfaktoren setzen → „Unternehmenswert berechnen" → Werte-
  Korridor (konservativ / Basis / optimistisch) erscheint.
- [ ] **I2 Plausibilität:** Höhere Qualitätsbewertung hebt den Wert (Multiple
  näher am oberen Bandende); ein negatives EBIT zeigt „nicht bewertbar".
- [ ] **I3 PDF-Report + Lead:** Name/E-Mail eingeben, Datenschutz-Haken setzen →
  „PDF-Report anfordern" → PDF wird heruntergeladen (Korridor + Verfahren +
  Disclaimer) und per E-Mail versendet.
- [ ] **I4 Lead im Admin:** Admin → Tab „Bewertungs-Leads" → der Lead erscheint
  mit Name, E-Mail, Branche und Basiswert.
- [ ] **I5 Nav-Link:** „Unternehmenswert" erscheint in der Navigationsleiste.
- [ ] **I6 Größenklasse:** Gleiche Branche, aber Ø-Umsatz < 5 Mio. € vs. 5–50 Mio. €
  vs. > 50 Mio. € → im Ergebnis erscheint die jeweilige Größenklasse (Micro/Small/
  Mid) und ein anderes Multiple-Band.
- [ ] **I7 Multiples pflegen:** Admin → Tab „Multiples" → Zahl ändern (Feld färbt
  sich, „Speichern" aktiv) → speichern → neue Bewertung nutzt den geänderten Wert.
- [ ] **I8 PDF-Optik:** Report zeigt Phalanx-Logo, Tagline, Größenklasse, werblichen
  Abschluss-Block mit Kontakt und Quelle „DUB KMU-Multiples (Q2/2026)".

---

## J. Ausführliche Bewertung (Sprint 7)

- [ ] **J1 Login-Pflicht:** `/bewertung` ohne Login → Weiterleitung zum Login.
  Als registrierter Nutzer erscheint die Übersicht „Ihre Bewertungen".
- [ ] **J2 Stepper & Entwurf:** „Neue Bewertung" → Schritt 1 Finanzdaten (Branche,
  Umsatz/EBIT, Bereinigungen), Schritt 2 Scorecard (−2…+2), Schritt 3 Substanz &
  Käufer → „Entwurf speichern" → erscheint in der Liste als „Entwurf".
- [ ] **J3 Berechnen:** „Berechnen" → Schritt 4 zeigt Korridor, Multiple, Ertragswert,
  §199, Kapitaldienst-Einschätzung; Status wird „Berechnet".
- [ ] **J4 Scorecard-Wirkung:** Gleiche Zahlen, aber Scorecard komplett +2 vs. −2 →
  höheres bzw. niedrigeres Multiple und anderer Kapitalisierungszins.
- [ ] **J5 PDF:** „Ausführlichen PDF-Report herunterladen" → mehrseitiger Report
  (Bereinigung, Scorecard, Verfahren, Kapitaldienst, Disclaimer) in Phalanx-CI.
- [ ] **J6 Admin-Review:** Admin → Tab „Ausf. Bewertungen" → Bewertung „Prüfen" →
  Mandat zuordnen + Kommentar → „Als geprüft markieren" → Status „Geprüft"; die
  Bewertung ist für den Nutzer danach schreibgeschützt.
- [ ] **J7 Mandatsbezug:** Nach Zuordnung erscheint das Mandat (Codename) in der
  Bewertungs-Liste (Nutzer- und Admin-Ansicht).

---

## K. Container-Safe (Sprint 8)

- [ ] **K1 Einstieg & Zugriff:** Admin → Projekte → „🔒 Safe" öffnet den Explorer
  (`/mandat/:id/safe`). Ein **Investor** (nicht-Pfleger) erhält beim Aufruf die
  Meldung „Kein Zugriff" (keine Dateien sichtbar).
- [ ] **K2 Ordner & Upload:** „Neuer Ordner" anlegen; per „Dateien" und per Drag &
  Drop hochladen → erscheinen in der Liste, Bilder in der Galerie.
- [ ] **K3 Ordner-Upload:** „Ordner hochladen" mit einem mehrstufigen Ordner → der
  Ordnerbaum wird im Safe nachgebildet (Navigation per Breadcrumb).
- [ ] **K4 Versionierung:** Gleiche Datei erneut hochladen → zweite Version (Badge
  „v2"), die erste bleibt erhalten.
- [ ] **K5 Download-Integrität:** Datei herunterladen → Inhalt identisch (Checksum).
- [ ] **K6 Papierkorb:** Datei/Ordner löschen → „Papierkorb" zeigt sie →
  Wiederherstellen bringt sie zurück; „Endgültig" entfernt sie inkl. Speicher.
- [ ] **K7 In Datenraum übernehmen:** Bei einer Safe-Datei „Teilen"-Symbol →
  Zugriffsebene wählen → die Datei erscheint als Dokument im Mandat (Gate greift).
- [ ] **K8 Speicheranzeige:** Kopfzeile zeigt Gesamtgröße, Datei- und Ordnerzahl.
- [ ] **K9 Killswitch:** Mandat löschen (Admin) entfernt auch dessen Safe-Einträge
  (CASCADE über `project_id`).
- [ ] **K10 Provider-Umschaltung (optional):** Mit `STORAGE_PROVIDER=s3` + R2-ENV
  starten → Upload/Download funktionieren gegen R2, ohne Codeänderung.

---

## L. Exposé-Builder (Sprint 9)

- [ ] **L1 Editor öffnen:** Admin → Projekte → „📄 Exposé" (`/mandat/:id/expose`) →
  Keyfacts-Raster, Sektionen, Bild-Bereich erscheinen; Status „Entwurf".
- [ ] **L2 Autosave:** Keyfact/Sektion ändern → Statusanzeige „Ungespeichert…" →
  kurz darauf „Automatisch gespeichert"; nach Reload sind die Werte erhalten.
- [ ] **L3 Korridor-Übernahme:** Existiert eine **geprüfte** ausführliche Bewertung
  (Sprint 7) für das Mandat, erscheint der Werte-Korridor als Hinweis und im Exposé.
- [ ] **L4 Bilder aus Safe:** Bilder im Container-Safe hochladen → im Editor als
  Galerie wählbar; Stern-Klick setzt ein Titelbild.
- [ ] **L5 Publish mit Anonymisierung:** Ohne alle Häkchen ist „Veröffentlichen"
  gesperrt; nach Bestätigung wird das Exposé veröffentlicht.
- [ ] **L6 Gate (Käufer):** Investor **ohne** NDA ruft `/projekte/:id/expose` auf →
  „Exposé erst nach NDA verfügbar". Nach unterschriebenem NDA (Stage `nda_signed`)
  ist das Web-Exposé sichtbar (Keyfacts, Sektionen, Galerie, Kaufpreisvorstellung).
- [ ] **L7 PDF-Wasserzeichen:** PDF-Export enthält Name/E-Mail des Abrufenden als
  diagonales Wasserzeichen und im Footer.
- [ ] **L8 Vorschau (Pfleger):** Als Pfleger ist das Exposé auch im Entwurf über die
  Vorschau sichtbar; Käufer sehen Entwürfe nie.
- [ ] **L9 Leerzustand:** Ein noch leeres Exposé zeigt in der Vorschau den Hinweis
  „noch keine Inhalte" (Pfleger mit Link zum Editor); der PDF-Button meldet Fehler
  klar, statt still zu bleiben.
- [ ] **L10 Teaser-Ableitung:** Editor → „Öffentlichen Teaser aktualisieren" → die
  Marktplatz-Karte des Mandats übernimmt Branche, Region, Umsatzband, Kurz-
  beschreibung und Highlights aus dem Exposé (nur anonymisierte Angaben).

## M. Briefbogen-Footer in PDFs

- [ ] **M1 NDA:** Signiertes NDA-PDF zeigt auf **Seite 1** den vollständigen Phalanx-
  Briefbogen-Footer (Adresse, Tel/Fax, Register, USt-IdNr., Bankverbindung, www);
  Folgeseiten zeigen die schlanke Seitenzeile.
- [ ] **M2 Bewertungen & Exposé:** Quick-Check-, ausführliche Bewertung und Exposé-PDF
  tragen den Firmen-Footer auf **jeder** Seite; Inhalt überlappt den Footer nicht.
- [ ] **M3 Exposé-Wasserzeichen:** Das Exposé-PDF behält zusätzlich das diagonale
  Empfänger-Wasserzeichen (Name/E-Mail).

## N. Q&A, Verkäufer-Pflege & Teaser-PDF

- [ ] **N1 Q&A als Admin/Pfleger:** Auf der Mandatsseite → Tab „Q&A" → als Admin oder
  Mandats-Pfleger eine Frage erfassen → wird gespeichert (kein „erst nach Datenraum-
  Freigabe"-Fehler mehr). Käufer ohne Freigabe erhalten weiterhin den Hinweis.
- [ ] **N2 Verkäufer pflegt Exposé/Safe:** Als **Verkäufer**, der ein Mandat betreut,
  erscheinen auf der Mandatsseite die Buttons „📄 Exposé" und „🔒 Safe" (neben
  „Pflegen") und öffnen Editor bzw. Safe.
- [ ] **N3 Verkäufer sieht Kaufmandate:** Verkäufer-Dashboard → „Marktplatz &
  Kaufmandate" → Marktplatz mit allen Mandaten; Teaser einsehbar, NDA anforderbar.
- [ ] **N4 Teaser-PDF:** Mandatsseite → „⬇ Kurzprofil als PDF" → PDF mit Briefbogen-
  Footer, gelber Vertraulichkeits-Markierung und Empfänger-Wasserzeichen; jede
  Erzeugung erscheint im Audit-Trail (Aktion `TEASER_PDF`).

## O. Mails, Q&A-Flow, Audit-Stempel, Profil, Impressum

- [ ] **O1 Branded-Mails:** Jede Kundenmail hat Phalanx-Header, werblichen Abbinder
  und **Impressum-Footer** (Firma, Adresse, Kontakt, HRB, USt-IdNr.). Passwort-Reset
  ohne Werbeblock.
- [ ] **O2 Q&A-Direkteinstieg:** Die Admin-Benachrichtigung zu einer neuen Frage
  enthält einen Button „Frage direkt beantworten" → öffnet die Mandatsseite im
  Q&A-Tab (`?tab=qa`). Dort erscheint für Admins pro offener Frage ein Antwortfeld.
- [ ] **O3 Antwort-Zustellung:** „Antworten & zusenden" speichert die Antwort und
  schickt dem Fragenden eine Mail, die **Frage und Antwort** enthält.
- [ ] **O4 PDF-Audit-Stempel:** Teaser- und Exposé-PDF zeigen sichtbar „Erstellt am
  <Datum, Uhrzeit> · heruntergeladen von <Name> (<E-Mail>)"; Download bleibt im
  Audit-Trail (`TEASER_PDF` / `EXPOSE_PDF`).
- [ ] **O5 Mobilnummer Pflicht:** Registrierung ohne Mobilnummer → Fehler; Profil
  verlangt die Mobilnummer (Grundlage 2FA). Festnetz bleibt optional.
- [ ] **O6 Impressum:** `/impressum` zeigt HRB 14306, USt-IdNr. DE 273 832 962 und
  Bankverbindung (Sparkasse Nürnberg, IBAN/BIC) gemäß Briefkopf.

## P. Feedback, Changelog & Käufer-Suchprofile (Sprint 10)

- [ ] **P1 Feedback senden:** `/feedback` (Käufer/Verkäufer) → Kategorie + Nachricht →
  „Feedback senden" → Bestätigung; Eintrag erscheint im Admin-Tab „Feedback"; Admin
  erhält eine Branded-Mail.
- [ ] **P2 Feedback-Status:** Admin → „Feedback" → Status je Eintrag änderbar (Offen/
  Geplant/Umgesetzt/Abgelehnt).
- [ ] **P3 Changelog:** Admin → „Changelog" zeigt die Versionshistorie; neuer Eintrag
  (Version, Titel, Punkte je Zeile) lässt sich hinzufügen und erscheint oben.
- [ ] **P4 Roadmap/„Was ist neu":** Die Feedback-Seite zeigt die geplanten Funktionen
  (professioneller Text) und die neuesten Changelog-Einträge.
- [ ] **P5 Tabellenansicht:** Marktplatz → Umschalter „Tabelle" zeigt die Mandate als
  sortier-/scrollbare Liste (Dealum-Stil); Klick auf eine Zeile öffnet das Mandat.
- [ ] **P6 Suche speichern:** Filter setzen → „★ Suche speichern" → Name vergeben →
  erscheint unter „Meine Suchprofile" (`/suchprofile`).
- [ ] **P7 Suchprofil-Verwaltung:** Benachrichtigungsfrequenz umstellen, „Treffer"
  öffnet den Marktplatz mit den Kriterien, Löschen entfernt das Profil.
- [ ] **P8 Match-Mail:** Neues Mandat veröffentlichen, das einem Suchprofil (Frequenz
  „sofort") entspricht → der Käufer erhält eine Branded-Mail mit Mandats-Link.

## Q. Sprint-10-Rest, Kontakt & Robot-Schutz

- [ ] **Q1 Merkliste:** Im Marktplatz auf den Stern ☆ klicken → Mandat unter
  `/merkliste`; dort Tags/Notiz speichern und nach Tag filtern.
- [ ] **Q2 Feinere Filter:** Sidebar zeigt „Umsatzband" und „EBITDA-Band"; Auswahl
  filtert und lässt sich als Suchprofil speichern.
- [ ] **Q3 Digest:** Suchprofil auf „Täglich"/„Wöchentlich" stellen; ein passendes
  neues Mandat veröffentlichen → beim nächsten Digest-Lauf kommt eine Sammel-Mail
  (manuell testbar: Admin `POST /api/community/digest/run`).
- [ ] **Q4 Kontaktseite:** `/kontakt` (öffentlich) zeigt die Phalanx-Kontaktdaten;
  Nachricht senden → Bestätigung; Eintrag erscheint im Admin-Tab „Feedback".
- [ ] **Q5 Robot-Schutz:** Feedback/Kontakt ohne „Ich bin kein Roboter" → Hinweis;
  zu viele Nachrichten in kurzer Zeit → Rate-Limit-Hinweis.
- [ ] **Q6 Admin-Übersicht:** Der Übersichts-Tab zeigt oben einen gruppierten
  Schnellzugriff auf alle Admin-Bereiche.
- [ ] **Q7 Links/Domain:** E-Mail-Links verweisen auf `capitalmatch.de`
  (Voraussetzung: `FRONTEND_URL` in Railway gesetzt, Domain verbunden).

## R. E-Mail-Bestätigung, Paygate & Nachrichten

- [ ] **R1 Registrierung:** Nach der Registrierung erscheint „Bitte bestätigen Sie
  Ihre E-Mail"; es kommt eine Bestätigungs-Mail mit Link auf `/email-bestaetigen`.
- [ ] **R2 Login-Gate:** Login vor Bestätigung → Hinweis „Bitte bestätigen Sie zuerst
  Ihre E-Mail" mit Button „erneut senden". Nach Klick auf den Link (und Admin-Freigabe)
  ist der Login möglich.
- [ ] **R3 Paygate-Status:** Auf `/bewertung` erscheint (bei aktiver Paywall) der
  Hinweis „kostenlos bis 31.08.2026". Ab dem Datum blockt der Server das Anlegen/
  Berechnen (402) mit klarer Meldung; Login ist ohnehin Pflicht.
- [ ] **R4 Nachrichten:** `/nachrichten` → Kontakt per E-Mail anfragen → Gegenüber
  nimmt an → beide können 1:1 chatten; neue Nachricht löst eine Mail aus.
- [ ] **R5 Diskretion:** Ohne angenommene Verbindung ist kein Schreiben möglich (403);
  Admin/Berater können immer schreiben.
- [ ] **R6 Changelog vollständig:** Admin → Changelog zeigt v0.224 … v0.237 lückenlos
  und korrekt absteigend sortiert.

---

## Hinweise

- Die geseedeten Beispiel-Dokumente (Teaser/Pitchdeck) sind **Metadaten ohne
  physische Datei**: Download liefert dort „Datei nicht gefunden". Für D6/D7-
  Download-Tests vorher als Admin echte Dateien im Mandat hochladen.
- NDA-Vorlage anpassen: Tabelle `nda_templates` in der Datenbank (Texte,
  Gerichtsstand, Beraterdaten): kein Code-Deploy nötig.
- E-Signatur läuft aktuell über den eingebauten Stub-Provider (simulierte
  eIDAS-FES-Signatur). Ein echter Anbieter (z. B. Skribble) wird später nur per
  Umgebungsvariable aktiviert.
- Aufräumen nach dem Test: Test-Investoren im Admin-Bereich deaktivieren,
  Test-Mandat zurückziehen.
