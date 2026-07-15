# Changelog · CapitalMatch (Phalanx GmbH)

Wird bei jeder Release mitgeführt. Die In-App-Ansicht (Admin → „Changelog") wird
über Seed-Migrationen gespeist; diese Datei ist die kuratierte Gesamtübersicht.

## v0.268 · 30.07.2026 · Anrede per Sie, Mandat im Mail-Ausgang
- **Förmliche Anrede in allen Mails** (`greetingLine` in `server/utils/email.js`): Ist eine Anrede hinterlegt, wird sie mit Titel und Nachnamen verwendet (`Sehr geehrter Herr Dr. Meier,`), sonst `Guten Tag Vorname Nachname,`. Immer per Sie. Das bisherige `Hallo Alexander` in Prozess- und Systemmails ist damit weg. Die CRM-Kampagnenmails nutzten die Regel schon; jetzt gilt sie auch für Registrierung, Freischaltung, Passwort, NDA-, Q&A-, Datenraum- und Newsletter-Mails
- **Hinweis zur Datenlage**: Registrierte Nutzer haben in der Datenbank keine Anrede/keinen Titel, deshalb greift bei ihnen `Guten Tag Vorname Nachname,`. CRM-Kontakte haben Anrede und Titel und werden voll förmlich angesprochen
- **Mandat-Spalte im Mail-Ausgang**: Kampagnen- und Vorlagenmails schreiben jetzt die `project_id` ins Ausgangsbuch, dadurch zeigt die Spalte den Codename (Betongold, FARADAY) statt `k. A.`. Gilt für neue Sendungen; die bereits protokollierten Altmails bleiben ohne Zuordnung
- Verifiziert: `greetingLine` mit sechs Fällen grün, Mail-Tests grün, Textwächter grün, Build sauber

## v0.267 · 29.07.2026 · Sprache aufgeräumt
- **Alle Mailvorlagen neu geschrieben** (`server/db/mailTemplateSeed.js`, jetzt die einzige Quelle für die 11 Systemvorlagen): kürzere Sätze, klare Ansage, kein Textbaustein-Ton. Die Migration `texts_v267` zieht sie in der laufenden Datenbank nach, **außer** die Vorlage wurde im Admin von Hand bearbeitet (`updated_by` gesetzt). Handarbeit bleibt Handarbeit
- **Einladung, Erinnerung, Prozess-Update** und die Systemmails (Registrierung, Freischaltung, Passwort, E-Mail-Bestätigung) sprechen wie ein Mensch statt wie ein Formular
- **Der Gedankenstrich ist raus**, aus Oberfläche, Mails, Rechtstexten, Kommentaren und Doku. 1.028 Zeilen in 170 Dateien
- **Fehlende Bandangaben** zeigen `k. A.` statt eines Strichs. Die Migration stellt Bestandsdaten und Spalten-Defaults um (`projects.revenue_band`, `projects.ebitda_band`)
- **Textwächter** (`npm run check:texts`): findet Gedankenstriche und KI-Floskeln im ganzen Repo und endet mit Fehlercode. Taugt als Pre-Commit-Hook
- Verifiziert: 32 neue Tests (`server/tests/mailText.test.js`) für Vorlagen, Platzhalter, HTML-Escaping und die drei fest verdrahteten Mails; Textwächter grün über 199 Dateien; Client-Build sauber

## v0.266 · 28.07.2026 · Dokumente umbenennen
- **Bezeichnung nachträglich änderbar**: Klick auf den Dokumentnamen (oder auf „Umbenennen") öffnet ein Feld für Bezeichnung und Kurzbeschreibung, Enter speichert, Escape bricht ab. Bisher ließ sich nur die Datei ersetzen oder das Zugangslevel ändern, nicht aber der Name, den Interessenten sehen
- **Endung bleibt erhalten**: Der Server hängt die Dateiendung automatisch an, wenn sie fehlt (`Teaser Betongold` → `Teaser Betongold.pdf`), sonst öffnet die Datei beim Empfänger nicht korrekt. Pfadangaben und Steuerzeichen werden entfernt, die Länge ist begrenzt
- Jede Umbenennung steht im **Audit-Trail** mit altem und neuem Namen
- Verifiziert: 11 Tests (Endungslogik, Umlaute, Pfad-Entschärfung, Leereingabe, Längenbegrenzung)

## v0.265 · 27.07.2026 · Marktplatz-Absturz behoben
- **Ursache gefunden**: Die Ladeanzeige des Marktplatzes (`LoadingSpinner`) rief die Übersetzungsfunktion `t()` auf, hatte den Hook `useT()` aber nicht, die Komponente liegt außerhalb von `<Projects>`. Beim Rendern warf sie `t is not defined`, React verwarf den kompletten Baum, und übrig blieb eine leere graue Fläche. Weil damit auch der Footer verschwand, waren Impressum, Datenschutz und AGB von dort nicht erreichbar. Eingeschleppt wurde der Fehler mit der Englisch-Erweiterung (v0.257)
- **Behoben**: `LoadingSpinner` holt sich den Hook jetzt selbst
- **Vorbeugung**: Ein Prüfschritt geht alle Client-Dateien durch und meldet jede Komponente, die `t()` benutzt, ohne `useT()` zu halten, dieser Fehlertyp kann nicht mehr unbemerkt durchrutschen
- Die in v0.264 eingebaute Fehlergrenze hätte den Absturz ohnehin abgefangen und die Meldung angezeigt, statt die Seite grau zu lassen

## v0.264 · 26.07.2026 · Rollen pflegbar, Rechtstexte, Fehlergrenze
- **Rollen & Rechte editierbar** (`roles`-Tabelle mit RLS, Seed aus der bisherigen Code-Matrix): Rechte per **Häkchen** vergeben und entziehen, je Rolle speichern. **Eigene Rollen** anlegen (z. B. „Werkstudent") und löschen, solange ihnen niemand zugewiesen ist. Der Prozess hält einen Rollen-Cache; fehlt die Tabelle, greift weiterhin die Code-Matrix, die Plattform bleibt immer funktionsfähig
- **Sicherheitsanker**: Der Administrator behält immer alle Rechte, Systemrollen sind nicht löschbar, vergebbar sind nur Rechte aus dem bekannten Katalog (kein Freitext), jede Änderung erzeugt `ROLE_PERMISSIONS_CHANGED` im Audit-Trail
- Neues Recht **„Alle Mandate sehen"** (`projects.all`), ohne dieses Recht sieht eine Rolle nur Mandate, die sie angelegt hat oder in denen sie Mitglied ist. Der Admin-Zugang hängt jetzt an der Rollen-Kennzeichnung „intern", nicht mehr an einer festen Liste
- **Nutzungsbedingungen (AGB)** unter `/agb`: Anbieter, kein Beratungsvertrag durch Nutzung, Zugang und Freischaltung, Vertraulichkeit (inkl. Verbot der De-Anonymisierung und der Direktansprache von Mitarbeitern des Zielunternehmens), Protokollierung, Pflichten, indikativer Charakter der Bewertungsergebnisse, Haftung, Beendigung, Recht und Gerichtsstand
- **Cookie-Richtlinie** unter `/cookies` mit einer ehrlichen Tabelle: gespeichert werden nur `phalanx_token` (Anmeldung), `cm_lang` (Sprache) und `cm_cookie_notice`, **kein** Analytics, **kein** Pixel, **kein** Tracking. Deshalb ein **Hinweis-Banner statt Schein-Consent**: Ein Dialog mit „Alle ablehnen" würde eine Wahl vortäuschen, die es hier nicht gibt
- **Datenschutzerklärung** ergänzt um: CRM-Ansprache (berechtigtes Interesse bzw. Einwilligung, Widerspruchsrecht, Selbstpflege-Link, Ende der Erinnerungen), Protokollierung von Zugriffen und sicherheitsrelevanten Vorgängen, Zwei-Faktor-Authentifizierung (Geheimnis und Backup-Codes nur als Hash)
- **Fehlergrenze** (`ErrorBoundary`): Stürzt eine Seite ab, erscheint die Fehlermeldung mit Komponentenpfad und ein Weg zurück, statt der leeren grauen Fläche, bei der weder Nutzer noch wir etwas erfahren
- **Auslieferungsfix**: Der Client wurde nur bei `NODE_ENV=production` ausgeliefert. Fehlte die Variable, lief die API, aber jeder Deep-Link (`/projekte`, `/crm`, F5, geteilte Links) lief ins Leere. Jetzt wird der Build ausgeliefert, sobald `client/dist/index.html` existiert; `/api/*` bleibt davon unberührt
- Verifiziert: 16 Tests (Code-Fallback, DB-Rollen, entzogene Rechte, eigene Rollen, Admin-Anker, interne vs. externe Rollen)

## v0.263 · 25.07.2026 · Aktivitäten im Klartext, Absprünge, Pipeline-Schritt „Ansprache"
- **Aktivitäten lesbar**: Statt `ACCESS_DOCLIST · Peter Baumgartner · documents #7` steht dort jetzt „**Peter Baumgartner** hat die Dokumentenliste geöffnet · **FARADAY** · Baumgartner Beteiligungen". Die Ressourcen-ID der Zugriffs-Aktionen ist die Mandats-ID, sie wird sauber zum Codenamen aufgelöst
- **Absprünge**: Klick auf den Namen öffnet die Kontakt-360°-Ansicht (der Kontakt wird bei Bedarf aus dem Nutzerkonto angelegt), Klick auf das Mandat führt auf die Mandatsseite. Das Unternehmen des Kontakts steht daneben
- Gilt für beides: die Kachel „Letzte Aktivitäten" in der Übersicht **und** den Tab „Aktivitätslog" (dort mit eigenen Spalten Wer / Was / Mandat / Unternehmen)
- **Neuer Deal-Status „Ansprache"** (`outreach`) zwischen „Teaser live" und „In Diligence": Der Marktplatz-Teaser steht, die aktive Käuferansprache läuft über den CRM-Funnel, erst wenn ein Interessent in die Prüfung geht, wechselt das Mandat nach „In Diligence". Übergänge in beide Richtungen erlaubt, ein Sprung von „Ansprache" direkt auf LOI nicht

## v0.262 · 24.07.2026 · Sprint 13: CRM V · Rollen & Rechte, 2FA, DSGVO-Härtung
- **Zwei-Faktor-Authentifizierung (TOTP, RFC 6238)**, eigene Implementierung ohne externe Abhängigkeit: HMAC-SHA1, 30-Sekunden-Fenster, ±1 Fenster Drift-Toleranz, zeitkonstanter Vergleich. Kompatibel mit Google/Microsoft Authenticator, 1Password, Authy. Einrichtung im Profil: Link antippen oder Geheimnis abtippen → mit Code bestätigen → **8 Backup-Codes** (nur als Hash gespeichert, einmal einlösbar)
- Login ist zweistufig: nach dem Passwort eine **kurzlebige Challenge (5 Min.)**, erst der Code schaltet frei. Deaktivieren nur mit gültigem Code. `REQUIRE_2FA_STAFF=1` macht 2FA für interne Rollen verpflichtend
- **Granulare Rollen** (`middleware/permissions.js`, die Matrix liegt bewusst im Code, ist Teil des Audits und nicht still per SQL änderbar): **Administrator** (alles), **Mandanten-Eigentümer**, **Berater** (eigene Mandate, CRM, Mailversand), **Assistenz** (pflegen ja, versenden und löschen nein), **Analyst** (nur lesen)
- **Sichtbarkeit**: Berater, Assistenz und Analyst sehen nur Mandate, die sie angelegt haben oder in denen sie Mitglied sind, Administrator und Eigentümer sehen alles
- Schreibende, löschende und versendende Endpunkte im CRM sind jetzt einzeln über `requirePermission()` abgesichert (vorher galt: „advisor darf alles, was der Admin darf")
- Neuer Admin-Bereich **„Rollen & Rechte"** mit der vollständigen Matrix; Rollenzuweisung direkt in der Nutzerliste (die eigene Rolle ist gesperrt, Administratorrechte vergibt nur ein Administrator)
- **DSGVO**: **Datenauskunft nach Art. 15** je Kontakt als JSON (Stammdaten, Mandate, Einladungen, Mailings, Nachrichten, Pflege-Links, Änderungen, Aufgaben) und **Recht auf Vergessenwerden nach Art. 17**, personenbezogene Daten werden gelöscht, Mailinhalte entfernt, offene Zugänge entwertet; die **Prozesshistorie bleibt als Nachweis** (Rechenschaftspflicht, Art. 5 Abs. 2)
- Verifiziert: 35 Tests (alle RFC-6238-Vektoren, Drift-Toleranz, Backup-Code-Verbrauch, Rechte-Matrix je Rolle, Mandats-Sichtbarkeit)

## v0.261 · 23.07.2026 · Sprint 12: Ausführliche Bewertung 2.0 (DCF, Sensitivität, Benchmarking)
- **Discounted Cash Flow** (`server/valuation/dcf.js`): Fünfjahresplanung (Umsatzwachstum, EBIT-Marge, AfA-, Capex- und Working-Capital-Quoten), **FCFF**, Diskontierung mit **Mid-Year-Convention**, Fortführungswert nach **Gordon Growth**, Equity Bridge über die Netto-Finanzschulden
- **Kapitalkosten (WACC)** nach CAPM mit KMU-Realität: Basiszins + Beta × Marktrisikoprämie + **Small-Size-Prämie** + **Fungibilitätszuschlag**; eine schwache Scorecard erhöht den Zins automatisch. Fremdkapital mit Tax Shield, Standard ist cash-/debt-free
- **Sensitivitätsmatrix** 5 × 5: Enterprise Value über WACC × ewiges Wachstum, Basisfall hervorgehoben. Der **Anteil des Fortführungswerts** wird ausgewiesen, je höher, desto stärker hängt der Wert an Langfristannahmen
- **Benchmarking** (`valuation_benchmarks`, 20 Branchen mit Quartilsbändern, RLS, im Admin pflegbar): EBIT-Marge, Umsatzwachstum (CAGR) und Personalkostenquote gegen p25 / Median / p75, mit Ampel und ehrlichem Gesamturteil („über Markt", „gemischt", „unter Markt"; „über Markt" nur bei echter Mehrheit)
- **Methodenvergleich**: Multiplikator, Ertragswert und DCF nebeneinander als Balken, dazu die **Spannweite über alle Verfahren**, kein Scheinkonsens
- **Neuer Wizard-Schritt „Planung & DCF"**: Wer nichts ausfüllt, bekommt konservative Ableitungen aus der Historie (Wachstum gedeckelt auf ±5 % p. a., kein Wunschdenken)
- **PDF-Report** um DCF-Seite (Planungstabelle, Barwerte, WACC-Herleitung), Sensitivitätsmatrix und Benchmarking erweitert
- Verifiziert: 44 Tests (WACC, FCF-Projektion, Mid-Year-Diskontierung, Gordon Growth, `WACC ≤ g` abgefangen, Sensitivitätsmonotonie, Equity Bridge, Benchmark-Einordnung, Ende-zu-Ende inkl. PDF)

## v0.260 · 22.07.2026 · Mail-Ausgang zeigt die Mails, Feedback löschbar
- **Fehler behoben (Mail-Ausgang)**: Der Typfilter zählte Mails („Pflege-Link (3)"), die Liste blieb aber leer. Ursache: `(? IS NULL OR e.mail_type = ?)`, Postgres kann den Typ eines nackten Platzhalters in `? IS NULL` nicht ableiten, die Abfrage scheiterte, und ein `.catch(() => [])` verschluckte den Fehler. Die WHERE-Klausel wird jetzt dynamisch gebaut, der Fehler nicht mehr unterdrückt
- **Feedback löschen**: `DELETE /api/community/feedback/:id` (Audit-Eintrag `FEEDBACK_DELETED`) + Löschen-Aktion im Admin. Hinweis: Feedback (Seite `/feedback`) und Q&A (Fragen zu Mandaten) sind zwei getrennte Bereiche, eine gelöschte Q&A-Frage taucht nicht im Feedback auf und umgekehrt

## v0.259 · 21.07.2026 · Mail-Ausgang, editierbare Systemtexte, Doppelversand-Sperre
- **Mail-Ausgang** (neuer Admin-Tab, `email_log` mit RLS): **jede** versendete Mail wird protokolliert, Zeitpunkt, Empfänger, Betreff, Art, Mandat, Status. Klick auf eine Zeile zeigt **das Original-HTML**, exakt so, wie es beim Empfänger ankam (sandboxed iframe). Filter nach Art und Suche über Empfänger/Betreff
- **Audit-Trail**: Jeder Versand erzeugt `MAIL_SENT` (bzw. `MAIL_FAILED`) mit **Art der Mail**, Betreff und Empfänger, man sieht also, *welche Art* von Mail rausging
- **Pflege-Link** und **DSGVO-Einladung** laufen jetzt über Systemvorlagen (`profile_link`, `crm_invite`), **Betreff und Text im Admin unter „Mailvorlagen" frei änderbar**, mit Vorschau. Fällt eine Vorlage weg, greift der bisherige Text als Fallback
- **Doppelversand-Sperre**: Existiert bereits ein aktiver Pflege-Link aus den letzten **14 Tagen**, lehnt der Server ab (`PROFILE_LINK_RECENT`) und nennt das Versanddatum. Die Oberfläche fragt nach, erneut senden geht nur bewusst (`force`)
- Zur Erinnerung, was der Pflege-Link ist: ein **persönlicher, 60 Tage gültiger Link**, über den der Kontakt seine eigenen Daten sieht und korrigiert (Kontaktdaten, Branchen- und Regionenfokus, Ticketgröße) und seine Kontaktpräferenz setzt, bis hin zur vollständigen Abmeldung

## v0.258 · 20.07.2026 · Q&A-Optionen & Nutzer direkt ansprechen
- **Q&A beantworten** mit zwei Schaltern: **Antwort per E-Mail zustellen** (Standard) oder still speichern, und **im Mandat für alle Interessenten anzeigen** (FAQ). Veröffentlicht werden nur Frage und Antwort; **der Fragesteller bleibt anonym**
- Sichtbarkeit jederzeit wieder zurücknehmbar; **Fragen löschen** (Test- oder Dublettenfragen) mit Audit-Eintrag
- Im Mandat sehen Interessenten ihre eigenen Fragen **plus die freigegebenen häufigen Fragen**, als „Häufige Frage" gekennzeichnet
- **Nutzerliste**: Klick auf den Namen öffnet die Kontakt-360°-Ansicht; existiert noch kein CRM-Kontakt, wird er aus dem Nutzerkonto angelegt und verknüpft (`POST /crm/contacts/from-user/:userId`)
- **Direkt ansprechen**: „✉ Mail" öffnet das Mailprogramm, „💬 Chat" springt in den Plattform-Chat mit diesem Nutzer

## v0.257 · 19.07.2026 · Dashboard-Korrekturen, Funnel-Archiv, mehr Englisch
- **Q&A**: Die Kachel „Offene Q&A-Fragen" führte ins Projekte-Tab. Jetzt gibt es einen **eigenen Q&A-Bereich** (`GET /admin/questions`), offene Fragen mit Mandat, Fragesteller und Antwortfeld; die Antwort geht wie gehabt per E-Mail raus
- **Offene Wiedervorlagen**: Kachel war nicht anklickbar und zählte die verwaiste `tasks`-Tabelle aus Sprint 4. Jetzt zählt sie die echten **CRM-Wiedervorlagen** (`crm_tasks`), zeigt Überfällige rot und führt in den Tab
- **Datenraum-Zugriffe**: Die Abfrage suchte nach Aktionen (`DOWNLOAD_DOCUMENT`, `DOWNLOAD_SIGNED_LINK`), die nie geloggt werden, der Wert war praktisch bedeutungslos. Jetzt werden die tatsächlich protokollierten Aktionen gezählt: `DOWNLOAD_LINK_CREATED`, `SAFE_DOWNLOAD`, `EXPOSE_PDF`, `EXPOSE_VIEW`, `ACCESS_DETAILS`, `ACCESS_DOCLIST`
- **NDA-Freigaben**: Kachel eindeutig benannt (verlinkt korrekt auf die NDA-Anfragen)
- **Deal-Funnel**: Nur laufende Mandate stehen als Reiter; **abgeschlossene Mandate und Entwürfe wandern ins Klappmenü „Archiv & Entwürfe"**, bleiben also erreichbar, verstopfen aber nicht die Leiste. Beim Öffnen wird ein laufendes Mandat vorausgewählt
- **Englisch erweitert**: Navigation (Desktop und Mobil), Marktplatz (Hero, Filter, Tabelle, Aktionen), Anmeldung und Fußzeile; Sprachumschalter jetzt auch im Mobilmenü. Interne Bereiche (CRM, Admin) bleiben bewusst deutsch

## v0.256 · 18.07.2026 · Posteingang (BCC-Ingest), Wiedervorlagen & Sprachumschaltung
- **BCC-Ingest** (`POST /api/inbound/email`): Beim Mailprovider (Brevo Inbound, Mailgun, Postmark) eine Adresse wie `inbox@capitalmatch.de` auf den Endpoint routen und ins BCC setzen, Antworten landen automatisch beim richtigen Kontakt. Absender wird über die E-Mail-Adresse gematcht, das Mandat über den **Codenamen im Betreff**. Geschützt über `INBOUND_SECRET` (ohne Secret ist der Endpoint deaktiviert); unbekannte Absender werden **nicht** angelegt, nur protokolliert
- **Manuelle Erfassung** in der Kontaktansicht, funktioniert ohne jede Provider-Konfiguration: Antwort einfügen, fertig
- Eine eingegangene Antwort **stoppt sofort alle laufenden Erinnerungen**, setzt `replied = 1`, zieht den Funnel auf **Stufe 2 („Rückmeldung")** und legt eine **Wiedervorlage in zwei Tagen** an
- **Wiedervorlagen** (`crm_tasks`): neuer Admin-Tab mit Kennzahlen (offen / heute fällig / überfällig), Frist per Datumsfeld verschiebbar, Aufgaben auch direkt am Kontakt; automatisch erzeugte Aufgaben sind als solche gekennzeichnet
- Kontakt-Timeline zeigt jetzt auch **eingegangene Antworten** und Wiedervorlagen
- **Sprachumschaltung DE / EN** in der Kopfzeile: i18n-Fundament mit deutschem Fallback (fehlende Übersetzungen zeigen weiterhin den deutschen Text), Wahl im Browser gespeichert und beim eingeloggten Nutzer im Profil (`users.language`). Übersetzt sind zunächst Navigation und Kernbegriffe, der Rest folgt Seite für Seite
- Verifiziert: 15 Unit-Tests (Adress-Parsing, Zitat-/Signatur-Kürzung, Mandats-Erkennung, Reminder-Stopp, Auto-Wiedervorlage, unbekannte Absender)

## v0.255 · 17.07.2026 · Prozess-Mailvorlagen für die Käuferansprache
- **11 Systemvorlagen** entlang des Sell-Side-Prozesses: Wiederaufnahme der Kommunikation, Erstansprache, Nachfassen, NDA anfordern, NDA-Erinnerung, IM/Unterlagen freigegeben, Management-Gespräch, indikatives Angebot (mit Frist), Due-Diligence-Freigabe, Absage im Prozess, Kontakt schließen
- **Versand aus dem Funnel** an eine Auswahl (Button „Prozess-Mail (n)") oder **aus der Kontaktansicht** an einen einzelnen Kontakt, inklusive **Live-Vorschau mit den echten Daten** des ersten Empfängers
- **Platzhalter**: `{{anrede}} {{mandat}} {{branche}} {{region}} {{umsatz}} {{ebitda}} {{transaktionsart}} {{unternehmen}} {{frist}} {{berater}}`, Eckdaten-Tabelle, Unterschrift und DSGVO-Hinweis werden automatisch ergänzt
- Text und Betreff **pro Versand einmalig anpassbar**, ohne die Vorlage zu überschreiben; **Funnel-Stufe zieht auf Wunsch automatisch nach**; optional Reminder Tag 7/21
- CTA-Ziel je Vorlage: Mandatsseite, Einwilligung (Double-Opt-in) oder Selbstpflege-Portal, Tokens werden nur erzeugt, wenn die Vorlage sie braucht
- Neuer Admin-Tab **„Mailvorlagen"**: alle Vorlagen einsehen, ändern, deaktivieren, eigene ergänzen; Systemvorlagen sind änderbar, aber nicht löschbar
- Verifiziert: 20 Unit-Tests (Platzhalter, Anrede, Frist, CTA-Auflösung, Override, HTML-Escaping)

## v0.254 · 16.07.2026 · Mandat FARADAY live + Kontakt-360°-Ansicht
- **FARADAY vollständig online**: Elektrotechnik-/Energiedienstleister (Bayern, Metropolregion Nürnberg), Umsatz € 1,65 Mio., EBIT-Marge 14,4 %, 260+ Ladepunkte, Pflichtnehmer-Stellung bei einem Messe-/Kongressstandort. Eckdaten, Detailseite, **vollständiges Exposé** (9 Sektionen + Keyfacts) und Dokumenten-Slots (Teaser öffentlich, IM + Finanzplanung nach NDA), durchgängig **anonymisiert** (kein Klar-, Inhaber- oder Kundenname)
- **Kontakt-360°-Ansicht** (`ContactDrawer`): Klick auf einen Namen im Deal-Funnel, in der CRM-Kontaktliste oder im Admin-Dashboard öffnet Stammdaten (editierbar), Mandats-Zuordnungen und die vollständige Historie
- **Aktivitäten-Timeline** je Kontakt: Einladung versendet/geöffnet, Einwilligung erteilt (mit Nachweis), Konto angelegt, Mandats-Mailing, Erinnerung 1/2 bzw. 2/2, Pflege-Link versendet/geöffnet, Selbstpflege gespeichert, Widerspruch
- Funnel-Stufe und Beteiligten-Status direkt aus der Kontaktansicht änderbar; Pflege-Link und DSGVO-Einladung mit einem Klick
- Neuer Admin-Tab **„Kontakte"** mit Suche über Name, E-Mail und Unternehmen (Einwilligungs-Ampel, Mandatszahl, letzte Ansprache, Konto-Status)

## v0.253 · 15.07.2026 · CRM III: Mandats-Mailings & automatisches Nachfassen
- **„Alle auswählen"** im Deal-Funnel: global oder je Funnel-Stufe (Klick auf die Spaltenüberschrift). Kontakte mit Widerspruch werden gar nicht erst angehakt
- **Massenmailing je Mandat** (`crm_campaigns`): eine professionell aufgebaute M&A-Ansprache mit anonymem Kurzprofil (Branche, Region, Umsatz-/EBITDA-Band, Transaktionsart), Prozessablauf (Teaser → NDA → IM/Datenraum → Gespräch/LOI), Beraterunterschrift und Rechtshinweis
- Drei Zwecke in **einer** Mail: Einladung zum Mandat, **DSGVO-Einwilligung (Double-Opt-in)** und **persönlicher Pflege-Link** für Kontaktdaten/Suchprofil
- Kontakte mit bestehender Einwilligung erhalten dieselbe Mail ohne Consent-Schleife, direkt mit Link auf das Mandat
- **Reminder-Automatik**: höfliche Erinnerung an **Tag 7**, abschließende Nachfrage an **Tag 21**, danach endgültig Schluss. Jede Reaktion (Zustimmung, Absage, Statuswechsel im Funnel, Widerspruch) stoppt die Serie sofort; je Kampagne abschaltbar
- **Prozess-Updates**: freie Nachricht an alle **aktiven, eingewilligten** Beteiligten; **wesentliche Änderungen am Mandat** (Branche, Region, Bänder, Transaktionsart, Kurzbeschreibung, Phase) lösen sie automatisch aus, mit 24-h-Bremse gegen Mail-Fluten
- Reaktionsquote je Mailing im Board sichtbar; Funnel zieht automatisch auf „Angesprochen" nach
- Verifiziert: 25 Unit-Tests (Reminder-Fälligkeit, Stopp-Bedingungen, Opt-out-Sperre, Änderungserkennung, Mailaufbau)

## v0.252 · 14.07.2026 · CRM IV: Kontakt-Selbstpflege-Portal
- **Persönlicher, befristeter Link** (60 Tage, widerrufbar): Der Kontakt sieht genau, was gespeichert ist, und korrigiert es selbst, neue Seite `/profil-pflege`
- Pflegbar: Kontaktdaten, Position, Standort, **Brancheninteressen**, **geografischer Fokus**, **Ticketgröße (von/bis)**, Investitionsschwerpunkt, **Kommunikationswunsch**
- **DSGVO**: „Keine E-Mails mehr" oder vollständiger Widerspruch, jederzeit, ohne Begründung; Widerspruch entwertet alle Links und sperrt jede weitere Ansprache
- **Revisionssicheres Änderungsprotokoll** (`crm_profile_changes`, Vorher/Nachher); je Link wahlweise **direkte Übernahme oder interne Freigabe** (Review-Kasten im CRM)
- **Sicherheit:** Über die öffentliche Route sind ausschließlich Profilfelder änderbar, Einwilligungsstatus, Kontaktstatus, Entscheider-Flag, IDs und Rollen sind unangreifbar (verifiziert)
- Schema: `crm_profile_links`, `crm_profile_changes` (RLS) + Profilfelder auf `crm_contacts`

## v0.251 · 13.07.2026 · Birdview + CRM: Zusammenführen & Kontaktpflege
- **Birdview**: Super-Admin kann die Plattform aus Sicht eines Nutzers ansehen (`POST /api/admin/impersonate/:userId`)
  - JWT trägt den Claim `imp`; die Auth-Middleware erzwingt **strikte Leserechte**: alle schreibenden Methoden werden blockiert, Admin- und CRM-Bereich sind komplett gesperrt (auch über `optionalAuth`, kein Schlupfloch)
  - Unübersehbares Banner mit Ein-Klick-Rückweg; Token nur 2 h gültig
  - Revisionssicher: `impersonation_log` (wer, wen, wann, IP) + `IMPERSONATE_START/END` im Audit-Trail
  - Ansicht anderer Super-Admins ausgeschlossen
- **CRM: Unternehmen zusammenführen** (`POST /api/crm/companies/:id/merge`), Kontakte, Funnel-Einträge und Konzern-Verweise wandern mit, leere Felder werden aufgefüllt, Notizen und Tags zusammengeführt, Dublette gelöscht
- **CRM: Kontaktpflege aus der Unternehmensansicht**, Ansprechpartner direkt anklicken und bearbeiten; Unternehmens-Kontaktdaten (Anschrift, Website, Umsatz, Mitarbeiter) auf einen Blick

## v0.250 · 13.07.2026 · Kontakte Mandaten zuordnen + Deployment-Fix
- Kontakte lassen sich Mandaten zuordnen: Rolle (Käufer/Berater/Verkäufer/Bank/Anwalt/Ziel) + Funnel-Stufe, aus der Kontaktliste und direkt im Funnel-Board
- **Fix:** `client/dist` ist im Repo eingecheckt und wird ausgeliefert, wurde aber nicht mitcommittet → Server lief auf v0.249, Oberfläche kam aus v0.248. Der Client-Build wird ab sofort mitcommittet.

## v0.249 · 13.07.2026 · Sprint 20: Deal-Funnel, Kontakt-Import & DSGVO-Einladung
- **Teaser-One-Pager**: `teaserReport.js` auf gemessene Zeilenhöhen umgebaut (kein Überlauf mehr) und hart auf **eine Seite** begrenzt (Beschreibung wird am Satzende gekürzt, Highlights nur soweit sie passen). Download nach Login (`GET /api/projects/:id/teaser.pdf`)
- **Sell-Side-Funnel je Mandat** (`crm_deal_parties`): Longlist → Angesprochen → Rückmeldung → NDA → IM → Gespräch → LOI → DD → Abschluss; Kanban mit Drag & Drop, Rolle (Käufer/Berater/Verkäufer/Bank/Anwalt), Status (aktiv/offen/unklar/ausgestiegen)
- **Verweildauer je Stufe** + Stagnations-Warnung (> 30 Tage ohne Fortschritt); Conversion je Stufe
- **Import des ersten Schwungs echter Phalanx-Kontakte** aus dem Exchange-Funnel: 189 Unternehmen, 222 Kontakte, 233 Funnel-Einträge über 5 Mandate; RENOVAPRESS/FARADAY/Defacto als **Entwurf** angelegt (nicht im Marktplatz)
- **DSGVO: Double-Opt-in-Einladung** (`crm_invitations`), Einladung → Empfänger bestätigt Einwilligung **aktiv** (Nachweis: Zeitpunkt, IP, Textversion) → **erst dann** Kontoanlage. Widerspruch setzt den Kontakt dauerhaft auf „nicht kontaktieren"; Sammel-Einladung überspringt Widersprüche automatisch
- Neue Seite `/einwilligung`; CRM-Tab „Deal-Funnel" mit Mehrfachauswahl für die Einladung

## v0.248 · 12.07.2026 · Sprint 19: CRM I · Unternehmen & Kontakte
- Zentrale **Unternehmensdatenbank**: Stammdaten, Website, Branche, Region, Umsatz, Mitarbeiter, Unternehmensart, Käuferkategorie, Investitionskriterien, Notizen, Tags
- **Kontakte** mit Entscheider-Kennzeichnung, Verantwortungsbereich, Beziehung sowie **DSGVO-Einwilligung** (`consent_status` + Zeitstempel) und Kontaktstatus (aktiv / nicht kontaktieren / unzustellbar)
- **n:m-Zuordnung**: ein Kontakt in mehreren Unternehmen, mit **Historie** früherer Positionen und Unternehmenswechsel (`ended_on`)
- **Konzernverknüpfung** (Mutter / Tochter / Beteiligung) inkl. Anzeige der Tochtergesellschaften
- **Dubletten-Erkennung** über normalisierte Namen (erkennt „GmbH" ↔ „G.m.b.H.", „Müller" ↔ „Mueller", Holding-Zusätze); Anlegen nur mit bewusster Bestätigung
- **CSV-Import/Export** für Unternehmen und Kontakte; beim Kontakt-Import werden genannte Unternehmen automatisch angelegt und verknüpft, Dubletten übersprungen
- Neue Seite `/crm` (Admin/Berater), Schema `crm_companies`, `crm_contacts`, `crm_company_contacts` (alle mit RLS)

## v0.247 · 12.07.2026 · Sprint 19a: Mandats-Einladungen (Betrachter / Pflegender)
- Pflegende laden Kontakte per E-Mail zum Mandat ein, als **Betrachter** (nur lesen) oder **Pflegender** (bearbeiten)
- **Einladungs-Funnel**: eingeladen → geöffnet → angenommen (+ abgelehnt/widerrufen/abgelaufen), mit Erinnerung & Widerruf
- Eingeladene ohne Konto registrieren sich über den Token und sind **sofort freigeschaltet** (Token belegt die E-Mail-Adresse), keine Wartezeit in der Admin-Freigabeschlange
- Rollen jederzeit änderbar (Betrachter ↔ Pflegender), Zugriff entziehbar; „👥 Team"-Panel im Mandat
- **Sicherheitsfix:** bis dato galt *jede* `project_members`-Zeile als Vollzugriff. Neue zentrale Rollenauflösung (`utils/projectAccess.js`) trennt `manager` / `viewer`, Betrachter können Safe-Dateien nicht mehr schreiben/löschen und Exposés nicht veröffentlichen
- Login unterstützt jetzt Rücksprung (`?redirect=`), damit eingeladene Nutzer ihren Token nicht verlieren
- Schema: `project_invitations` (RLS); Endpoints unter `/api/invitations`

## v0.246 · 11.07.2026 · Sprint 18: Engagement-Mailings
- **Newsletter** zu neuen Mandaten (opt-in, jederzeit abbestellbar)
- **Folgen**: automatisch bei Interesse/NDA (`watchlist.source='auto'`), zusätzlich manuell per Stern auf der Mandatsseite
- **Änderungs-Mails** an Follower: Mandatspflege, Exposé veröffentlicht, Deal-Status (Due Diligence, LOI, Abschluss)
- **Ähnlichkeits-Matching** aus dem Interesse-Funnel (Score: Branche 3, Region 2, Mandatstyp/Umsatz/Deal-Art je 1)
- **Anti-Doppel-Mail-Kaskade** bei Publish: Suchprofil → Ähnlichkeit → Newsletter; jeder Nutzer erhält höchstens EINE Mail
- Neuer Profil-Bereich „Benachrichtigungen" (granulares Opt-in/Opt-out, DSGVO); „Ähnliche Mandate" auf der Mandatsseite
- Schema: `notification_prefs` (RLS), `watchlist.source`; Endpoints `/api/community/notifications`, `/api/community/similar/:projectId`

## v0.245 · 11.07.2026 · Exposé-PDF: dynamisches Layout
- Eckdaten-Raster jetzt **dynamisch vermessen** (`heightOfString`): Zeilenhöhe = max. Höhe beider Spalten
- Label über Wert gestapelt → beliebig lange Werte brechen sauber um, keine Überlappung mehr (vorher fixe 22-pt-Boxen)
- Überschriften nie allein am Seitenende; Vertraulichkeitshinweis wird vor dem Zeichnen vermessen
- Typografie: Zahl + Einheit werden nicht getrennt („60 %", „€ 3,46 Mio.", „p. a.")

## v0.244 · 11.07.2026 · Dokument-Upload, vollständige Exposés & Exposé-PDF
- Neuer Endpoint `POST /api/documents/:projectId/:docId/file`: Datei an ein **bestehendes** Dokument hängen (Nachreichen/Ersetzen)
- Admin-Dokumentliste: Badge „keine Datei" + Upload-/Ersetzen-Button je Eintrag
- Exposés für „Betongold" und „Cudd" vollständig befüllt (14 DUB-Eckdaten + alle Sektionen, anonymisiert, veröffentlicht)
- Exposé-PDF-Upload: `POST /api/exposes/:projectId/pdf-upload` legt ein fertiges PDF im Safe ab; `GET /pdf` liefert es dann statt der Generierung (`pdf-remove` schaltet zurück)
- Schema: `exposes.pdf_item_id` → `safe_items`

## v0.243 · 10.07.2026 · Sprint 17: Gamification (XP & Level)
- XP für echte Prozessschritte: Interesse (15), NDA signiert (40), Datenraum (25), LOI (75), Watchlist (5), Kontakt (10)
- Großer Bonus für Deal-Abschluss über die Plattform (300) an die beteiligten Käufer
- Level Entdecker → Insider → Dealmaker → Power-/Elite-Dealmaker; Fortschrittsanzeige im „Mein Bereich"
- Idempotentes Eventlog `xp_events` (RLS); Endpoint `GET /api/gamification/me`; Vergabe an denselben Events wie die Deal-Timeline

## v0.242 · 10.07.2026 · Sprint 16: Admin-Dashboard 2.0 (Analytics)
- Statische Schnellzugriff-Blöcke → datengetragene Kacheln mit Live-Kennzahlen (offene NDAs, Feedback, Q&A, …)
- Deal-Funnel mit Conversion-Raten (Interesse → NDA → signiert → Datenraum → LOI → Closing)
- Zeitreihen-Sparklines (7/30/90 Tage, YTD): neue Nutzer, NDAs, Datenraum-Zugriffe, Nachrichten
- Mandats-Ranking mit Stagnations-Warnung; klickbare KPIs; CSV-Export fürs Transaktionscontrolling
- Backend: `GET /api/admin/analytics?range=…` (Funnel, Zeitreihen, Ranking, Badges, Feed)

## v0.241 · 10.07.2026 · Sprint 15: Vernetzung Käufer ↔ Berater (Chat)
- Interesse/NDA verbindet Käufer automatisch mit dem Mandatsberater und legt einen mandatsbezogenen Chat-Thread an
- Neuer Einstieg „Chat mit Ihrem Berater starten" im Mandat (`POST /api/messages/contact-advisor`)
- Prozess-Ereignisse als Systemnachrichten/Timeline im Chat: NDA angefordert/unterzeichnet, Due Diligence, LOI, Closing
- Intro-Mail an den Käufer; Mandats-Codename als Kontext an jeder Nachricht
- Technik: `messages.project_id` + `type` (user/system), Helfer `utils/dealChat.js`, Trigger in NDA- & Deal-Status-Flow

## v0.240 · 10.07.2026 · Zwei neue M&A-Mandate & erweiterte Roadmap
- Neues Mandat „Betongold": Nachfolge/Komplettverkauf einer Architekturbeton-Manufaktur (3. Gen., € 3,46 Mio. Umsatz 2024)
- Neues Mandat „Cudd": Transformations-/Turnaround-Case einer Premium-Kindermarke (2025: € 13,1 Mio., 2026e ~€ 10 Mio. Run-Rate)
- Roadmap Sprint 15: Vernetzung Käufer↔Verkäufer über Chat (Interesse → Intro → mandatsbezogener Chat, Prozess-Trigger)
- Roadmap Sprint 16: XP-/Level-Gamification für Prozessschritte (NDA, DD, LOI) und Deal-Abschluss über die Plattform
- Öffentliche Roadmap um beide Punkte ergänzt

## v0.239 · 06.07.2026 · Roadmap aktualisiert & CRM aufgenommen
- Öffentliche Roadmap: Käufer-Cockpit, In-App-Nachrichten & Mobil-Optimierung auf „Verfügbar" gesetzt
- Neuer geplanter Punkt: Beziehungs- & Deal-Management (CRM), Analyse folk.app, Konzept in ROADMAP.md (Sprint 14)
- Standing Rule dokumentiert: Changelog + Roadmap werden bei jeder Änderung automatisch mitgeführt

## v0.238 · 06.07.2026 · Mobile-First: responsive Darstellung
- Navigation mit Hamburger-Menü auf Smartphone & Tablet
- Mehrspaltige Layouts (Marktplatz, Nachrichten, ausführliche Bewertung, Admin) stapeln sich auf kleinen Bildschirmen
- Breite Datentabellen sind auf dem Handy horizontal scrollbar statt abgeschnitten
- Filter-Seitenleiste im Marktplatz auf Mobil optimiert (nicht mehr klebend)
- Globale Basis: kein horizontales Verrutschen, touch-freundliche Bedienelemente, Viewport-gerechte Schriftgrößen
- Umsetzung: `useIsMobile`-Hook + globales `index.css` (Inline-Grids brechen per `!important` auf eine Spalte um)

## v0.237 · 05.07.2026 · E-Mail-Bestätigung, Nachrichten & Paygate-Vorbereitung
- Registrierung erst nach Bestätigung der E-Mail-Adresse abgeschlossen (Login-Gate + „erneut senden")
- In-App-Nachrichten & Kontakte (Netzwerk) zwischen bestätigten Nutzern
- Ausführliche Bewertung: Paygate vorbereitet, kostenlos bis 31.08.2026 (`VALUATION_FREE_UNTIL`/`VALUATION_PAYWALL`)
- Changelog-Historie vervollständigt (v0.232, v0.233, v0.235 nachgezogen)

## v0.236 · 05.07.2026 · Käufer-Cockpit, Merkliste & Kontakt
- Marktplatz: Tabellenansicht (Dealum-Stil), Suchprofile mit Umsatz-/EBITDA-Filter
- Merkliste mit eigenen Tags und Notizen je Mandat
- Digest-Mails (täglich/wöchentlich) für passende neue Mandate
- Neue Kontaktseite; Robot-/Spam-Schutz (Honeypot + Rate-Limit) für Nachrichten
- Links in E-Mails auf capitalmatch.de umgestellt

## v0.235 · 05.07.2026 · Feedback, Changelog & Suchprofile
- Feedback-Seite (Käufer/Verkäufer) mit öffentlicher Roadmap; Admin-Tabs Feedback + Changelog
- Suchprofile/gespeicherte Suchen + Sofort-Match-Benachrichtigung bei Veröffentlichung

## v0.234 · 05.07.2026 · Kommunikation & Sicherheit
- Alle Kunden-E-Mails im Phalanx-Design mit Impressum-Footer
- Q&A: Direkt-Antwort für Berater, Antwort automatisch an den Fragenden
- Teaser-/Exposé-PDF mit sichtbarem Audit-Stempel
- Mobilnummer im Profil verpflichtend (Basis 2-Faktor-Authentifizierung)

## v0.233 · 05.07.2026 · Q&A, Verkäufer-Pflege & Teaser-PDF
- Q&A für Admin/Pfleger nutzbar; Exposé-/Safe-Einstiege für Verkäufer
- Teaser als PDF mit Briefbogen, Markierung und Audit-Trail

## v0.231 · 05.07.2026 · Exposé-Builder (Sprint 9)
- Strukturiertes Verkaufs-Exposé (DUB-Eckdaten, Sektionen, Safe-Bildergalerie)
- Web-Exposé hinter NDA-Gate; PDF-Export mit Empfänger-Wasserzeichen

## v0.229 · 05.07.2026 · Container-Safe (Sprint 8)
- Sichere Ablage ganzer Ordner/Bilder/Dateien; Papierkorb, Versionierung, Prüfsummen
- Speicher wahlweise Railway-Volume oder Cloudflare R2

## v0.228 · 05.07.2026 · Ausführliche Bewertung (Sprint 7)
- Geführte Bewertung mit Scorecard und Kapitaldienst-Check; mehrseitiger Report; Admin-Review

## v0.227 · 04.07.2026 · Bewertung 2.0 (DUB-Multiples)
- Branche × Größenklasse, Report im Briefbogen, Multiples im Admin pflegbar

## v0.226 · 04.07.2026 · Bewertungsrechner (Sprint 6)
- Öffentlicher Quick-Check + PDF-Report; Admin-Leads

## v0.224 · 04.07.2026 · Pipeline & Dokumente
- Deal-Pipeline mit Drag & Drop; Dokument-Zugriffslevel änderbar; NDA-Download
