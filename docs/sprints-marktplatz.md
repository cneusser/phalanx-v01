# Sprintplan Marktplatz

Stand 28.11.2026. Grundlage ist `docs/strategie-marktplatz.md`. Zwei Abweichungen davon:

Der Datenraum und der Prozessagent sind vorgezogen, weil die Daten dafür bereits
anfallen. Das Admin-Dashboard zählt 260 Datenraum-Zugriffe in sieben Tagen, und
darüber ist bisher niemandem Rechenschaft gelegt worden.

Dazu kommt eine ganze Spur, die im Strategiepapier noch fehlte: **das Mandat wandert
vollständig auf die Plattform.** Longlisten aus Excel, die Ansprache selbst, und ein
wöchentlicher Bericht an den Mandanten. Das verschiebt den Schwerpunkt vom Marktplatz
zum geführten Mandat, und es ist die richtige Verschiebung: Ein Marktplatz ist
kopierbar, ein geführtes Mandat mit lückenloser Akte nicht.

Ein Sprint ist eine Fassung. Jede geht wie bisher erst auf die Teststufe, wird dort
geprüft, dann in die Produktion. Kein Sprint ist auf den nächsten angewiesen, ausser
wo es dasteht.

---

## Überblick

| # | Fassung | Titel | Aufwand | Hängt ab von |
|---|---|---|---|---|
| 1 | v0.513 | Das Fundament trägt | 1 bis 2 Tage | nichts |
| 2 | v0.514 | Bewegung wird gemessen | 1 Tag | nichts |
| 3 | v0.515 | Die Longlist lebt auf der Plattform | 2 Tage | 1 |
| 4 | v0.516 | Der Einsichtsbericht | 2 Tage | nichts |
| 5 | v0.517 | Der Mandantenbericht, jede Woche | 3 Tage | 2, 3, 4 |
| 6 | v0.518 | Ansprache in der Plattform | 3 Tage | 3 |
| 7 | v0.519 | Nachfassen mit einem Klick | 2 Tage | 2, 6 |
| 8 | v0.520 | Käuferqualifizierung in drei Stufen | 2 bis 3 Tage | 1 |
| 9 | v0.521 | Der Prozessagent | 2 Tage | 2, 4, 8 |
| 10 | v0.522 | Phalanx OS: die Arbeitsteilung | 2 bis 3 Tage | 6 |
| 11 | v0.523 | Eine Seite je Mandat | 2 Tage | 1 |
| 12 | v0.524 | Suchprofile als zweiter Marktplatz | 2 Tage | 8 |
| 13 | v0.525 | Der Trichter in Zahlen | 1 bis 2 Tage | 2 |
| 14 | v0.526 | Aufnahmeassistent für Verkäufer | 3 bis 4 Tage | 1, 11 |
| 15 | v0.527 | Suchagent für Käufer | 3 Tage | 12, 14 |

Aufwand heisst meine Arbeit bis zur grünen Prüfstrecke, nicht Ihre Prüfzeit.

---

## Sprint 1, v0.513: Das Fundament trägt

**Warum zuerst.** 996 Kontakte und 656 Firmen mit Lücken, vier Zugänge ohne Nachweis.
Jeder Agent, jedes Matching und jeder Bericht wird daran gemessen, und heute würden
alle drei danebenliegen.

**Inhalt**

- Die vier Fälle aus „Zugang ohne Nachweis" abarbeitbar machen: je Zeile drei Knöpfe,
  nämlich Vereinbarung anfordern, Dokument hochlegen, Zugang entziehen. Heute ist der
  Bericht eine Liste, aus der man herausklicken muss.
- Sammelbearbeitung im Lückenbericht: mehrere Kontakte auswählen, ein Feld setzen.
- Die Anreicherungsvorschläge aus v0.509 im Stapel: für alle Firmen eines Mandats auf
  einmal holen, Übernahme weiterhin einzeln.
- Die Pflegemail an die 94 fragbaren Personen einmal versenden, nach Ihrer Freigabe.

**Fertig, wenn** der Bericht „Zugang ohne Nachweis" auf null steht oder jede
verbleibende Zeile eine festgehaltene Begründung trägt, und die drei häufigsten Lücken
unter der Hälfte des heutigen Standes liegen.

**Messgrösse** Kontakte mit Lücken heute 996, Ziel unter 500.

---

## Sprint 2, v0.514: Bewegung wird gemessen

**Warum.** 201 von 240 FARADAY-Kontakten stehen auf der Stufe Ansprache, viele seit
79 Tagen. Das ist der eigentliche Engpass, und er ist bisher nur als graue Zahl auf
einer Karte sichtbar.

**Inhalt**

- Je Partei: Tage seit der letzten Bewegung, bereits vorhanden, und daraus die
  Reaktionsquote je Person über alle Mandate. Definiert wie bei Axial: Anteil der
  binnen sieben Tagen beantworteten Vorgänge über die letzten hundert.
- Neuer Bericht „Was hängt": je Mandat die Kontakte ohne Bewegung, nach Dauer sortiert,
  mit dem letzten Ereignis im Klartext.
- Dieselbe Quote am Kontakt sichtbar, als schlichte Zahl ohne Note.

**Fertig, wenn** der Bericht die 201 Fälle nach Dringlichkeit sortiert anzeigt und je
Fall sagt, was zuletzt geschah.

**Messgrösse** Anteil der Kontakte ohne Bewegung seit mehr als 30 Tagen. Heute bei
FARADAY geschätzt über 60 Prozent.

---

## Sprint 3, v0.515: Die Longlist lebt auf der Plattform

**Warum.** Die Longlisten der laufenden Mandate stehen in Excel. Solange das so ist,
gibt es zwei Wahrheiten je Mandat, und der Mandantenbericht aus Sprint 5 könnte nur
die halbe erzählen.

**Was vorhanden ist.** Der Tabellenimport mit Spaltenerkennung und Zuordnung gibt es
seit v0.443 (`/crm/import/analyze` und `/apply`). Er legt Kontakte an, aber nicht
Beteiligte an einem Mandat.

**Inhalt**

- Import mit Mandatsbezug: Beim Einlesen wird das Mandat gewählt, und jede Zeile landet
  zusätzlich als Partei auf einer wählbaren Funnel-Stufe, in der Regel Longlist.
- Zusatzspalten der Excel-Longlisten mitnehmen: Quelle, Priorität, bisheriger Stand,
  Bemerkung. Was sich keinem Feld zuordnen lässt, geht in die Notiz statt verloren.
- Dublettenprüfung gegen den Bestand und gegen das Mandat selbst, mit Bericht statt
  stiller Zusammenführung.
- Rückweg: Die Longlist eines Mandats als Tabelle herunterladen, damit niemand das
  Gefühl hat, seine Liste wegzugeben.

**Fertig, wenn** die Longlisten von FARADAY, Nexora und Betongold vollständig auf der
Plattform stehen und die Excel-Dateien nur noch Archiv sind.

**Messgrösse** Mandate ohne Longlist in Excel. Ziel null.

---

## Sprint 4, v0.516: Der Einsichtsbericht

**Warum.** Der Punkt, an dem der Datenraum vom internen Werkzeug zum Verkaufsargument
wird. 260 Zugriffe in sieben Tagen sind protokolliert, und kein Wettbewerber kann das
nachbauen, weil keiner ein Protokoll hat.

**Inhalt**

- Je Mandat: welcher Interessent hat welches Dokument wann geöffnet oder
  heruntergeladen, wie oft, wie lange ist es her. Aus dem vorhandenen Protokoll.
- Verdichtung je Person: war im Datenraum, hat diese Bereiche angesehen, zuletzt am.
- Dieselbe Sicht für den Mandanten in seinem Zugang, mit Klarnamen nur dort, wo die
  Namensnennung freigegeben ist, sonst als Rolle und Typ.
- Im Käuferblick eine Zeile, die sagt, dass Zugriffe protokolliert werden. Wer das
  weiss, verhält sich anders, und das ist beabsichtigt.

**Fertig, wenn** Sie für FARADAY auf einen Blick sehen, welche der 39 Personen mit
Zugang den Datenraum tatsächlich benutzt haben.

**Messgrösse** Anteil der Zugänge, die nach der Freigabe nie geöffnet wurden. Die
ehrlichste Zahl über die Qualität der Interessenten, die diese Plattform erzeugen kann.

---

## Sprint 5, v0.517: Der Mandantenbericht, jede Woche

**Warum.** Das ist das Stück, das aus einer Plattform einen Dienst macht. Der Mandant
fragt heute nach dem Stand, weil er ihn nicht sieht. Künftig weiss er ihn, bevor er
fragt, und zwar belegt.

**Inhalt**

- Ein Bericht je Mandat und Woche, erzeugt aus dem, was ohnehin protokolliert ist:
  - Was ist passiert: neue Interessenten, versendete Ansprachen, Antworten,
    unterschriebene Vereinbarungen, neue Datenraum-Zugänge, beantwortete Fragen.
  - Wer hat hineingesehen: der Einsichtsbericht aus Sprint 4, verdichtet.
  - Wo steht die Longlist: Zahlen je Stufe, Veränderung zur Vorwoche.
  - Was steht an: die nächsten Schritte, aus den Wiedervorlagen.
- Zustellung als Mail an den Mandanten, mit Link auf die Langfassung in seinem Zugang,
  wo er die Longlist anonymisiert durchsehen kann.
- Vor dem Versand ein Entwurf für Sie, mit der Möglichkeit, einen eigenen Absatz
  voranzustellen. Nichts geht ohne Ihre Freigabe hinaus, jedenfalls anfangs. Später
  wahlweise automatisch.
- Jeder Bericht wird als Fassung festgehalten, damit nachvollziehbar bleibt, was dem
  Mandanten wann berichtet wurde.

**Fertig, wenn** für drei Mandate je ein Bericht erzeugt, von Ihnen freigegeben und
zugestellt wurde, und der Mandant die Longlist auf der Plattform ansehen kann.

**Messgrösse** Rückfragen des Mandanten nach dem Stand. Sie sollten verschwinden.

---

## Sprint 6, v0.518: Ansprache in der Plattform

**Warum.** Heute läuft die Ansprache über Outlook, und damit fehlt der Plattform
genau die Hälfte der Geschichte, die der Mandantenbericht erzählen soll.

**Was vorhanden ist.** Kampagnen je Mandat, Vorlagen, Reaktionszählung und ein
Posteingang, der Antworten einliest, gibt es bereits. Was fehlt, ist der Faden je
Person und die Entscheidung, dass die Plattform der Ort ist und nicht die Zweitablage.

**Inhalt**

- Ein Gesprächsfaden je Kontakt und Mandat: alles, was hinausging, alles, was
  zurückkam, in einer Spur, mit dem Funnel-Stand daneben.
- Senden aus dem Faden heraus, mit Vorlage und Platzhaltern, Absender ist Ihre Adresse,
  Antworten kommen über den vorhandenen Posteingang zurück in den Faden.
- Serienansprache aus der Longlist heraus: Auswahl, Vorlage, Vorschau je Empfänger,
  ein Blick auf alle Entwürfe, dann Versand.
- Eine harte Regel bleibt: keine Adresse ohne Einwilligung in einen Verteiler.
  Einzelansprache im Mandatsverhältnis bleibt davon unberührt.

**Fertig, wenn** eine vollständige Ansprachewelle für ein Mandat aus der Plattform
heraus gelaufen ist und die Antworten im Faden stehen.

**Messgrösse** Anteil der Ansprachen, die aus der Plattform statt aus Outlook gehen.

---

## Sprint 7, v0.519: Nachfassen mit einem Klick

**Inhalt**

- Erinnerung nach sieben Tagen ohne Reaktion, freundlich und mit Bezug auf das Mandat.
- Nach dreissig Tagen die Standfrage mit zwei Knöpfen, ohne Anmeldung, über einen
  einmaligen Link wie bei der Pflegeseite: „Ich bin weiter interessiert" und „Für mich
  erledigt". Die Antwort setzt den Status im Funnel und steht im Mandantenbericht.
- Wer zweimal nicht antwortet, rutscht bei künftigen Vorschlägen nach hinten.
- Abschaltbar je Mandat und je Person, und der erste Lauf geht nur mit Ihrer Freigabe.

**Fertig, wenn** ein Durchlauf über FARADAY gelaufen ist und die Antworten im Funnel
stehen.

**Messgrösse** Antworten und Absagen aus dem ersten Durchlauf. Eine Absage ist hier ein
gutes Ergebnis.

---

## Sprint 8, v0.520: Käuferqualifizierung in drei Stufen

**Warum.** Die grösste Differenzierung bei kleinstem Aufwand. Bei keinem DACH-Anbieter
ist ein Kapitalnachweis belegt.

**Inhalt**

- Stufe eins, Selbstauskunft: Eigenkapital, Finanzierungsweg, bisherige Transaktionen,
  Pflicht vor der ersten Anfrage.
- Stufe zwei, Plausibilität: Verhältnis von Selbstauskunft zur Grösse des Mandats, nur
  für die Verkäuferseite sichtbar.
- Stufe drei, geprüft: freiwilliger Nachweis, gesehen und nicht gespeichert.
  Festgehalten werden Ergebnis, Datum und Prüfer, wie beim NDA-Nachweis aus v0.506.
- Anfragen an Mandate über dem Dreifachen der angegebenen Mittel werden gekennzeichnet,
  zunächst als Hinweis und nicht als Sperre.

**Fertig, wenn** jede neue Anfrage eine Selbstauskunft trägt.

**Messgrösse** Anteil der Anfragen mit Selbstauskunft, und wie viele zur geprüften
Stufe gehen.

---

## Sprint 9, v0.521: Der Prozessagent

**Inhalt**

- Eine Regelmaschine über alle Mandate, täglich: Vereinbarung seit zehn Tagen nicht
  unterschrieben, Datenraum freigegeben und nie geöffnet, Frage seit sieben Tagen offen,
  Zugang ohne Nachweis, Kontakt seit dreissig Tagen ohne Bewegung, Mandat seit sechzig
  Tagen ohne Fortschritt, Mandantenbericht seit zwei Wochen nicht versendet.
- Eine Morgenmail an die Beratung mit höchstens zehn Punkten, nach Dringlichkeit.
- Dieselbe Liste im Verwaltungsbereich, je Punkt ein Knopf, der die Sache erledigt.
- Kein Sprachmodell für die Regeln, nur für die Zusammenfassung in einem Satz, und auch
  die nur, wenn ein Dienst eingerichtet ist.

**Fertig, wenn** die Morgenmail eine Woche gelaufen ist und Sie sagen können, welche
drei Regeln nützen und welche Lärm sind.

**Messgrösse** Anteil der Punkte, die Sie am selben Tag erledigen. Unter einem Drittel
heisst, der Agent meldet zu viel.

---

## Sprint 10, v0.522: Phalanx OS, die Arbeitsteilung

**Warum.** In Phalanx OS entsteht gerade ein eigenes Agentic-CRM. Zwei Systeme, die
beide klug sein wollen, erzeugen zwei Wahrheiten, wenn die Grenze nicht gezogen ist.

**Die Grenze, die ich vorschlage**

| Gehört Phalanx OS | Gehört CapitalMatch |
|---|---|
| Der Mensch: Stammdaten, Historie über alle Mandate hinweg, Segmente, Einwilligung | Der Vorgang: Mandat, Funnel-Stufe, Vereinbarung, Datenraum, Fragen |
| Die Akquise: wen spreche ich überhaupt an | Die Ausführung: was ist in diesem Mandat mit dieser Person passiert |
| Agentische Recherche und Anreicherung | Agentische Prozessführung im laufenden Mandat |

**Inhalt**

- Die Standmeldung aus v0.509 um die Ansprache erweitern: versendet, geantwortet,
  abgesagt, mit Datum, damit Phalanx OS die Kontakthistorie vollständig hat.
- Gegenrichtung: Anreicherungen aus dem Phalanx-OS-Agenten als Vorschlag in
  CapitalMatch, mit Quelle, Übernahme auf Klick. Dieselbe Mechanik wie v0.509.
- Eine Longlist in Phalanx OS zusammenstellen und als Mandats-Longlist nach
  CapitalMatch übergeben, statt über eine Excel-Datei.
- Keine doppelte Pflege: Wo ein Feld drüben geführt wird, ist es hier gesperrt und
  zeigt, woher es kommt.

**Fertig, wenn** eine Longlist aus Phalanx OS ohne Zwischendatei in einem Mandat landet
und die Ansprache von dort zurückgemeldet wird.

**Messgrösse** Felder, die an zwei Stellen gepflegt werden. Ziel null.

---

## Sprint 11, v0.523: Eine Seite je Mandat

**Inhalt**

- Je aktivem Mandat eine eigene, anonyme Seite mit sprechender Adresse, Kurzprofil,
  Branche, Region, Umsatzband, EBITDA-Band und einem einzigen nächsten Schritt.
- Zweisprachig aus dem vorhandenen Bestand, Auszeichnung für Suchmaschinen.
- Der Marktplatz bekommt den Unterschied zwischen angemeldet und abgemeldet, den er
  heute vermissen lässt: abgemeldet die Bänder, angemeldet die Zahlen.

**Fertig, wenn** jedes aktive Mandat seine Seite hat und eine davon in der Suche
auffindbar ist.

**Messgrösse** Aufrufe je Mandatsseite und daraus entstandene Anfragen.

---

## Sprint 12, v0.524: Suchprofile als zweiter Marktplatz

**Inhalt**

- Anonyme Suchprofilseite je Käufer, freiwillig und abschaltbar: Branche, Region,
  Grösse, Zeitrahmen, Erfahrung, Qualifizierungsstufe aus Sprint 8.
- Inhaber und Berater können darin suchen und ansprechen, ohne dass ein Mandat
  inseriert ist.
- Dieselbe Abgleichmechanik wie heute, nur in der anderen Richtung.

**Fertig, wenn** ein Inhaber ohne eigenes Inserat drei passende Nachfolger findet.

**Messgrösse** Veröffentlichte Suchprofile und Anfragen darauf.

---

## Sprint 13, v0.525: Der Trichter in Zahlen

**Inhalt**

- Je Mandat: Anfragen, Unterschriften, Datenräume, Absichtserklärungen, Abschlüsse,
  und die Verweildauer je Stufe.
- Über alle Mandate dieselbe Rechnung je Quartal.
- Ein Blatt, das sich zeigen lässt, ohne Namen.

**Fertig, wenn** die Zahlen für 2026 vorliegen und stimmen.

**Messgrösse** Das ist die Messgrösse. Danach entscheiden Sie, ob Sie sie
veröffentlichen. Niemand im Markt tut es.

---

## Sprint 14, v0.526: Aufnahmeassistent für Verkäufer

**Inhalt**

- Ein geführtes Gespräch statt eines Formulars: Geschäftsmodell, Jahresabschlüsse
  hochladen, bereinigtes EBITDA mit sichtbaren Bereinigungen, Vorschlag für Branche,
  Sektor und Grössenklasse.
- Daraus Kurzprofil und Memorandum, zweisprachig, als Entwurf.
- Jede Zahl mit ihrer Herkunft, nichts ohne Bestätigung.

**Fertig, wenn** ein neues Mandat in unter dreissig Minuten vollständig steht.

**Messgrösse** Zeit bis zum freigegebenen Kurzprofil, heute ein Nachmittag.

---

## Sprint 15, v0.527: Suchagent für Käufer

**Inhalt**

- Das Suchprofil im Klartext statt in Feldern.
- Täglicher Lauf über alle Mandate, Meldung nur bei Veränderung.
- Je Treffer zwei Sätze: warum er passt, und was dagegen spricht. Das Dagegen ist der
  eigentliche Wert.

**Fertig, wenn** fünf Käufer den Agenten zwei Wochen benutzt haben.

**Messgrösse** Anteil der vorgeschlagenen Mandate, die der Käufer anfragt.

---

## Parallel und ohne Code

Diese Spur läuft neben den Sprints, hängt an niemandem und braucht Entscheidungen statt
Programmierung.

1. **Anwaltliche Prüfung** des Provisionsmodells. Schwerpunkt Widerrufsrecht auf der
   Käuferseite, danach Nachwirkungsfrist und Mindesthonorar in den AGB. Vor Sprint 5
   anstossen, weil die Selbstauskunft die Registrierungsstrecke berührt.
2. **Drei Partner** gewinnen, je einer aus Finanzierung, Steuer und Recht,
   kategorie-exklusiv. Die Finanzierung zuerst, weil sie der häufigste Abbruchgrund ist.
3. **Die Trennung schärfen** zwischen Phalanx als Beratung und CapitalMatch als
   Plattform, in der Aussendarstellung und in den Verträgen. Das ist keine Formsache:
   Verflechtung kostet im Streitfall den Provisionsanspruch.

---

## Was nach Sprint 11 offen bleibt

Bewusst nicht eingeplant, damit die Liste ehrlich bleibt: eine eigene Datenengine, eine
kostenpflichtige Mitgliedschaft, eine Schnittstelle für fremde Berater-CRM, eine
englischsprachige Marktöffnung. Alle vier sind denkbar, keiner davon ist vor einem
belegten Abschluss über die Plattform zu rechtfertigen.
