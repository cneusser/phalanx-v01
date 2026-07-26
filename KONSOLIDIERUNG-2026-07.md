# CapitalMatch · Konsolidierung und Sprintplan

Stand: 26.07.2026 · Ziel: der beste M&A-Marktplatz der DACH-Region.
Ergänzt die detaillierte `ROADMAP.md` (Sprints 6 bis 28). Dieses Dokument fasst
den Audit vom Juli 2026 zusammen und legt die nächsten Sprints verbindlich fest.

Die Analysebasis war ein vollständiger Code-Audit entlang von drei Achsen:
Sicherheit und Datenschutz, Code-Gesundheit und Prüfschleifen, sowie die
Feature-Lücken in CRM, M&A-Prozess und Due Diligence.

---

## 1. Wo wir stehen

Der Unterbau ist bereits stark und produktiv. Das ist der Ausgangspunkt, auf dem
die nächsten Sprints aufbauen:

- Zwei-Funnel-Architektur: Berater-Sell-Side-Funnel als 9-Stufen-Kanban plus
  Käufer-Self-Service-Funnel, sauber über `interests.stage` und die Deal-Statemachine.
- Vollständige Prozesskette Teaser, NDA mit Online-Signatur, IM/Exposé mit Gate,
  Datenraum (Ordnerbaum, Versionierung, Prüfsumme, Papierkorb, Quota), Q&A.
- Dynamisches PDF-Wasserzeichen auf den Empfänger, signierte ablaufende Datei- und
  Freigabe-Links mit erneuter Serverprüfung.
- Breites CRM: Firmen und Kontakte mit Positions-Historie, Dubletten und Merge,
  Kampagnen mit Reminder, DSGVO-konforme Double-Opt-in-Einladungen, Lead-Ingest,
  Import und Export, Aufgaben, Mailvorlagen, Ausgangsbuch.
- Käuferseite: Käuferprofile, Suchprofile mit Matches, Watchlist, Benachrichtigungen
  und Digest, ähnliche Mandate, In-App-Chat.
- Bewertung: Quick- und Detailbewertung mit Engine, DCF und Benchmarks.
- Governance: Multi-Tenant mit erzwungener Row-Level-Security (fail-closed),
  Rollen und Rechte-Matrix, 2FA, append-only Audit-Log per Datenbank-Trigger.

Kernbefund: Die entscheidenden Lücken zum Marktführer liegen nicht im Fundament,
sondern in den Prozess-Endstufen (Bieterverfahren, LOI, Signing), in der
Due-Diligence-Professionalisierung und im Marktplatz-Vertrauen (Käufer-Qualifizierung,
Matching). Dazu kommt eine überfällige Härtung bei Sicherheit und Prüfschleifen.

---

## 2. Audit-Ergebnisse, priorisiert

### 2.1 Sicherheit und Datenschutz

Kritisch (sofort adressieren):

1. `server/.env` mit festem `JWT_SECRET` war im Repository eingecheckt. Dieser
   Schlüssel signiert Sessions und Datei-Links. Sofortmaßnahme in v0.319: Datei aus
   dem Tracking entfernt. Offen und dringend: den Wert in Railway durch eine lange
   Zufallszeichenkette ersetzen (rotieren) und die Git-History bereinigen.
2. Unsichere Default-Fallbacks (`JWT_SECRET || 'phalanx-secret'`) an drei Stellen.
   Der Start soll in Produktion hart abbrechen, wenn der Schlüssel schwach ist.
   In v0.319 erkennt der Start-Check jetzt auch den alten Beispielwert und zu kurze
   Schlüssel. Der harte Abbruch folgt in Sprint 29, sobald der Railway-Wert gesetzt ist.

Mittel:

3. Turnstile ist bewusst fehlertolerant (fail-open). In Kombination mit dem
   Anmelde-Rate-Limit vertretbar, aber der Kompromiss sollte dokumentiert bleiben.
4. CORS spiegelt jede Origin, wenn `FRONTEND_URL` fehlt. Vor Livegang schließen.
5. E-Mail-Adressen der Gegenseite erscheinen schon bei offenen (noch nicht
   angenommenen) Kontaktanfragen. Erst ab Annahme ausgeben.
6. Keine Session-Invalidierung bei Passwort-Reset. Ein zuvor gestohlenes Token
   bleibt nach dem Wechsel gültig. Über eine Token-Version lösen.
7. Ungeprüfte Nutzereingaben landen roh in HTML-Mailbodies (Content-Injection).
   Vor der Interpolation escapen.

Kleiner: Helmet-CSP deaktiviert (kein HSTS), Inbound-Webhook-Secret als
Query-Parameter und ohne timing-sicheren Vergleich, DSGVO-Feinheiten
(Vollexport nach Art. 15, dokumentiertes Aufbewahrungs- und Löschkonzept).

Solide gelöst und zu erhalten: bcrypt, erzwungene RLS, serverseitige Gates,
Feld-Whitelists statt `SELECT *` in öffentlichen Endpunkten, Wasserzeichen,
parametrisierte SQL, Double-Opt-in, 2FA, append-only Audit-Log.

### 2.2 Code-Gesundheit und Prüfschleifen

Größte Lücke war die fehlende automatisierte Absicherung vor einem Commit. In
v0.319 behoben: `npm run check` bündelt Textwächter und alle Testsuites, `npm run
check:full` zusätzlich den Client-Build, ein roter Test bricht ab.

Offen für Sprint 29 und den Querschnitt:

- Keine Integrationstests für Auth, RLS und Gates. Genau der sicherheitskritischste
  Bereich ist ungetestet. Höchste Test-Priorität.
- Kein ESLint und kein Typecheck. Statische Analyse für Server und Client ergänzen.
- Funnel-Stufen liegen dreifach kopiert vor (`crm.js`, `projects.js`,
  `ContactDrawer.jsx`) plus die Interest-Dimension. Konsistent, aber fehleranfällig.
  In eine geteilte Quelle überführen.
- 252 stille `catch(() => {})` inklusive auf Datenbank-Updates. Mindestens die
  datenverändernden Fälle protokollieren, damit Fehler sichtbar werden.
- Client als ein 880-kB-Bundle. Routen-basiertes Code-Splitting senkt die Initiallast.

### 2.3 Feature-Lücken CRM, M&A, Due Diligence

Die zwölf wichtigsten fehlenden Funktionen, priorisiert:

1. Strukturiertes Bieterverfahren und Angebotsabgabe (Angebots-Objekt, Runden, Fristen).
2. DD-Anforderungsliste plus Q&A mit Kategorien, Zuständigkeiten und Fristen.
3. Verkäufer-Reporting der Datenraum-Zugriffe (Engagement je Bieter).
4. LOI-Upload und -Vergleich.
5. Prozessfahrplan mit Fristen und Meilensteinen je Mandat.
6. Käufer-Qualifizierung und -Onboarding (verifiziert, Proof of Funds, Stufen).
7. Strukturiertes Käufer-Mandat-Matching aus dem CRM (Scoring, Käufergruppen).
8. Datenraum-Index und Standardstruktur mit Vollständigkeitsampel.
9. Cross-Deal-Pipeline-Analytics (Conversion, Aging, Forecast).
10. Nachfolge-Match (Talent, Kapital, Mandat) als strategisches Alleinstellungsmerkmal.
11. Signing- und Closing-Workflow (SPA-Signatur, Closing-Checkliste).
12. Dokument-Versionshistorie mit Vergleich.

---

## 3. Bereits ausgelieferte Quick Wins (v0.316 bis v0.319)

- v0.316: Der Bot-Test sperrt legitime Nutzer nicht mehr aus.
- v0.317: „NDA liegt vor" im Funnel schaltet das IM des verknüpften Kontos frei.
- v0.318: Die Mandatsseite spiegelt die Freigabe-Stufe, das IM ist abrufbar, sobald frei.
- v0.319: Gebündelte Prüfschleifen, `server/.env` entfernt, härterer Start-Check.

Offen (Handlung durch dich): alle Versionen ab v0.316 pushen und in Railway ein
starkes `JWT_SECRET` setzen und rotieren.

---

## 4. Nächste Sprints (verbindliche Reihenfolge)

Die Reihenfolge folgt deinen vier Schwerpunkten. Sicherheit zuerst, weil ein
Vertrauensbruch alles andere entwertet. Danach die Prozesstiefe, die den
Unterschied zum Wettbewerb macht, dann Vertrauen und Netzwerkeffekt.

### Sprint 29 · Sicherheit, Datenschutz und Testabdeckung härten

Ziel: die kritischen und mittleren Audit-Befunde schließen und den ungetesteten
Kernbereich absichern.

- `JWT_SECRET` rotieren, Start in Produktion fail-closed bei schwachem Schlüssel,
  Git-History bereinigen.
- Helmet-CSP und HSTS aktivieren, CORS-Wildcard schließen, Cookie- und Header-Härtung.
- HTML-Escaping in allen Mail-Interpolationen.
- Session-Invalidierung bei Passwort-Reset (Token-Version).
- E-Mail der Gegenseite erst ab angenommener Verbindung.
- Inbound-Webhook: Secret im Header, timing-sicherer Vergleich.
- Integrationstests für Auth, RLS und Gates (echte Testdatenbank), plus ESLint.
- DSGVO: Vollexport nach Art. 15, dokumentiertes Aufbewahrungs- und Löschkonzept.

Definition of Done: `npm run check:full` grün, neue Gate- und RLS-Tests grün,
Sicherheits-Review ohne kritische oder mittlere offene Punkte.

### Sprint 30 · Due-Diligence-Professionalisierung

Ziel: den Datenraum von der Dateiablage zum gesteuerten DD-Prozess ausbauen.

- DD-Anforderungsliste und Checklisten mit Kategorien (Legal, Financial, Tax, HR,
  Commercial), Status angefordert gegen bereitgestellt, Zuständigkeit, Frist, Dokumentbezug.
- Q&A-Workflow 2.0: Kategorien, Zuweisung, Priorität, Frist, Routing, Export.
- Datenraum-Index und Standardstruktur-Vorlage, Vollständigkeitsampel je Ordner.
- Dokument-Versionshistorie mit Vergleich und Supersede.

### Sprint 31 · Verkäufer-Transparenz und Prozess-Reporting

Ziel: dem Mandanten zeigen, was im Verfahren passiert, ohne Vertraulichkeit zu verletzen.

- Datenraum-Zugriffs-Reporting je Bieter: wer sah und lud wann was, als Engagement-Heatmap.
- Prozessfahrplan mit Fristen und Meilensteinen je Mandat (Q&A-Deadline,
  Angebotsfrist, Signing-Termin).
- Cross-Deal-Pipeline-Analytics: Conversion je Stufe, Aging, einfacher Forecast.

### Sprint 32 · Bieterverfahren und LOI (greift Sprint 28 auf)

Ziel: die Prozess-Endstufen mit echten Werkzeugen statt bloßer Stufen-Labels.

- LOI-Ablage und -Vergleich in Stufe 5, mit abgestufter Sichtbarkeit.
- Strukturiertes Angebots- und Bieter-Objekt (Betrag, Struktur, Bedingungen, Runde,
  Frist), indikativ gegen verbindlich.
- Moderiertes Live-Angebotstool in Stufe 6, mit Timer und ausschließlich auf
  Admin-Freischaltung, kein Dauerzustand.

### Sprint 33 · Käufer-Qualifizierung und Matching

Ziel: Vertrauen und Passgenauigkeit im Marktplatz erhöhen.

- Käufer-Onboarding und Verifizierung: Proof of Funds, Mandatsnachweis, Stufen und Badges.
- Käufer-Mandat-Matching aus dem CRM mit Scoring, Käufergruppen und Konsortien.
- Für Berater durchsuchbares Käuferverzeichnis.

### Sprint 34 · Signing und Closing

Ziel: den Prozess bis zum Abschluss über die Plattform führen.

- SPA-E-Signatur über die NDA-Signatur hinaus.
- Closing-Checkliste mit Conditions Precedent, Status und Fristen.
- Übergang nach Abschluss (Post-Signing, Archiv).

### Sprint 35 · Nachfolge-Match (bisher Sprint 26)

Talent, Kapital und Mandat zusammenführen. Stufenweise: Talent-Profil und
Onboarding, Match gegen Mandat, Kapital-Profil und Kaufpreisfinanzierung,
Monetarisierung, Qualität und Vertrauen. Besonders sensibel wegen Lebenslaufdaten,
juristisch vorab zur Personalvermittlung abgrenzen.

### Sprint 36 · Entrepreneur-Club (bisher Sprint 27)

Bindungsschicht über dem Matching: Mitgliedschaft, Events, Mitgliederverzeichnis,
Reifegrade auf Basis der vorhandenen XP-Mechanik. Bewusst nach dem Nutzen, weil
eine Community ohne Dichte nicht trägt.

---

## 5. Querschnitt (in jedem Sprint)

- Neue Tabellen mit `tenant_id` und RLS-Policy, fail-closed.
- Jeder Zugriff und Download ins append-only `activity_log`.
- Vor jedem Commit `npm run check`, vor jedem Release `npm run check:full`.
- Funnel-Stufen schrittweise in eine geteilte Quelle überführen.
- Datenverändernde Fehler protokollieren statt still schlucken.
- Bewertungen bleiben als indikativ deklariert, getrennt von der IDW-S6-Kompetenz.
- Jede Version mit Changelog-Eintrag und Migration, Texte menschlich, kein Em-Dash.

---

## 6. Zur Kennzahl „21+ Qualifizierte Investoren"

Die Zahl ist nicht falsch. Sie zählt bewusst nur freigegebene und aktive
Investoren (`role='buyer'`, freigegeben, aktiv). Die 24 Personen umfassen zusätzlich
Verkäufer, Administratoren und noch nicht freigegebene Konten. „Qualifizierte
Investoren" ist damit die ehrlichere und stärkere Aussage als eine reine Kopfzahl.
Falls gewünscht, lässt sich die Kachel auf „geprüfte Mitglieder" umstellen oder um
eine zweite Kennzahl (registrierte Interessenten) ergänzen.
