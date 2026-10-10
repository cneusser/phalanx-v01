# Auftrag: Mailverlauf in beide Richtungen, im Kontakt und im Mandat

Zum Einspielen in der CapitalMatch-Sitzung. Der Teil, der in Phalanx OS
entsteht, steht am Ende als eigener Abschnitt und gehört in die dortige
Sitzung.

---

## Ausgangslage

Eine Kundenmail geht ein und erscheint in Phalanx OS Mail. Die Antwort wird im
Mailprogramm geschrieben und ist danach nirgends mehr zu sehen außer im
Postfach dessen, der sie geschrieben hat. Was fehlt, ist nicht die eingehende
Seite, sondern die ausgehende.

Das Ergebnis ist eine halbe Akte: Man sieht, was der Interessent wollte, aber
nicht, was zugesagt wurde. Bei mehreren Beratern an einem Mandat ist das der
Punkt, an dem zwei Leute dasselbe zweimal beantworten, und zwar verschieden.

**Was in CapitalMatch schon da ist und nicht neu gebaut werden soll:**

- `crm_messages` mit `contact_id`, `project_id`, `direction` (`in`/`out`),
  `from_email`, `to_email`, `subject`, `body`, `message_id`, `source`
  (`webhook`/`manual`/`campaign`), `sent_at`.
- `POST /api/inbound/email`, abgesichert über `INBOUND_SECRET`, fail closed.
- `utils/inbound.js` mit `ingestReply`: Zuordnung über den Absender, bei
  Weiterleitungen über den ursprünglichen Absender aus dem Kopf (v0.451).
- Im Kontakt der Reiter *Konversation* mit dem Verlauf und der manuellen
  Erfassung (v0.452).
- `email_log` für alles, was die Plattform selbst versendet.

Die ausgehende Richtung aus dem Mailprogramm fehlt, und die Sicht über ein
ganzes Mandat fehlt.

---

## Teil 1: Ausgehende Mails erfassen

### 1.1 Aufnahme

`POST /api/inbound/email` nimmt bereits beides entgegen. Zu ergänzen ist die
Erkennung der Richtung:

- Ist der Absender eine Adresse des Hauses, ist es eine **ausgehende** Mail.
  Der Kontakt ergibt sich dann aus dem Empfänger, nicht aus dem Absender.
- Sonst bleibt es wie bisher bei `in`.

Die Liste der eigenen Adressen gehört in die Umgebungskonfiguration
(`EIGENE_DOMAINS`, zum Beispiel `phalanx.de,capitalmatch.de`), nicht in den
Quelltext. Wer eine Domain ergänzt, soll nicht veröffentlichen müssen.

Bei mehreren Empfängern wird **je Empfänger ein Eintrag** angelegt, der zu
einem bekannten Kontakt gehört. Eine Mail an drei Interessenten gehört in drei
Akten; eine Sammelakte ließe sich später nicht mehr trennen.

### 1.2 Doppelte vermeiden

`message_id` bekommt einen eindeutigen Index je Mandant und Kontakt. Eine Mail,
die über BCC **und** über einen späteren Abgleich hereinkommt, darf nur einmal
im Verlauf stehen.

Das ist bewusst eine Eindeutigkeit in der Datenbank und keine Prüfung im Code:
Eine Prüfung im Code greift nicht, wenn zwei Aufrufe gleichzeitig laufen.

Fehlt die `message_id` (manuelle Erfassung), wird ersatzweise über Kontakt,
Richtung, Betreff und Minute verglichen und bei einem Treffer gemeldet statt
eingefügt.

### 1.3 Was im Verlauf steht

Der Verlauf im Kontakt zeigt ein- und ausgehende Mails in einem Strang, mit:

- Richtung, erkennbar ohne Legende (eingehend links, ausgehend rechts, wie im
  Nachrichtenfenster),
- Absender und Empfänger im Klartext, denn bei mehreren Beratern ist „wer hat
  geantwortet" die eigentliche Frage,
- Mandat, falls zugeordnet,
- Herkunft: über BCC erfasst, von Hand eingetragen, oder von der Plattform
  versendet.

### 1.4 Zuordnung zum Mandat

Nicht über den Betreff allein. Betreffzeilen werden gekürzt, übersetzt und mit
`Aw:` versehen; eine Zuordnung, die daran hängt, ist nach dem dritten Hin und
Her falsch.

Reihenfolge:

1. Antwortbezug: `In-Reply-To` oder `References` auf eine Mail, die schon
   zugeordnet ist. Das ist die einzige belastbare Angabe.
2. Codename im Betreff, wie bisher.
3. Hat der Kontakt genau **ein** laufendes Mandat, dieses.
4. Sonst ohne Mandat, und das wird im Verlauf auch so angezeigt. Eine geratene
   Zuordnung ist schlimmer als keine: Sie wandert in die Mandatsakte und wird
   dort geglaubt.

Für Punkt 1 braucht `crm_messages` zwei Spalten: `in_reply_to` und
`thread_key`.

---

## Teil 2: Der Mailverlauf eines Mandats

Eine Ansicht im Mandat, die alle Mails aller Beteiligten in einem Strang zeigt,
nach Gesprächsfaden gruppiert.

**Nur für Verwaltende.** Nicht für Käufer, nicht für Verkäufer. Der Grund ist
nicht Vorsicht, sondern Rechnen: In diesen Mails stehen Preisvorstellungen
anderer Interessenten, Klarnamen und Einschätzungen. Ein Käufer, der den
Mandatsverlauf sieht, kennt die Gebote seiner Mitbewerber.

Je Gesprächsfaden: Beteiligte, Zahl der Nachrichten, letzte Aktivität, und ob
eine eingehende Mail unbeantwortet ist. Letzteres ist die nützlichste Zahl auf
der Seite, denn es ist die, die Geld kostet.

Ein Filter auf einen Beteiligten, und eine Suche im Text.

### Was ausdrücklich nicht gebaut wird

- **Kein Senden aus dieser Ansicht.** Geantwortet wird im Mailprogramm oder im
  Nachrichtenfenster. Ein dritter Sendeweg wäre eine dritte Stelle, an der
  Zustellprobleme auftreten.
- **Kein Export des Verlaufs mit dem Codenamen zusammen.** Gegenüber Käufern
  ist der Codename die Anonymisierung; ein Mailverlauf mit Klarnamen daneben
  hebt sie auf.
- **Keine Anhänge in die Datenbank.** Dateinamen und Größe genügen. Der
  Datenraum ist der Ort für Dokumente, nicht das Postfach.

---

## Teil 3: Alles im CRM-Kontakt

Der Reiter *Konversation* zeigt bereits den Verlauf. Zu ergänzen:

- Ausgehende Mails aus dem Mailprogramm, sobald Teil 1 steht.
- Der gemeinsame Verlauf über alle Ansprechpartner einer Firma existiert seit
  v0.445 (`GET /crm/companies/:id/verlauf`) und nimmt die neuen Einträge
  automatisch mit. Bitte prüfen, nicht neu bauen.

---

## Rechte und Datenschutz

- Mailinhalte nur für Verwaltende. Kein Käufer, kein Verkäufer sieht sie.
- Beim Anonymisieren eines Kontakts (Artikel 17) werden die Mailtexte dieses
  Kontakts mitgelöscht, die Tatsache der Korrespondenz bleibt als Nachweis.
  Das ist die bestehende Regel; sie muss die neuen Einträge einschließen.
- Eine eingehende Mail ist keine Einwilligung in Mailings. Der
  Einwilligungsstand bleibt unberührt.
- Eine Mail von unbekannter Adresse legt keinen Kontakt an. Sie wird
  protokolliert und gemeldet.

---

## Reihenfolge

1. Richtungserkennung und ausgehende Mails im Kontakt. Das allein schließt die
   Lücke, um die es geht.
2. Eindeutigkeit über `message_id`.
3. Zuordnung über den Antwortbezug.
4. Mandatsansicht.

Nach jedem Schritt veröffentlichen.

---

## Prüfungen, die dazugehören

- Eine ausgehende Mail landet beim Empfänger-Kontakt, nicht beim Absender.
- Eine Mail an drei bekannte Kontakte erzeugt drei Einträge, einen je Akte.
- Dieselbe Mail zweimal eingeliefert erzeugt einen Eintrag, nicht zwei.
- Eine Antwort auf eine zugeordnete Mail erbt deren Mandat, auch wenn der
  Betreff geändert wurde.
- Ein Kontakt mit zwei laufenden Mandaten und ohne Antwortbezug bekommt **kein**
  Mandat zugeordnet.
- Ein Käufer, der die Mandatsansicht aufruft, bekommt 403, und das wird
  protokolliert.
- Eine Mail von unbekannter Adresse legt keinen Kontakt an.
- Die Prüfungen laufen gegen vollständige Beispielmails mit Signatur, Zitat und
  Weiterleitungskopf, nicht gegen erfundene Kurztexte. Eine Kurzfassung prüft
  genau das nicht, woran es in der Praxis scheitert.

---

## Anhang: der Teil, der in Phalanx OS gehört

Dieser Abschnitt gehört in die Phalanx-OS-Sitzung, nicht in diese.

Phalanx OS liest bereits die Postfächer. Gebraucht wird dort:

1. **Gesendete Mails mitlesen**, nicht nur den Posteingang. Ohne das gibt es
   keine ausgehende Seite, auch nicht in CapitalMatch.
2. **Weiterreichen an CapitalMatch**: `POST /api/inbound/email` mit
   `INBOUND_SECRET`, je Mail ein Aufruf, mit `message_id`, `in_reply_to`,
   `references`, Richtung, Absender, allen Empfängern, Betreff, Text.
3. **Nicht weitergereicht** werden Mails ohne Bezug zu einem CRM-Kontakt,
   interne Korrespondenz untereinander und alles mit Anhängen über der
   Größengrenze. Lieber eine Mail zu wenig als eine, die nicht hingehört.
4. **Wiederholsicher**: dieselbe Mail zweimal gesendet ändert nichts, weil
   `message_id` eindeutig ist.

Die Alternative zu Punkt 1, falls die Postfachanbindung zu aufwendig ist: eine
Regel im Mailprogramm, die jede ausgehende Mail an die Brevo-Eingangsadresse
in BCC setzt. Das ist weniger elegant und heute einsatzbereit.
