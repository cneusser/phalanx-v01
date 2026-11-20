# Testdrehbuch der Teststufe

Stand v0.482. Dieses Drehbuch gibt es zweimal:

- **Hier**, als Liste zum Abhaken. Dafür, was man nur sieht: Verständlichkeit,
  Anzahl der Klicks, Beschriftungen, ob eine Meldung weiterhilft.
- **Als Programm** in `server/tests/integration/drehbuch.test.js`. Dafür, was
  die Anlage tut. Gleiche Abschnitte, gleiche Nummern.

Wenn Sie hier etwas ändern, gehört die andere Fassung mitgeändert. Laufen beide
auseinander, ist die automatische die verbindliche, denn die bricht, wenn sie
nicht stimmt.

## Vorbereitung

1. Teststufe öffnen: `https://<teststufe>/teststufe/<Schlüssel>`. Der Link
   gilt 30 Tage in diesem Browser.
2. Oben muss der braun gestreifte Balken **TESTSTUFE** stehen. Fehlt er, sind
   Sie auf der Produktion. Dann abbrechen.
3. Demowelt frisch setzen (nur bei Bedarf):
   `CM_STUFE=teststufe node server/scripts/demowelt.js --zuruecksetzen`

**Die Konten der Demowelt**, Kennwort überall `Teststufe!2026`:

| Konto | Rolle und Stand |
|---|---|
| `verkaeufer@demo.capitalmatch.invalid` | Verkäufer, Eigentümer von DEMO_NORDLICHT |
| `anfrage@demo.capitalmatch.invalid` | hat angefragt, nichts freigegeben |
| `wartet@demo.capitalmatch.invalid` | Vereinbarung liegt zum Unterschreiben |
| `gezeichnet@demo.capitalmatch.invalid` | hat unterschrieben, Datenraum fehlt |
| `datenraum@demo.capitalmatch.invalid` | im Datenraum |

Mandate: `DEMO_NORDLICHT` (M&A), `DEMO_TALSOHLE` (Sondersituation),
`DEMO_SETZLING` (Finanzierung, Ausnahme ohne Unterschrift), `DEMO_ENTWURF`
(nicht veröffentlicht).

In jedem Datenraum liegt `Personalliste.pdf` als **vertraulich**. Diese Datei
darf auf keinem Weg bei einem Interessenten landen. Daran hing der Fehler aus
v0.481.

---

## 1. Sicht des Verkäufers

Anmelden als `verkaeufer@demo.capitalmatch.invalid`.

- [ ] 1.1 Sein Mandat DEMO_NORDLICHT steht in seiner Übersicht.
- [ ] 1.2 DEMO_TALSOHLE, das ihm nicht gehört, steht nicht darin.
- [ ] 1.3 Er kommt in den Datenraum seines Mandats und sieht alle vier Dateien.
- [ ] 1.4 Ruft er ein fremdes Mandat auf, sieht er höchstens den Teaser.
- [ ] 1.5 Im fremden Datenraum kann er keinen Ordner anlegen.
- [ ] 1.6 Am eigenen Mandat kann er `Personalliste.pdf` öffnen.
- [ ] 1.7 **Beobachtung:** Wie viele Klicks von der Anmeldung bis zu seiner
      Interessentenliste? Notieren.

## 2. Sicht des Käufers

- [ ] 2.1 Ohne Anmeldung: Der Marktplatz zeigt DEMO_NORDLICHT.
- [ ] 2.2 Dort steht eine Umsatzspanne, keine Einzelzahl.
- [ ] 2.3 Dort steht kein Klarname einer Gesellschaft.

Anmelden als `anfrage@...` (hat nur angefragt).

- [ ] 2.4 Der Teaser ist lesbar.
- [ ] 2.4a Die Detailseite des Mandats ist zu, mit einer Meldung, die sagt,
      was fehlt.
- [ ] 2.5 Im Datenraum ist nur die öffentliche Stufe sichtbar, also der Teaser.
- [ ] 2.5a Memorandum und Jahresabschluss lassen sich nicht öffnen.

Anmelden als `gezeichnet@...` (hat unterschrieben).

- [ ] 2.6 Das Memorandum lässt sich öffnen.
- [ ] 2.6b Der Jahresabschluss noch nicht.
- [ ] 2.4b Die Detailseite ist **noch zu**. Sie öffnet sich erst mit der
      Datenraum-Freigabe, nicht mit der Unterschrift.

Anmelden als `datenraum@...` (freigegeben).

- [ ] 2.7 Der Jahresabschluss ist sichtbar und ladbar.
- [ ] 2.8 `Personalliste.pdf` erscheint nur als gesperrter Eintrag.
- [ ] 2.4c Die Detailseite ist offen.
- [ ] 2.9 **Beobachtung:** Wie viele Klicks vom Marktplatz bis zum ersten
      geöffneten Dokument? Notieren.

## 3. Neuanlage

Anmelden als Verwaltung.

- [ ] 3.1 Ein neues Mandat anlegen, Codename `TEST_<Datum>`.
- [ ] 3.2 Es steht danach in der Mandatsliste.
- [ ] 3.3 Es erscheint auf dem Marktplatz.
- [ ] 3.4 Die Standardgliederung des Datenraums anlegen.
- [ ] 3.5 Sie steht danach im Datenraum, sieben Bereiche.
- [ ] 3.6 Eine Datei hochladen. Sie erscheint in der Liste mit Größe und Datum.
- [ ] 3.7 Dieselbe Datei erscheint auch unter „Unterlagen".
- [ ] 3.8 Die Datei als vertraulich kennzeichnen. Als `datenraum@...` prüfen,
      dass sie dort gesperrt ist, und zwar in beiden Listen.
- [ ] 3.9 **Beobachtung:** Wie viele Felder verlangt die Neuanlage, und wie
      viele davon braucht man wirklich, um online zu gehen? Notieren.

## 4. Abruf von Daten

Als `datenraum@...`.

- [ ] 4.1 Teaser öffnen. Im PDF steht ein Wasserzeichen mit dem eigenen Namen.
- [ ] 4.2 Jahresabschluss laden.
- [ ] 4.3 `Personalliste.pdf` lässt sich nicht laden, auch nicht über die
      Vorschau.
- [ ] 4.4 Den ganzen Ordner als Archiv laden. Es öffnet sich, und
      `Personalliste.pdf` liegt nicht darin.
- [ ] 4.5 Über die Suche nach „Personal" suchen. Es erscheint kein Treffer und
      kein Textausschnitt.

Als Verwaltung.

- [ ] 4.6 Der Zugriffsbericht des Mandats zeigt die Abrufe von 4.1 bis 4.4.
- [ ] 4.7 Er zeigt keinen Abruf der `Personalliste.pdf`.
- [ ] 4.8 Eine Datei schwärzen. Danach liegt die geschwärzte Kopie im Ordner,
      und das Original ist als vertraulich gesperrt.
- [ ] 4.9 Als `datenraum@...` prüfen: Die geschwärzte Kopie ist sichtbar, das
      Original nicht.

## 5. Freigaben im Chat

Als Verwaltung, Nachrichten öffnen, Gespräch mit `gezeichnet@...`.

- [ ] 5.1 Über dem Gespräch steht eine Leiste mit den Mandaten dieses Kontakts,
      jedes mit Codenamen.
- [ ] 5.2 DEMO_NORDLICHT ist freigebbar, weil unterschrieben.
- [ ] 5.3 Ein Mandat ohne Unterschrift ist ausgegraut und nennt den Grund.
- [ ] 5.4 Beim Klick fragt die Plattform nach und nennt dabei das Mandat.
- [ ] 5.5 Nach der Freigabe steht im Mandat, dass der Datenraum offen ist, und
      zwar bei genau diesem Mandat.
- [ ] 5.6 Als `gezeichnet@...` ist der Datenraum tatsächlich offen.

## 6. Mailversand

- [ ] 6.1 Eine Aktion auslösen, die eine Mail erzeugt, etwa eine Freigabe.
- [ ] 6.2 Im Mailverlauf der Verwaltung steht die Mail als **nicht gesendet**
      mit dem Grund „Teststufe, Adresse nicht freigeschaltet".
- [ ] 6.3 Keine Mail erreicht ein echtes Postfach. Wer auf der Teststufe
      wirklich Mails bekommen will, trägt seine Adresse in
      `TESTSTUFE_MAIL_AN` ein, und dann steht `[TESTSTUFE]` im Betreff.

---

## Was in jeden Durchgang gehört

Nach jedem Deployment auf die Teststufe:

```bash
PRUEFSTAND_DATABASE_URL=<Teststufe-Datenbank> npm run test:pruefstand
```

Das deckt die Abschnitte 1 bis 4 maschinell ab. Von Hand bleiben die
Beobachtungen 1.7, 2.9 und 3.9 und die Abschnitte 5 und 6.

## Beobachtungen, die schon feststehen

Beim ersten Durchlauf dieses Drehbuchs sind drei Dinge aufgefallen, die keine
Fehler sind, aber in die Vereinfachung gehören:

1. **Neun Pflichtfelder vor dem ersten Blick.** Ein Interessent muss Anrede,
   Vorname, Nachname, Unternehmen, Position, Mobilnummer, Straße, PLZ und Ort
   gepflegt haben, bevor er ein Mandat im Detail ansehen darf. Das ist eine
   hohe Hürde an der frühesten Stelle des Prozesses.
2. **Die Detailseite hängt an der Datenraum-Freigabe, nicht an der
   Unterschrift.** Wer unterschrieben hat, bekommt Teaser und Memorandum, aber
   die Seite mit Finanzen und Team bleibt zu. Das überrascht, weil die
   Unterschrift sich wie der entscheidende Schritt anfühlt.
3. **Zwei Listen für denselben Bestand.** Jede Datei steht im Datenraum und
   unter „Unterlagen". Daraus kamen beide Fehler aus v0.481.
