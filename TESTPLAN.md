# CapitalMatch — Manueller Testplan (Sprint 0–3)

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
- [ ] **A2 Anonymisierung:** Nirgendwo taucht „ika ika" oder „Scopo" auf — weder auf
  der Landing-Page noch im Marktplatz oder in Dokumentnamen. Das Mandat heißt
  **„Projekt Umami"**.
- [ ] **A3 Landing-Kacheln:** Unter „Aktuelle Mandate" erscheinen zwei Kacheln
  (Projekt Umami, Nexora) mit Kennzahlen — geladen aus der Datenbank.
- [ ] **A4 Tab-Counts:** Im Marktplatz zeigen die Buttons „Alle (2) / M&A (0) /
  Fundraising (2)" — auch die 0 wird angezeigt, und die Zahlen ändern sich NICHT,
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

## D. NDA-Flow & gestufter Zugang (Sprint 2 + 3 — Kernstück)

Als **Investor** (Inkognito-Fenster), Projekt Umami öffnen:

- [ ] **D1 Vor NDA:** Nur der Tab „Überblick" ist offen; „Unternehmen", „Finanzen"
  etc. zeigen ein Schloss. Im Tab „Dokumente" ist nur der öffentliche Teaser
  gelistet, das IM ist gesperrt („NDA erforderlich").
- [ ] **D2 Kein Umgehen per URL:** — *optional, technisch* — Direktaufruf von
  `…/api/projects/1` im Browser liefert einen Fehler 401/403, keine Daten.
- [ ] **D3 Interesse/NDA anfordern:** Button für NDA/Interesse klicken →
  Status „NDA angefordert" erscheint.
- [ ] **D4 NDA lesen:** Das NDA-Dokument als PDF öffnen (Vorschau). Es ist mit
  deinen Daten und dem Projektnamen „Projekt Umami" befüllt (kommt jetzt aus der
  konfigurierbaren Vorlage in der Datenbank).
- [ ] **D5 Online signieren:** NDA online unterzeichnen (Name eintippen +
  bestätigen). Erfolgs-Meldung erscheint.
- [ ] **D6 IM automatisch frei (NEU Sprint 3):** Direkt nach der Signatur — ohne
  Admin-Zutun — ist im Tab „Dokumente" der Bereich „Vertrauliche Dokumente" mit
  Badge **„IM freigeschaltet (NDA signiert)"** sichtbar und das Pitchdeck/IM
  gelistet. Die Tabs „Unternehmen/Finanzen" (Datenraum-Ebene) bleiben gesperrt.
- [ ] **D7 Signiertes NDA-PDF:** Das unterzeichnete NDA lässt sich herunterladen;
  auf der letzten Seite stehen grüner Signaturblock + Audit-Trail (Name, E-Mail,
  Zeitstempel, IP).
- [ ] **D8 Datenraum-Freigabe:** Als Admin: NDA-Verwaltung → das signierte NDA
  „Freigeben". Als Investor: Seite neu laden → jetzt sind ALLE Tabs offen
  (Unternehmen, Markt & Potenzial, Finanzen, Kontakt).
- [ ] **D9 Ablehnung testet Terminal-Zustand:** — *optional* — Mit einem zweiten
  Test-Investor (`+investor2`) bis D3 gehen, dann als Admin „Ablehnen" → Investor
  sieht „Abgelehnt" und bekommt keinerlei Dokumente.

## E. Admin & Zustandsautomat (Sprint 2)

- [ ] **E1 Dashboard-Zahlen:** Admin-Dashboard zeigt plausible Zahlen (Projekte,
  Nutzer, NDAs) — keine „NaN" oder zusammengeklebte Zahlen wie „11".
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

---

## Hinweise

- Die geseedeten Beispiel-Dokumente (Teaser/Pitchdeck) sind **Metadaten ohne
  physische Datei** — Download liefert dort „Datei nicht gefunden". Für D6/D7-
  Download-Tests vorher als Admin echte Dateien im Mandat hochladen.
- NDA-Vorlage anpassen: Tabelle `nda_templates` in der Datenbank (Texte,
  Gerichtsstand, Beraterdaten) — kein Code-Deploy nötig.
- E-Signatur läuft aktuell über den eingebauten Stub-Provider (simulierte
  eIDAS-FES-Signatur). Ein echter Anbieter (z. B. Skribble) wird später nur per
  Umgebungsvariable aktiviert.
- Aufräumen nach dem Test: Test-Investoren im Admin-Bereich deaktivieren,
  Test-Mandat zurückziehen.
