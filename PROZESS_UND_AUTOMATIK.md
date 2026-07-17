# CapitalMatch, Prozess- und Automatik-Übersicht

Stand: v0.290. Diese Seite erklärt, was in den Funneln passiert, welche Mails automatisch laufen und was manuell bleibt. Ziel: ein durchgängiger, schlanker Prozess ohne Doppelarbeit und ohne Doppelversand.

## Die zwei Welten

- **CRM-Kontakt**: Jeder, den du recherchierst oder importierst. Hat noch kein Plattform-Konto. Lebt im CRM (Unternehmen, Kontakte, Deal-Funnel).
- **Plattform-Nutzer**: Ein Kontakt, der sich registriert hat. Ab hier laufen NDA, Datenraum, Chat und Q&A.

Die Brücke zwischen beiden ist die E-Mail-Adresse. Sobald ein Kontakt sich registriert, wird er automatisch mit seinem CRM-Eintrag verknüpft.

## Der Deal-Funnel (Käufer)

Nur **Käufer** stehen in den Stufen-Spalten. Verkäufer/Mandant und weitere Beteiligte (Berater, Steuerberater, WP, Consultant) stehen getrennt in der Leiste „Mandant & Beteiligte".

| Stufe | Bedeutung |
|------|-----------|
| Eingang | Frische Inbound-Leads (Marktplatz-Anfrage, Beobachter), noch nicht bearbeitet |
| Longlist | Recherchierte Zielkontakte, noch nicht angeschrieben |
| Angesprochen | Erstansprache ist raus |
| Rückmeldung | Kontakt hat reagiert oder ist aktiv im Gespräch |
| NDA | NDA angefragt oder freigegeben, noch nicht unterschrieben |
| IM / Unterlagen | NDA unterschrieben, Information Memorandum und Unterlagen frei |
| Gespräch | Management-Gespräch |
| Angebot / LOI | Indikatives Angebot liegt vor |
| Due Diligence | Datenraum-Prüfung läuft |
| Abgeschlossen | Transaktion durch |

## Welche Mails automatisch laufen

1. **Erstansprache** (du löst sie aus: „Anschreiben", Excel-Import mit „Direkt ansprechen", oder „Anfrage einfügen"): stellt das Mandat vor, holt die Einwilligung, lädt zur Plattform ein. Danach greifen automatisch die **Reminder nach 7 und 21 Tagen**.
2. **Reminder-Automatik** (läuft im Hintergrund): schickt die zwei Nachfassungen, aber **stoppt sofort**, sobald der Kontakt reagiert, widerspricht oder du ihn als „aktiv/ausgestiegen" führst. Kein Dauerfeuer.
3. **Nach der Registrierung** eines angesprochenen Käufers: die **NDA-Einladung geht automatisch raus**. Unterschreibt er, wird das **Information Memorandum automatisch** frei.
4. **Neue Unterlagen hochladen**: die berechtigten, eingewilligten Interessenten werden **automatisch benachrichtigt**.
5. **Inbound** (Marktplatz-Anfrage, Beobachten, Interesse): erscheint automatisch im Funnel (Eingang bzw. passende Stufe).

## Was manuell bleibt (bewusst)

- **Die Datenraum-Freigabe** nach unterschriebener NDA entscheidest du.
- **Das Verschieben im Funnel per Drag-and-drop** ändert nur die Stufe und **verschickt von sich aus keine Mail**. Seit v0.290 kommt beim Verschieben eine kurze Rückfrage: „Nur verschieben" oder „Verschieben + passende Prozess-Mail". So kann nichts ungewollt rausgehen und nichts doppelt.

## Doppelversand vermeiden

- Jede versendete Mail steht im **Mail-Ausgang** (Admin) und **am Kontakt** unter „Aktivitäten", inklusive Betreff, Art und Status. Dort siehst du jederzeit, wer was bekommen hat.
- Der Pflege-Link hat eine 14-Tage-Sperre gegen versehentlichen Zweitversand.
- Kontakte mit Widerspruch werden bei Sammel-Aktionen automatisch übersprungen.

## Der Kontakt als 360°-Ansicht (Birdview)

Klick auf einen Kontakt öffnet die Detailansicht mit Reitern:

- **Stammdaten** (pflegbar), **Mandate** (Rolle, Funnel-Stufe, NDA-Status manuell setzbar, Zugang), **Wiedervorlagen**, **Aktivitäten**.
- Der Reiter **Aktivitäten** zeigt seit v0.283 den kompletten Verlauf: **jede** E-Mail an den Kontakt (Ansprache, Prozess, Einladung, NDA, System) und **alle Chat-Nachrichten**, dazu Einladungen, Pflege-Links und Selbstpflege.

## Lean-Empfehlungen

- Ein Kontakt, eine Wahrheit: Recherchelisten immer über „Liste importieren" mit Dubletten-Abgleich, nicht doppelt anlegen.
- Ansprache über Vorlagen statt Freitext, damit Betreff/Herkunft/Platzhalter konsistent sind.
- Statuspflege über den Funnel: „aktiv/dabei" stoppt Reminder, „ausgestiegen" nimmt den Kontakt sauber raus.
- Vor jeder Sammel-Mail kurz in den Mail-Ausgang schauen, was zuletzt lief.
