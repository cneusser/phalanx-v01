# Auftrag: Mails aus Phalanx OS an CapitalMatch übergeben

Zum Einspielen in der Phalanx-OS-Sitzung. Die Gegenseite in CapitalMatch steht
seit v0.462 und wartet.

---

## Warum nicht über Brevo

Der ursprüngliche Plan lief über Brevo Inbound Parsing. Das ist in der
Brevo-Oberfläche nicht mehr zu finden, und das, was dort heute *Inbound
Webhooks* heißt, ist ein anderes Produkt und kostet Enterprise. Inbound Parsing
bräuchte zudem eine eigene Subdomain mit MX-Eintrag, getrennt von der
Versanddomain.

Phalanx OS liest die Postfächer ohnehin. Damit entfällt der Umweg: ein Dienst
weniger, keine neue Subdomain, kein MX-Eintrag, und die ausgehende Seite kommt
gleich mit, die über Brevo nur per BCC zu haben wäre.

---

## Was zu bauen ist

### 1. Gesendete Mails mitlesen

Bisher wird der Posteingang gelesen. Ohne den Ordner „Gesendet" gibt es keine
ausgehende Seite, und genau die fehlt. Das ist der eigentliche Punkt dieses
Auftrags; alles Weitere ist Zustellung.

### 2. Weiterreichen

Je Mail ein Aufruf:

```
POST https://www.capitalmatch.de/api/inbound/email
Header: x-inbound-secret: <INBOUND_SECRET>
```

Das Geheimnis gehört in den Header, nicht in die Adresszeile: Abfragen landen
in Protokollen von Proxys. Der Wert steht in der Railway-Umgebung von
CapitalMatch unter `INBOUND_SECRET`, nie im Quelltext und nie im Protokoll.

Rumpf, ein Objekt je Mail:

```json
{
  "from": "Maximilian Heufelder <maximilian.heufelder@foscari.de>",
  "to": ["christian.neusser@phalanx.de"],
  "cc": [],
  "subject": "Rückfragen FARADAY",
  "text": "Sehr geehrter Herr Neusser, …",
  "messageId": "<CAF=1@mail.gmail.com>",
  "inReplyTo": "<vorherige@phalanx.de>",
  "references": "<erste@phalanx.de> <vorherige@phalanx.de>",
  "date": "2026-10-14T09:12:00+02:00"
}
```

Mehrere Mails in einem Aufruf gehen auch, als `{ "items": [ … ] }`.

**Die Richtung wird nicht mitgeschickt.** CapitalMatch entscheidet sie selbst
anhand des Absenders und der Liste `EIGENE_DOMAINS`. Zwei Systeme, die
unabhängig voneinander dieselbe Entscheidung treffen, treffen sie irgendwann
verschieden.

**Die drei Kopfzeilen sind der wichtigste Teil.** `messageId` ist die
Eindeutigkeit: Dieselbe Mail zweimal geschickt erzeugt genau einen Eintrag,
abgesichert über einen eindeutigen Index in der Datenbank. `inReplyTo` und
`references` tragen die Mandatszuordnung. Ohne sie hängt die Zuordnung am
Codenamen im Betreff, und Betreffzeilen werden gekürzt, übersetzt und mit
„Aw:" versehen.

### 3. Was nicht weitergereicht wird

- Mails ohne Bezug zu einem CRM-Kontakt. Eine unbekannte Adresse legt in
  CapitalMatch keinen Kontakt an, sie wird nur protokolliert. Lieber eine Mail
  zu wenig als eine, die nicht hingehört.
- Interne Korrespondenz untereinander, also wenn Absender **und** alle
  Empfänger eigene Adressen sind.
- Anhänge. Nicht Dateiname, nicht Grösse, nichts. Der Datenraum ist der Ort
  für Dokumente, nicht das Postfach.
- Alles aus Ordnern, die ausdrücklich ausgenommen sind. Welche das sind,
  gehört in die Konfiguration und nicht in den Quelltext.

### 4. Wiederholsicher

Dieselbe Mail zweimal gesendet ändert nichts, weil `messageId` eindeutig ist.
Phalanx OS darf also gefahrlos erneut zustellen, wenn ein Aufruf
fehlgeschlagen ist. Ein Fehlschlag soll wiederholt werden, mit wachsendem
Abstand, und nach einigen Versuchen gemeldet statt still verworfen.

### 5. Was in Phalanx OS protokolliert wird

Je Übergabe: Zeitpunkt, `messageId`, Antwortstatus von CapitalMatch. **Kein
Betreff und kein Text.** Protokolliert wird die Übergabe, nicht ihr Inhalt.

---

## Was auf der Gegenseite schon passiert

Damit klar ist, was Phalanx OS nicht selbst tun muss:

- **Richtung erkennen.** Kommt die Mail aus dem eigenen Haus, ist sie
  ausgehend, und der Kontakt ergibt sich aus dem Empfänger statt aus dem
  Absender.
- **Je Empfänger ein Eintrag.** Eine Mail an drei Interessenten landet in drei
  Akten. Eine Sammelakte liesse sich später nicht mehr trennen.
- **Mandat zuordnen**, in dieser Reihenfolge: Antwortbezug, dann Codename im
  Betreff, dann ein einziges laufendes Mandat des Kontakts, sonst keines. Bei
  zwei laufenden Mandaten ohne Antwortbezug wird nichts geraten.
- **Weiterleitungen**: Steht im Text ein Kopf „Von: …", wird der ursprüngliche
  Absender gelesen. Der echte Absender hat dabei immer Vorrang.
- **Eine eingehende Mail** stoppt laufende Erinnerungen, hebt den Funnel auf
  mindestens Stufe 2 und erzeugt eine Wiedervorlage. Eine **ausgehende** tut
  nichts davon, denn geantwortet hat dabei niemand.

---

## Auf der CapitalMatch-Seite noch zu setzen

```
EIGENE_DOMAINS = phalanx.de,capitalmatch.de
```

Ohne diese Variable gilt keine Adresse als eigene, und alles bleibt eingehend
wie bisher. Das ist Absicht: Eine fehlende Einstellung darf die Richtung nicht
raten.

---

## Prüfungen, die dazugehören

- Eine ausgehende Mail landet beim Empfänger-Kontakt, nicht beim Absender.
- Eine Mail an drei bekannte Kontakte erzeugt drei Einträge.
- Dieselbe Mail zweimal übergeben erzeugt einen Eintrag, nicht zwei, und keine
  zweite Wiedervorlage.
- Eine Antwort auf eine zugeordnete Mail erbt deren Mandat, auch wenn der
  Betreff geändert wurde.
- Ein Kontakt mit zwei laufenden Mandaten und ohne Antwortbezug bekommt
  **kein** Mandat zugeordnet.
- Eine Mail von unbekannter Adresse legt keinen Kontakt an.
- Eine rein interne Mail wird gar nicht erst übergeben.
- Geprüft wird gegen vollständige Beispielmails mit Signatur, Zitat und
  Weiterleitungskopf. Eine Kurzfassung prüft genau das nicht, woran es in der
  Praxis scheitert.

---

## Reihenfolge

1. Gesendete Mails mitlesen.
2. Übergabe mit `messageId`, `inReplyTo`, `references`.
3. Ausschlüsse und Wiederholung.
4. Protokoll ohne Inhalte.

Nach jedem Schritt veröffentlichen. Nach Schritt 2 zuerst mit einem einzigen
Postfach und einem einzigen Tag anfangen, dann nachsehen, was in CapitalMatch
unter *Konversation* beim Kontakt steht. Erst danach alles weitere.
