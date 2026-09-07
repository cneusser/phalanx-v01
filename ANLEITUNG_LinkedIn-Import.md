# Anleitung: LinkedIn-Kandidaten importieren und Flow live schalten

Diese Anleitung führt Sie Schritt für Schritt durch die Umsetzung, gegliedert nach
Programm. Halten Sie sich an die Reihenfolge. Die Datenbank-Sicherung (Schritt 4)
machen Sie unbedingt vor dem Import.

Zur Orientierung: Die Änderungen (Versionen v0.376 bis v0.381) sind in Ihrem lokalen
Projektordner bereits committet. Sie müssen sie nur noch veröffentlichen und danach
den Import ausführen.

---

## Schritt 1: Terminal (macOS) öffnen und ins Projekt wechseln

1. Öffnen Sie die App **Terminal** (Spotlight mit Cmd+Leertaste, „Terminal" eingeben, Enter).
2. Wechseln Sie in den Projektordner. Tippen Sie:

   ```
   cd ~/Downloads/Claude/Projekte/"Phalanx Plattform"/phalanx-v01
   ```

3. Prüfen Sie, dass die neuen Commits da sind:

   ```
   git log --oneline -6
   ```

   Sie sollten oben `v0.381 LinkedIn-Kandidaten ...` sehen, darunter v0.380 bis v0.376.

---

## Schritt 2: GitHub, Änderungen veröffentlichen (Terminal)

1. Noch im selben Terminalfenster:

   ```
   git push
   ```

   Falls nach Zugangsdaten gefragt wird, verwenden Sie Ihren üblichen GitHub-Login
   (Token oder SSH, wie sonst auch).
2. Erfolg erkennen Sie an einer Zeile wie `... main -> main`.

Wenn Sie lieber **GitHub Desktop** nutzen: App öffnen, Repository „phalanx-v01"
wählen, oben rechts auf **Push origin** klicken.

---

## Schritt 3: Railway, Deploy abwarten (Browser)

1. Öffnen Sie **railway.app** im Browser und melden Sie sich an.
2. Öffnen Sie Ihr CapitalMatch-Projekt und den App-Service.
3. Unter **Deployments** sehen Sie, dass ein neuer Build startet. Warten Sie, bis der
   Status **Active** (grün) ist. Die Datenbank-Migrationen laufen dabei automatisch mit.
4. Zur Sicherheit unter **Deploy Logs** kurz nach „Migration" schauen, es sollten keine
   Fehler stehen.

---

## Schritt 4: Railway, Datenbank sichern (Browser), Pflichtschritt vor dem Import

1. Im Railway-Projekt den **Postgres**-Dienst öffnen.
2. Reiter **Backups** (oder **Snapshots**) wählen und **Create Backup** bzw.
   **Snapshot** anklicken. Warten Sie, bis die Sicherung fertig ist.
3. Erst wenn die Sicherung steht, geht es weiter. So können Sie im Zweifel jederzeit
   zurück.

---

## Schritt 5: Railway, Datenbank-Adresse kopieren (Browser)

1. Im **Postgres**-Dienst den Reiter **Variables** (oder **Connect**) öffnen.
2. Kopieren Sie den Wert von **DATABASE_PUBLIC_URL** (beginnt mit `postgresql://...`).
   Diesen Wert fügen Sie gleich im Terminal ein. Bitte nirgends dauerhaft speichern
   und niemandem weitergeben.

---

## Schritt 6: CapitalMatch prüfen, ob die Mandate existieren (Browser)

1. Öffnen Sie **www.capitalmatch.de** und melden Sie sich als Admin an.
2. Gehen Sie in den Admin-Bereich zu den Mandaten.
3. Prüfen Sie, dass **Cavendish** und **Nexora** vorhanden sind. Cavendish darf im
   Status **Entwurf** stehen, das ist in Ordnung. Fehlt eines der beiden, legen Sie es
   an, bevor Sie importieren, sonst entstehen für dieses Mandat keine Funnel-Einträge.

---

## Schritt 7: Terminal, Import vorbereiten

1. Neues Terminalfenster oder das bestehende nutzen. In den Server-Ordner wechseln:

   ```
   cd ~/Downloads/Claude/Projekte/"Phalanx Plattform"/phalanx-v01/server
   ```

2. Einmalig das Excel-Lesepaket installieren:

   ```
   npm i exceljs
   ```

3. Prüfen Sie, dass Ihre fünf Dateien liegen unter
   `~/Downloads/linkedin-import/outreach/` (Betongold, Cudd, FARADAY, Cavendish, Nexora).

---

## Schritt 8: Terminal, Trockenlauf (schreibt nichts)

1. Führen Sie zuerst einen Testlauf aus. Ersetzen Sie `HIER_DIE_URL` durch den in
   Schritt 5 kopierten Wert:

   ```
   DATABASE_URL="HIER_DIE_URL" node scripts/linkedin-kandidaten-import.js --dir ~/Downloads/linkedin-import/outreach --dry
   ```

2. Sie sehen je Mandat eine Zeile mit „neu, angereichert, mit Konto, Funnel-Einträge".
   Es wird nichts in die Datenbank geschrieben. Sehen die Zahlen plausibel aus, weiter.

---

## Schritt 9: Terminal, echter Import

1. Denselben Befehl ohne `--dry` ausführen:

   ```
   DATABASE_URL="HIER_DIE_URL" node scripts/linkedin-kandidaten-import.js --dir ~/Downloads/linkedin-import/outreach
   ```

2. Am Ende steht eine Zusammenfassung je Mandat und der Hinweis, wo die Ergebnis-CSVs
   liegen. Ein Kontakt, der in mehreren Dateien vorkommt, entsteht nur einmal und
   bekommt je Mandat einen Funnel-Eintrag.

---

## Schritt 10: Finder und Excel, Ergebnisse prüfen

1. Öffnen Sie im **Finder** den Ordner
   `~/Downloads/linkedin-import/outreach/ergebnisse/`. Dort liegen fünf Dateien
   `capitalmatch_import_ergebnis_<Mandat>.csv`.
2. Öffnen Sie eine davon (Doppelklick, öffnet in Excel oder Numbers) und prüfen Sie die
   Spalten Ergebnis, Konto vorhanden und Kontakt-ID.
3. Die Outreach-Excel `CapitalMatch_Investoren_nach_Mandat.xlsx` wurde aktualisiert: auf
   den Mandatsblättern sind die Spalten **Registriert** und **NDA** gefüllt, die
   Formatierung bleibt unverändert.

---

## Schritt 11: CapitalMatch, Stichprobe (Browser)

1. Im Admin drei Kontakte aus den Ergebnis-CSVs über die Kontakt-ID heraussuchen.
2. Prüfen: LinkedIn-Kennzeichen und Tags gesetzt, je Mandat ein Funnel-Eintrag auf der
   Stufe **Ansprache**, Kontakte mit vorhandenem Konto ohne Funnel-Eintrag.

---

## Schritt 12: LinkedIn, Ansprache (manuell)

1. Schreiben Sie Ihre Kandidaten wie gewohnt per LinkedIn-Nachricht an.
2. Verwenden Sie für alle denselben allgemeinen Registrierungslink
   `https://www.capitalmatch.de/registrieren`.
3. Wer sich registriert, wird automatisch seinem vorbereiteten Kontakt zugeordnet und
   sieht direkt die für ihn vorbereiteten Mandate. Es werden keine automatischen
   E-Mails an diese Kontakte gesendet.

---

## Wenn etwas schiefgeht

- Der Befehl bricht ab mit „exceljs": Schritt 7.2 (`npm i exceljs`) wurde übersprungen.
- „DATABASE_URL ist nicht gesetzt": Sie haben den Wert aus Schritt 5 nicht eingefügt
  oder die Anführungszeichen vergessen.
- Zahlen wirken falsch: Sie haben den Snapshot aus Schritt 4. Melden Sie sich, bevor Sie
  erneut importieren, ein zweiter Lauf legt nichts doppelt an, korrigiert aber auch
  nichts von selbst.
- Für künftige Uploads genügen die Schritte 7 bis 10.
