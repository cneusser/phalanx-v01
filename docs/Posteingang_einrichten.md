# Eingehende Mails in CapitalMatch

Wie eine Kundenmail an einem CRM-Kontakt landet. Zwei Wege: von Hand, sofort
nutzbar, und automatisch über Brevo.

---

## Weg 1: von Hand, ohne jede Einrichtung

Funktioniert heute.

1. CRM öffnen, den Kontakt suchen, Kontakt anklicken.
2. Reiter **Konversation**.
3. Oben steht **„Antwort des Kontakts erfassen"**. Betreff eintragen, Text der
   Mail einfügen, **„Antwort erfassen"**.

Enthält der Betreff den Codenamen eines Mandats, zum Beispiel `FARADAY`, wird
das Mandat automatisch erkannt und die Nachricht daran gehängt.

Was dabei außerdem passiert, und zwar absichtlich, weil es sonst jemand
vergisst:

- Laufende Erinnerungen an diesen Kontakt werden gestoppt. Niemand soll eine
  Mahnung bekommen, nachdem er geantwortet hat.
- Der Funnel geht mindestens auf Stufe 2, „Rückmeldung".
- Es entsteht eine Wiedervorlage „Antwort beantworten" in zwei Werktagen.

---

## Weg 2: automatisch über Brevo Inbound Parsing

Danach genügt Weiterleiten oder BCC.

### Einmalig einzurichten

**1. Ein Geheimnis in Railway setzen.**

Im App-Service eine Variable anlegen:

```
INBOUND_SECRET = <eine lange, zufällige Zeichenfolge>
```

Ohne diese Variable ist der Eingang abgeschaltet und antwortet mit 503. Das ist
Absicht: Eine Schnittstelle, die bei fehlender Konfiguration offen steht, ist
die gefährlichste Art von Vergesslichkeit.

**2. In Brevo das Inbound Parsing einrichten.**

Unter *Transactional → Inbound Parsing → Webhook hinzufügen*:

```
https://www.capitalmatch.de/api/inbound/email?secret=<dasselbe Geheimnis>
```

Brevo nennt dort eine Empfangsadresse, etwa `etwas@inbound.brevo.com`. Diese
Adresse ist das Ziel für Weiterleitungen.

**3. Ausprobieren.**

Eine Mail an diese Adresse weiterleiten und im Kontakt unter *Konversation*
nachsehen. Kommt nichts an, steht der Grund im Laufzeitprotokoll von Railway.

### Die beiden Betriebsarten

**BCC.** Setzen Sie die Brevo-Adresse ins BCC, wenn Sie selbst schreiben.
Damit landet die ausgehende Mail in der Historie.

**Weiterleiten.** Eine Kundenmail an `info@phalanx.de` leiten Sie an die
Brevo-Adresse weiter. Hier gibt es eine Feinheit, die seit v0.451 beachtet
wird: Beim Weiterleiten sind **Sie** der Absender, nicht der Kunde. Die
Zuordnung liest deshalb den Kopf der weitergeleiteten Nachricht und nimmt den
ursprünglichen Absender. Erkannt werden die Formen von Outlook, Apple Mail,
Gmail und Thunderbird, deutsch wie englisch.

Wichtig dabei: **Weiterleiten Sie ohne den Text zu kürzen.** Entfernen Sie den
Kopf mit „Von: …", fehlt die einzige Angabe, aus der sich der Kunde ablesen
lässt.

### Was bewusst nicht passiert

- **Kein Anlegen.** Eine Mail von einer unbekannten Adresse wird protokolliert
  und sonst nichts. Sie legt keinen Kontakt an. Ein Bestand, der bei jeder Mail
  wächst, ist nach einem Monat unbrauchbar.
- **Kein Überschreiben.** Der echte Absender hat immer Vorrang vor dem im Text
  gefundenen. Eine zitierte Mail kann keine direkte Antwort überschreiben, denn
  eine falsch zugeordnete Nachricht ist schlimmer als eine nicht zugeordnete.
- **Keine Einwilligung.** Dass jemand schreibt, ist keine Einwilligung in
  Mailings. Der Einwilligungsstand bleibt unberührt.

---

## Dokumentverweise in einer Mail

Soll der Kunde direkt zu einem Dokument im Datenraum:

1. Nachrichten öffnen, Gespräch wählen, **„Auf ein Dokument verweisen"**.
2. Dokument suchen, anklicken. Der Link steht im Text, zum Beispiel
   `https://www.capitalmatch.de/projekte/7?dok=223`.
3. Diesen Link in die Mail kopieren.

Wer ihn öffnet und nicht angemeldet ist, kommt zur Anmeldung und danach genau
zum Dokument. Wer für das Dokument nicht freigegeben ist, sieht es nicht,
sondern den Grund. Ein Verweis ist keine Freigabe, und jeder Aufruf steht im
Zugriffsprotokoll des Mandats.
