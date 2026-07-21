# Changelog · CapitalMatch (Phalanx GmbH)

Wird bei jeder Release mitgeführt. Die In-App-Ansicht (Admin → „Changelog") wird
über Seed-Migrationen gespeist; diese Datei ist die kuratierte Gesamtübersicht.

## v0.309 · 28.08.2026 · Firma am Nutzer über die stabile Verknüpfung
- **Nicht mehr über den Namen**: Die Admin-Nutzerliste löst die Firma jetzt über die Kette Konto → CRM-Kontakt → aktuelle Unternehmenszuordnung auf und verlinkt auf die **ID** des Unternehmens. Namensänderungen wirken damit überall, ohne dass Verweise brechen
- **Arbeitgeberwechsel bleiben korrekt**: Die Zuordnung Kontakt zu Unternehmen ist historisiert (`started_on`, `ended_on`). Angezeigt wird die aktuelle Position, frühere bleiben als Historie erhalten
- **Abweichungen werden sichtbar**: Weicht der bei der Registrierung getippte Firmenname von der verknüpften Firma ab, steht das daneben. So fällt auf, wenn jemand inzwischen woanders arbeitet
- **Ohne Verknüpfung** bleibt der bisherige Weg über die Namenssuche, erkennbar an der gepunkteten Unterstreichung. Das ist zugleich der Hinweis, dass hier noch eine Verknüpfung fehlt
- Bewusst **kein zweites Firmenfeld am Nutzerkonto**: Eine Fremdschlüsselspalte auf `users` wäre eine konkurrierende Wahrheit ohne Historie und würde mit der CRM-Zuordnung auseinanderlaufen
- Verifiziert: vier Testsuites grün, Build sauber und warnungsfrei, Textwächter ohne Befund

## v0.308 · 27.08.2026 · Suchprofile am Kontakt, Sprung in die Firma
- **Die beiden Pools sind verheiratet**: Im Kontakt steht jetzt unter „Suchprofil" beides nebeneinander. Oben der Investitionsschwerpunkt aus dem CRM (dort pflegbar, auch vom Kontakt selbst über den Pflege-Link), darunter das **Käuferprofil und die gespeicherten Suchen aus dem Plattform-Konto** mit Branchen, Regionen, Deal-Typen, Umsatz- und EBITDA-Band sowie der Benachrichtigungsfrequenz
- Voraussetzung ist die Konto-Verknüpfung aus v0.298. Ist kein Konto verknüpft, sagt der Kontakt das ausdrücklich statt einen leeren Bereich zu zeigen
- **In die Firma springen**: Der Unternehmensname ist in der Kontaktliste und im Kontakt klickbar und öffnet das Unternehmen mit allen Kontakten, Mandaten und Verknüpfungen
- **Auch aus dem Admin**: In der Nutzerliste führt die Firma ins CRM
- **Neue Deeplinks**: `/crm?company=7` öffnet ein Unternehmen direkt, `/crm?q=Name` sucht danach
- Verifiziert: sechs Testsuites grün, Build sauber und warnungsfrei, Textwächter ohne Befund

## v0.307 · 26.08.2026 · Prozesskette bleibt in einer Zeile
- Die Kennzahlen über dem Funnel brachen bei neun Stufen um. Sie stehen jetzt in einer durchgehenden Zeile, in der Verkäufer- wie in der Adminsicht
- Auf schmalen Bildschirmen wird die Zeile waagerecht scrollbar, statt umzubrechen: bei einer Prozesskette ist die Abfolge die eigentliche Information

## v0.306 · 26.08.2026 · Unterlagen-Link ohne Registrierung
- **Der zweite Weg neben der Freigabe**: Ein persönlicher Link auf genau eine Unterlage, ganz ohne Konto und ohne NDA. Gedacht für Gegenüber, die beides nie tun werden
- **Vertraulichkeit per Klick**: Vor dem Öffnen bestätigt der Empfänger mit seinem vollständigen Namen, dass er die Unterlage vertraulich behandelt und nicht weitergibt. Name, Zeitpunkt und IP werden protokolliert. Das ersetzt keine Unterschrift, ist aber ein belastbarer Nachweis
- **Vier Schutzschichten**: Ablaufdatum (1 bis 90 Tage), optionale Höchstzahl an Abrufen, jederzeitiger Widerruf und ein Wasserzeichen mit dem Namen des Empfängers auf jeder Seite
- **Nachvollziehbar**: Im Kontakt sehen Sie alle vergebenen Links, wie oft sie geöffnet wurden, von wem sie bestätigt wurden und bis wann sie gelten
- **Zwei Quellen**: eine einzelne Unterlage aus der Dokumentenliste des Mandats oder das hinterlegte Exposé-PDF
- Verifiziert: fünf Testsuites grün, Build sauber und warnungsfrei, Textwächter ohne Befund

## v0.305 · 25.08.2026 · Startup-Finanzierung: Unterlagen nach Freigabe statt nach NDA
- **Ursache behoben**: Institutionelle Investoren unterzeichnen in aller Regel kein NDA (siehe Rückmeldung von Capnamic zu Nexora). Bei Mandaten vom Typ Startup-Finanzierung ersetzt jetzt eine ausdrückliche Freigabe durch die Beratung die Unterschrift
- **Freigabe als Schutz**: Der Investor fragt die Unterlagen an, freigegeben wird je Einzelfall von Hand. Damit sehen keine Wettbewerber die Unterlagen, obwohl kein NDA vorliegt
- **Abgestuft**: Nach der Freigabe sind Pitch Deck und Kurzprofil sichtbar. Der Datenraum bleibt gesperrt und wird weiterhin gesondert freigegeben
- **Umkehrbar und nachvollziehbar**: Die Freigabe lässt sich jederzeit entziehen, jeder Schritt steht im Protokoll, und der Investor wird über die Freigabe per Mail informiert
- **M&A bleibt streng**: Dort gilt unverändert das unterzeichnete NDA. Der Server weist eine Freigabe ohne NDA bei M&A-Mandaten ausdrücklich zurück
- In der Käufersicht heißt der Knopf bei Startup-Finanzierungen jetzt „Unterlagen anfragen" statt „NDA anfordern"
- Verifiziert: fünf Testsuites grün, Build sauber und warnungsfrei, Textwächter ohne Befund

## v0.304 · 24.08.2026 · Nachricht aus der Plattform schreiben
- **„Nachricht schreiben" am Kontakt**: freier Text ohne Vorlage, wahlweise mit Mandatsbezug. Anrede, Unterschrift und Rechtshinweis ergänzt die Plattform automatisch
- **Antwort kommt bei Ihnen an**: Die Mail trägt Ihre Adresse als Antwort-Adresse. Der Empfänger antwortet ganz normal in seinem Mailprogramm, ohne je ein Konto anzulegen
- **Vollständig dokumentiert**: Jede Nachricht steht sofort in der Kontakt-Historie unter „Aktivitäten" und im Mail-Ausgang. „Direkt mailen" bleibt daneben bestehen, ist aber als nicht protokolliert gekennzeichnet
- Damit ist die Sendelücke geschlossen: zusammen mit dem BCC-Empfang wird der Schriftverkehr auch mit Gegenübern vollständig, die die Plattform selbst nie nutzen
- Verifiziert: vier Testsuites grün, Build sauber und warnungsfrei, Textwächter ohne Befund

## v0.303 · 23.08.2026 · Vertrauliche Mandate: nur auf Einladung
- **Sichtbarkeit je Mandat**: Im Mandat lässt sich zwischen „Öffentlich" und „Vertraulich (nur auf Einladung)" umschalten
- **Vertraulich heißt wirklich vertraulich**: Das Mandat erscheint nicht im Marktplatz, nicht in den Zählern, nicht in den Filteroptionen, und es läuft weder über das Matching noch über den Newsletter oder den Digest. Auch die Detailseite antwortet für Unbefugte mit „nicht gefunden", verrät also nicht einmal die Existenz
- **Sichtbar für**: Team, Ersteller, zugeordnete Nutzer und ausdrücklich eingeladene Beteiligte. Damit können Sie gezielt Personen einladen und ihnen dort Unterlagen bereitstellen
- **Schutz vor Versehen**: Schalten Sie ein vertrauliches Mandat auf „Öffentlich", erscheint vorher eine ausdrückliche Warnung mit dem Hinweis, was dann sichtbar wird
- **Erkennbar**: Badge „Vertraulich" in der Admin-Projektliste und im Verkäufer-Cockpit
- Bestandsmandate bleiben öffentlich, am bisherigen Verhalten ändert sich nichts
- Verifiziert: vier Testsuites grün, Build sauber und warnungsfrei, Textwächter ohne Befund

## v0.302 · 22.08.2026 · Funnel aufgeräumt: neun Stufen, Papierkorb, eigener Reiter
- **Neun statt vierzehn Stufen**: Longlist zur Freigabe → Shortlist freigegeben → Ansprache → NDA → Datenraum-Zugang → LOI → Verhandlung → Closing/Signing → Abschluss. Zwischenzustände wie Namensnennung, Zugang und Due Diligence bleiben als Merkmal am Beteiligten erhalten, nur als eigene Spalte entfallen sie. Bestandsdaten, Vorlagen-Stufen und die gesamte Automatik wurden mitgezogen
- **Freigabe sauber getrennt**: Kandidaten warten in „Longlist zur Freigabe"; gibt der Mandant frei, rücken sie auf „Shortlist freigegeben"
- **Papierkorb**: Karten lassen sich in eine Ablagezone ziehen oder über das × an der Karte entfernen, jetzt auch bei den Beteiligten. Entfernt wird nur die Zuordnung zum Mandat, der Kontakt bleibt im CRM
- **Rollenauswahl an der Beteiligten-Karte**: Berater, Steuerberater, Bank, Anwalt und so weiter direkt umstellbar
- **Mailings**: nur noch die fünf aktuellsten, abgeschlossene wandern per Klick ins Archiv und lassen sich dort wieder hervorholen
- **Deal-Funnel im Hauptmenü**: eigener Punkt, nicht mehr nur unter CRM. Das Team sieht das vollständige Board, der Verkäufer den Stand seiner Mandate mit Name und Firma, aber ohne Kontaktdaten
- Verifiziert: vier Testsuites grün, Build sauber und warnungsfrei, Textwächter ohne Befund

## v0.301 · 21.08.2026 · Exposé erscheint in der Unterlagen-Liste
- **Exposé in der Dokumentenliste**: Bei den vertraulichen Unterlagen steht jetzt ein Eintrag „Exposé (Web-Ansicht und PDF)" mit zwei Schaltflächen: „Ansehen" öffnet das Web-Exposé, „PDF" lädt den Export
- **Ohne Doppelspeicherung**: Das Exposé bleibt in seiner eigenen, gesicherten Ablage. Der Listeneintrag ist nur ein Verweis, es wird nichts kopiert
- **Gleiche Sperre wie das IM**: Sichtbar erst nach unterzeichneter NDA und nur, wenn das Exposé veröffentlicht ist. Admin und Berater sehen es immer
- Hinweis: Die öffentliche Teaser-Karte lässt sich bereits seit Sprint 9 im Exposé-Editor über „Öffentlichen Teaser aktualisieren" aus dem Exposé ableiten. Dieser Punkt war in der Roadmap zu Unrecht als offen geführt
- Verifiziert: fünf Testsuites grün, Build sauber und warnungsfrei, Textwächter ohne Befund

## v0.300 · 20.08.2026 · Individuelle Begründung je Empfänger, Vorlagen-Stufen korrigiert
- **Mailmerge**: Neuer Platzhalter `{{warum}}`. Steht er im Text, erscheint im Versand-Dialog je Empfänger ein eigenes Feld, etwa „passt zu Ihrem Fokus auf Energiedienstleistung im süddeutschen Raum". Leer lassen ist erlaubt, dann entfällt der Platzhalter für diesen Empfänger. Die Vorschau zeigt die Begründung des ersten Empfängers mit
- **Fehler behoben**: Der Vorlagen-Versand hob Kontakte auf Stufe 1, seit v0.296 ist das „Freigabe Verkäufer" statt „Angesprochen". Jetzt wird korrekt auf „Angesprochen" gestuft
- **Fehler behoben**: Die in den Mailvorlagen hinterlegten Zielstufen stammten noch aus der ursprünglichen Funnel-Leiter und wurden bei den beiden Umnummerierungen nicht mitgezogen. „NDA anfordern" hätte auf „Match" gestuft. Eine Migration hebt alle Vorlagen auf die aktuelle Leiter
- **Hygiene**: `node_modules` ist nicht mehr versioniert. Das Repository schrumpft von rund 7.800 auf 290 Dateien; die Pakete bleiben lokal und werden beim Deploy ohnehin installiert
- Verifiziert: vier Testsuites grün, Build sauber und warnungsfrei, Textwächter ohne Befund

## v0.299 · 19.08.2026 · Marktplatz für das Team wieder vollständig
- **Fehler behoben**: Seit der Käufer-/Verkäufertrennung (v0.288) wurden eigene Mandate im Marktplatz ausgeblendet, und zwar für jeden angemeldeten Nutzer. Da alle Mandate vom Team angelegt wurden, war der Marktplatz für Admin und Berater leer, während die Zähler oben weiter 5, 3 und 2 anzeigten
- **Jetzt**: Das Ausblenden eigener Mandate gilt nur noch für Käufer und Verkäufer. Admin und Berater sehen den Marktplatz wieder vollständig
- **Zähler und Filter konsistent**: Die Zahlen über der Liste und die Filteroptionen stammen jetzt aus derselben Sicht wie die Liste selbst und können nicht mehr auseinanderlaufen
- Verifiziert: Build sauber und warnungsfrei, Textwächter ohne Befund

## v0.298 · 19.08.2026 · Konto verknüpfen, Unternehmen und Mandat aus dem Kontakt
- **Konto manuell verknüpfen**: Im Kontakt gibt es unter „Plattform-Konto" eine Suche über Name oder E-Mail. Damit lässt sich ein Konto auch dann zuordnen, wenn es eine andere Adresse nutzt als der CRM-Kontakt. Genau das war der Fall bei Harald Knaus (CRM: gmx-Adresse, Konto: Firmenadresse). Nach dem Verknüpfen erscheint der Birdview
- **Unternehmen aus dem Kontakt**: Im Kontakt lässt sich ein bestehendes Unternehmen zuordnen oder ein neues direkt anlegen und verknüpfen, mit optionaler Position. Der Weg funktioniert damit in beide Richtungen
- **Mandat aus dem Kontakt**: Im Reiter „Mandate" lassen sich Mandat, Rolle (Käufer, Verkäufer, Berater, Prozessbeteiligter …) und Startstufe wählen und zuordnen
- **Beim Anlegen gleich mitgeben**: Das Kontaktformular kennt jetzt zusätzlich ein neues Unternehmen und die Mandatszuordnung samt Rolle
- Verifiziert: Build sauber und warnungsfrei, Textwächter ohne Befund

## v0.297 · 18.08.2026 · Birdview am Kontakt, Konto-Verknüpfung geheilt
- **Birdview direkt im Kontakt**: Hat der Kontakt ein Plattform-Konto, steht der Birdview-Knopf jetzt neben „Auskunft (DSGVO)". Ein Klick öffnet die Plattform mit den Augen dieses Nutzers, schreibgeschützt
- **Ursache behoben**: Das Konto wurde bisher nur erkannt, wenn der Kontakt bei der Registrierung über eine Einladung verknüpft wurde. Jetzt wird zusätzlich über die E-Mail aufgelöst und die Verknüpfung dabei dauerhaft nachgetragen. Eine Migration zieht den Bestand einmalig nach, sofern die Zuordnung eindeutig ist
- Verifiziert: Build sauber und warnungsfrei, Textwächter ohne Befund

## v0.296 · 17.08.2026 · Freigabe durch den Verkäufer, Namen im Verkäuferblick
- **Neuer Funnelschritt „Freigabe Verkäufer"** zwischen Longlist und Angesprochen. Recherchierte Kandidaten werden dem Mandanten vorgelegt und erst nach seiner Freigabe angesprochen. Die Automatik und alle Bestandsdaten wurden auf die neue Leiter gehoben
- **Freigabe-Karte im Verkäufer-Cockpit**: Der Mandant sieht die Kandidaten mit Namen und Firma und entscheidet je Kandidat „Freigeben" oder „Ablehnen". Jede Entscheidung wird protokolliert; im Funnel erscheint ein Badge „Freigabe ✓"
- **Nexora**: Alle recherchierten Kandidaten liegen jetzt beim zugeordneten Verkäufer zur Freigabe
- **Namen statt anonym**: Der Verkäufer sieht die Namen seiner Interessenten wieder. Kontaktdaten (E-Mail, Telefon) bleiben weiterhin verborgen
- **Admin-Projektliste mit Pflege-Spalte**: Je Mandat steht, wer es pflegen darf (Ersteller, Mitglied, Verkäufer). Ein Klick auf den Namen öffnet den Kontakt im CRM, dort sind Bearbeiten und Birdview möglich
- Die Cockpit-Auswertung erscheint nur noch für Verkäufer, nicht mehr für Admins
- Verifiziert: sechs Testsuites grün, Build sauber und warnungsfrei, Textwächter ohne Befund

## v0.295 · 16.08.2026 · Verkäufer-Bereich fokussiert
- **Verkäufer landen im eigenen Cockpit**: „Mein Bereich" führt Verkäufer jetzt in den Verkäufer-Bereich statt in die Käuferansicht. Wer als Verkäufer die Käuferseite öffnet, wird automatisch ins eigene Cockpit geleitet
- **Nur eigene Mandate**: Marktplatz und Käufer-Werkzeuge (fremde Mandate, NDA-Anfragen, Käuferprofil) sind für Verkäufer ausgeblendet. Sichtbar sind nur die eigenen Inserate, die Interessenten (ohne Kontaktdaten) und der Funnel
- **Eigene Inserate pflegen**: Aktive und pausierte Inserate lassen sich jederzeit über „Bearbeiten" öffnen und im geführten Wizard anpassen. Änderungen werden automatisch gespeichert, ohne erneute Prüfung
- **Rollenklarheit**: Das Menü zeigt die Rolle „Verkäufer" korrekt an
- Verifiziert: Build sauber und warnungsfrei, Textwächter ohne Befund

## v0.294 · 16.08.2026 · Verkäufer-Cockpit: Statistik, Inbox, Umschalter (DUB-Benchmark, Stufe D)
- **Verkäufer-Statistik**: Kacheln über alle eigenen Mandate (aktiv, in Prüfung, Entwurf, pausiert) plus Gesamtzahl der Interessenten
- **Konsolidierte Interessenten-Inbox**: alle Interessenten je Mandat auf einen Blick, mit Stufe und „über die Plattform antworten". Klarnamen erscheinen erst nach der Namensnennung, vorher anonym, ganz ohne Kontaktdaten
- **Aktuelles**: die jüngsten Bewegungen der letzten 14 Tage als kompakter Feed
- **Rollen-Umschalter**: Verkäufer und Team wechseln im Menü direkt zwischen Käufer-Bereich und Verkäufer-Bereich
- Konsistenz: Auch der Prozessstand am einzelnen Mandat zeigt Interessenten erst nach Namensnennung mit Klarnamen
- Damit ist das Verkäufer-Cockpit (ROADMAP Sprint 25, Stufen A bis D) abgeschlossen
- Verifiziert: Tests grün, Build sauber und warnungsfrei, Textwächter ohne Befund

## v0.293 · 15.08.2026 · Käufergruppen, Namensnennung und Plattform-NDA (DUB-Benchmark, Stufe C)
- **Zielsteuerung je Inserat**: Im Wizard-Schritt „Sichtbarkeit" wählst du die passenden Käufergruppen (strategisch, Finanzinvestor, Privat, M&A-Berater mit Suchmandat) und Schlagwörter. Ist eine Gruppe gesetzt, benachrichtigt das Matching bei Veröffentlichung nur passende Käufertypen
- **Namensnennung als eigener Schritt**: Am Kontakt gibst du je Interessent den Klarname bewusst frei. Vorher bleibt alles anonym. Die Freigabe wird protokolliert und erscheint als Badge „Klarname" im Funnel
- **Plattform-NDA als Gütesiegel**: Käufer zeichnen im Dashboard einmalig ein plattformweites Vertraulichkeitsversprechen. Der Status ist als Badge „Plattform-NDA" am Kontakt und im Funnel sichtbar
- Dritter Ausbau des Verkäufer-Cockpits (ROADMAP Sprint 25, Stufe C). Es folgt Stufe D (Verkäufer-Inbox, getrennter Mitteilungs-Feed, Ein-Konto-Rollenumschalter)
- Verifiziert: Tests grün, Build sauber und warnungsfrei, Textwächter ohne Befund

## v0.292 · 14.08.2026 · Inserat-Wizard, Moderation und Lebenszyklus (DUB-Benchmark, Stufe B)
- **Geführtes Erstellen**: Verkäufer legen ihr Inserat jetzt Schritt für Schritt an (Grundlagen, Einordnung, Kennzahlen, Beschreibung, Prüfen). Der Entwurf entsteht früh (nur der Name genügt), danach wird automatisch gespeichert. Vor dem Einreichen gibt es eine anonyme Vorschau
- **Prüf-Schritt**: Ein eingereichtes Inserat steht auf „in Prüfung" und geht erst nach Freigabe live. Der Verkäufer sieht den Status und bei Zurückweisung den Grund direkt am Inserat
- **Lebenszyklus**: Aktive Inserate lassen sich pausieren, wieder aktivieren oder schließen. Alles ohne Umweg über den Admin
- **Admin-Prüf-Queue**: Eingereichte Inserate erscheinen im Admin oben im Reiter „Projekte" und lassen sich mit einem Klick freigeben oder mit Notiz zurückweisen
- Erster Ausbau der Verkäufer-Autonomie (ROADMAP Sprint 25, Stufe B). Sichtbarkeit/Käufergruppen und die Verkäufer-Inbox (Stufen C und D) folgen
- Verifiziert: Tests grün, Build sauber und warnungsfrei, Textwächter ohne Befund

## v0.291 · 13.08.2026 · Käufertyp am Kontakt, Funnel bis Closing (DUB-Benchmark, Stufe A)
- **Käufertyp am Kontakt**: strategischer Käufer, Finanzinvestor, Privatperson oder M&A-Berater mit Suchmandat. Setzbar im Kontakt und im Anlegeformular, sichtbar als Badge in der Kontaktliste und auf der Funnel-Karte, filterbar über eine eigene Leiste im CRM. Vorbild ist die DUB-Käufergruppen-Klassifikation
- **Funnel bis zum Abschluss**: Der Deal-Funnel bekommt die transaktionsnahen Spätstufen. Neu: Match, LOI eingereicht, LOI unterschrieben, Namensnennung, Signing, Closing. Die vorderen Stufen (Longlist, Angesprochen, Rückmeldung) und die Automatik bleiben unverändert; Bestandsdaten wurden sauber auf die neue Leiter gehoben
- Erster Baustein des DUB-Verkäufer-Benchmarks (ROADMAP Sprint 25, Stufe A). Stufen B bis D (Self-Service-Inserat, Sichtbarkeit/Käufergruppen, Moderation, Verkäufer-Inbox) folgen
- Verifiziert: Tests grün, Build sauber und warnungsfrei, Textwächter ohne Befund

## v0.290 · 12.08.2026 · Rückfrage beim Verschieben, Prozess-Übersicht
- **Bestätigung beim Drag-and-drop**: Verschiebst du eine Karte auf eine andere Stufe, kommt jetzt eine kurze Rückfrage. Das Verschieben allein sendet weiterhin **keine** E-Mail; du kannst aber im selben Schritt „Verschieben + passende Prozess-Mail" wählen. So geht nichts ungewollt raus und nichts doppelt
- **Prozess- und Automatik-Übersicht** (`PROZESS_UND_AUTOMATIK.md`): erklärt die Funnel-Stufen, welche Mails automatisch laufen (Erstansprache, 7/21-Reminder, NDA nach Registrierung, IM nach Unterschrift, Benachrichtigung bei neuen Unterlagen), was manuell bleibt und wie Doppelversand vermieden wird
- Erinnerung: Der Kontakt-Reiter „Aktivitäten" zeigt seit v0.283 den vollständigen E-Mail- und Chat-Verlauf (Birdview am Kontakt)
- Verifiziert: Build sauber und warnungsfrei

## v0.289 · 11.08.2026 · Beteiligte per Drag-and-drop führen
- **Ziehen zwischen Funnel und Beteiligten**: Die Leiste „Mandant & Beteiligte" ist jetzt eine Ablagezone. Ziehst du eine Käufer-Karte hinein, wird sie zum Prozessbeteiligten und verlässt den Käufer-Funnel. Ziehst du eine Beteiligten-Karte in eine Funnel-Stufe, wird sie wieder zum Käufer auf dieser Stufe
- Die Zone erscheint während des Ziehens auch dann, wenn noch keine Beteiligten da sind, und hebt sich als Ablageziel hervor
- Die genaue Rolle (Berater, Verkäufer, Steuerberater, WP, Consultant) stellst du danach im Kontakt bzw. über die Zuordnung ein
- Verifiziert: Build sauber und warnungsfrei

## v0.288 · 11.08.2026 · Käufer- und Verkäuferrolle sauber getrennt
- **Kein Bieten auf das eigene Mandat**: Ein eingeloggter Nutzer sieht seine eigenen Mandate (die er als Verkäufer/Ersteller eingestellt hat) nicht mehr im Käufer-Marktplatz und kann dort kein Interesse/keine NDA anfordern. Das war der Birdview-Fehler, bei dem der Verkäufer wie ein Käufer auf sich selbst schauen konnte
- **Rollen bleiben getrennt**: Verkäufer bekommen kein Käufer-Suchprofil (nur die Pflege-/Prozessansicht ihres Mandats), Käufer keinen Verkäufer-Bereich. Basis für die spätere, ausführlichere und kostenpflichtige Verkäufer-Stufe
- Umgesetzt serverseitig (`GET /api/projects` blendet eigene Mandate aus; NDA-Anfrage aufs eigene Mandat wird abgelehnt)
- Verifiziert: Server-Syntax und Build sauber

## v0.287 · 11.08.2026 · Unternehmen mit Seiten und A-Z, kleinere Aufräumer
- **Unternehmen-Liste** bekommt dieselbe A-Z-Leiste und Seiten-Navigation wie die Kontakte
- **Standard-Seitengröße jetzt 10** (statt 25), für Kontakte und Unternehmen
- **„k. A." unter dem Namen entfernt**: Der leere Verantwortungsbereich wird nicht mehr als „k. A." angezeigt, nur noch wenn wirklich etwas hinterlegt ist
- Verifiziert: Build sauber und warnungsfrei

## v0.286 · 11.08.2026 · Verkäufer-Funnel über mehrere Mandate
- **Mehr-Projekt-Funnel für den Mandanten**: Im Verkäufer-Dashboard sieht der Mandant jetzt einen echten, nur-lesbaren Funnel, ähnlich der Admin-Ansicht, aber reduziert. Hat er mehrere Mandate, wählt er sie über Reiter. Je Stufe (Longlist bis Abgeschlossen) Kennzahlen und die Namen der interessierten Parteien
- **Vertraulich**: bewusst nur Namen (und optional Firma), keine Kontaktdaten, kein Bezug zu anderen Mandaten. Die Abfrage ist serverseitig auf das eigene Mandat begrenzt und nur für den verknüpften Verkäufer bzw. Berater/Admin zugänglich
- Baut auf dem Prozessstand (v0.277) und der Verkäufer-Einladung (v0.280) auf; nutzt `GET /api/projects/:id/funnel-preview`
- Verifiziert: Build sauber und warnungsfrei

## v0.285 · 10.08.2026 · Kontaktliste mit Seiten und A-Z, neue Rolle Prozessbeteiligter
- **Seiten und A-Z in der Kontaktliste**: Oben eine anklickbare A-Z-Leiste (springt zu den Nachnamen mit dem Buchstaben), unten eine Seitengröße (10 / 25 / 50 / Alle) mit Seiten-Navigation. Kein endloses Scrollen mehr, auch bei vielen Kontakten. Die Suche oben bleibt
- **Neue Beteiligten-Rolle „Prozessbeteiligter"** (Steuerberater, Wirtschaftsprüfer, Consultant): auswählbar bei der Mandats-Zuordnung, erscheint getrennt in der Leiste „Mandant & Beteiligte", nicht im Käufer-Funnel. Eigene Rechte lassen sich später über die Rollen-Matrix vergeben
- Verifiziert: Build sauber, Textwächter grün

## v0.284 · 10.08.2026 · Roboter-Test (Cloudflare Turnstile) bei Login und Registrierung
- **Bot-Schutz**: Login und Registrierung prüfen jetzt optional einen Cloudflare-Turnstile-Test (kostenlos). Das erschwert automatisiertes Durchprobieren von Passwörtern und Massen-Registrierungen durch Bots
- **Ohne Konfiguration inaktiv**: Erst wenn `TURNSTILE_SITE_KEY` (Browser) und `TURNSTILE_SECRET` (Server) gesetzt sind, erscheint der Test und wird serverseitig verifiziert. Ohne Schlüssel läuft alles unverändert weiter
- Serverseitige Verifikation gegen die Cloudflare-API; das Widget wird nur angezeigt, wenn ein Site-Key hinterlegt ist (`GET /api/auth/config`)
- Verifiziert: Build sauber, Textwächter grün

## v0.283 · 09.08.2026 · Kompletter E-Mail- und Chat-Verlauf am Kontakt
- **Jede Mail am Kontakt sichtbar**: Die Aktivitäten-Historie eines Kontakts zeigt jetzt das vollständige Mail-Ausgangsbuch, also wirklich jede Mail, die an ihn ging (Ansprache, Prozess-Mail, Einladung, NDA-Einladung, System-Mail), mit Betreff, Art und Status. So siehst du auf einen Blick, wer was bekommen hat, und vermeidest Doppelversand
- **Chat am Kontakt**: Alle Plattform-Chat-Nachrichten des Kontakts (in beide Richtungen) tauchen jetzt ebenfalls in der Kontakt-Historie auf. Damit läuft die Zuordnung an einer Stelle zusammen
- Kein Doppeleintrag mehr: Der Erstversand einer Kampagne kommt aus dem Ausgangsbuch, die Kampagnen-Sicht liefert nur noch Erinnerungen und Reaktionen
- Verifiziert: Build sauber, Textwächter grün

## v0.282 · 09.08.2026 · NDA manuell vergeben, Projekt-Zugang sichtbar
- **NDA manuell setzen**: In der Kontakt-Ansicht steht pro Mandat jetzt ein NDA-Feld: „kein NDA / angefragt / liegt vor". Das funktioniert auch für Kontakte ohne Plattform-Konto (offline unterzeichnete NDAs). Ist eine Online-Signatur vorhanden, wird sie zusätzlich als „online: unterzeichnet/angefragt" angezeigt
- **Zugang zum Mandat**: Pro Mandat ein Schalter „Zugang zum Mandat" (Unterlagen/Datenraum). So siehst und steuerst du, ob der Kontakt Zugang hat
- **Funnel-Karte**: Das NDA-Badge berücksichtigt jetzt beides, Online-Signatur und manuelle Angabe; zusätzlich zeigt ein „Zugang"-Badge, wenn der Zugang gesetzt ist
- Warum du das Badge vorher nicht sahst: Es erschien nur bei registrierten Kontakten mit Online-NDA. Herr Malessa hat zwar eingewilligt, aber ohne unterzeichnete NDA, deshalb kein Badge. Jetzt kannst du es manuell führen
- Endpunkt: `PUT /api/crm/parties/:id` akzeptiert `nda_status` und `access_granted`
- Verifiziert: Build sauber, Textwächter grün

## v0.281 · 08.08.2026 · NDA-Status auf der Karte, Chat prominent
- **NDA sichtbar am Kontakt**: Jede Funnel-Karte zeigt jetzt, ob eine NDA vorliegt, „NDA ✓" (grün, unterzeichnet oder freigegeben) oder „NDA offen" (gelb, angefragt, noch nicht gezeichnet). Auch in der Kontakt-Ansicht je Mandat sichtbar. Der Status kommt aus `nda_requests` über den mit dem Kontakt verknüpften Nutzer
- **Chat prominent erreichbar**: „Nachrichten" steht jetzt für alle angemeldeten Nutzer (auch Admins) sichtbar in der oberen Leiste, mit Sprechblasen-Symbol und einem roten Zähler für ungelesene Nachrichten. Vorher war der Chat für Admins ausgeblendet und schwer zu finden
- Verifiziert: Build sauber, Textwächter grün

## v0.280 · 08.08.2026 · Verkäufer raus aus dem Käufer-Funnel, Verkäufer einladen
- **Rollen getrennt**: Der Deal-Funnel zeigt in den Stufen-Spalten nur noch **Käufer**. Verkäufer/Mandant und weitere Beteiligte (Berater, Bank, Anwalt) stehen jetzt in einer eigenen Leiste „Mandant & Beteiligte" darüber. Herr Traxler taucht damit nicht mehr fälschlich in der Longlist auf; auch die Funnel-Kennzahlen zählen nur Käufer
- **Verkäufer einladen**: In der Beteiligten-Leiste gibt es beim Verkäufer den Knopf „Einladen". Er bekommt eine Einladung zur Plattform (Einwilligung + Registrierung). Nach der Registrierung wird er als Rolle „seller" angelegt (keine Käufer-Automatik, keine NDA) und sieht in seinem Dashboard den **Prozessstand** seines Mandats (die reduzierte Funnel-Ansicht aus v0.277)
- **Zugang sauber verknüpft**: Der registrierte Verkäufer ist über den CRM-Kontakt mit dem Mandat verbunden; die Prozessstand-Ansicht und „Meine Mandate" berücksichtigen das
- Endpunkt `POST /api/crm/deals/:projectId/invite-seller`
- Verifiziert: Build sauber, bestehende Tests grün

## v0.279 · 07.08.2026 · „Reagiert" bedeutet jetzt wirklich reagiert
- **Der Bug**: Ein Mailing zeigte „21 reagiert", obwohl niemand geantwortet hatte. Grund: Die Reminder-Automatik wertete jeden im Funnel aktiv geführten Kontakt als „reagiert", nicht erst eine echte Antwort
- **Fix**: „Reagiert" zählt jetzt nur noch echte Reaktionen auf das Mailing: Einwilligung/Registrierung, Absage, Mailantwort oder Widerspruch. Aktiv im Funnel geführte Kontakte erscheinen als eigener Status „wird im Funnel geführt (kein Reminder)" und werden nicht mehr als Reaktion gezählt
- Das Empfänger-Pop-up ist entsprechend beschriftet; bereits falsch gezählte Empfänger wurden per Migration korrigiert
- Verifiziert: 8 Tests für die Reaktions-Definition; Build sauber

## v0.278 · 06.08.2026 · Recherchelisten aus Excel ins CRM
- **Liste importieren (Excel/CSV)**: Neuer Knopf im CRM. Eine recherchierte Liste (z. B. 50 Kapitalgeber für Nexora) wird hochgeladen, die Spalten (Name, Firma, E-Mail, Ort, Notiz, Quelle) werden automatisch erkannt. Investoren-/Fondslisten ohne Personennamen werden korrekt behandelt (Fondsname dient als Kontakt- und Firmenname)
- **Dubletten-Abgleich vor dem Speichern**: Der Report zeigt je Zeile „neu" oder „schon im CRM" und eine Zusammenfassung (gesamt, neu, vorhanden, ohne E-Mail). So sieht man vor dem Import, was dazukommt und was bereits da ist. Das CRM bleibt die eine Datenbank für die Ansprache
- **In einem Rutsch**: neue Kontakte werden angelegt, optional einem Mandat zugeordnet (Longlist) und, auf Wunsch, alle direkt eingeladen. Die Einladung stellt das Projekt vor, nennt den Hintergrund und holt die Einwilligung ein; die 7/21-Tage-Reminder greifen automatisch. Widersprüche werden übersprungen
- Endpunkte `POST /api/crm/import/analyze` und `POST /api/crm/import/apply`; xlsx-Parsing serverseitig (SheetJS)
- Verifiziert: 14 Parser-Tests (Kopfzeilen-Erkennung, Spaltenzuordnung, Fonds- und Personenlisten) an der echten Nexora-Datei geprüft (51 Kontakte, 41 mit E-Mail); Build sauber
- Hinweis: Die Einladung nutzt die Standard-Projektvorstellung. Eine voll personalisierte Fundraising-Mail mit einer „Warum ihr"-Zeile je Investor lässt sich später ergänzen, indem eine Excel-Spalte auf einen Platzhalter gemappt wird

## v0.277 · 05.08.2026 · Prozessstand für den Mandanten, Reaktionen sichtbar
- **Verkäufer sieht seinen Funnel** (reduziert): Im Verkäufer-Dashboard gibt es bei aktiven Mandaten den Knopf „Prozessstand ansehen". Der Mandant sieht die interessierten Parteien (Name, optional Firma) und ihre Prozessstufe, **aber keine Kontaktdaten** (keine E-Mail, kein Telefon) und **keinen Bezug zu anderen Mandaten**. Endpunkt `GET /api/projects/:id/funnel-preview`, zugänglich nur für den Mandanten (`created_by`) sowie Berater/Admin
- **Wer hat reagiert?**: In „Versendete Mailings" ist die Reaktions-Zahl jetzt anklickbar (auch „Empfänger"). Ein Pop-up listet die Empfänger mit Namen, gruppiert nach Status (reagiert, erinnert, ohne Rückmeldung, gesperrt). Klick auf einen Namen öffnet den Kontakt. Endpunkt `GET /api/crm/campaigns/:id/recipients`
- Verifiziert: Build sauber, bestehende Tests grün, Textwächter grün

## v0.276 · 04.08.2026 · Herkunft als Admin-Kachel, dezenter im Funnel
- **Herkunft der Kontakte im Admin**: In der Übersicht gibt es jetzt eine Kachel „Herkunft der Kontakte" mit einer Zeile je Plattform (Quelle, Anzahl, zuletzt). So siehst du an einer Stelle, woher deine Leads kamen, ohne dass es an eine bestimmte Börse gebunden ist
- **Funnel wieder ruhiger**: Die auffällige „Plattform-Leads"-Leiste über dem Deal-Funnel ist raus. Die dezente Markierung direkt an der Karte („⬢ DUB.de") bleibt, die fandest du gut
- Hinweis: Die versendeten Mails stehen im Admin unter „Mail-Ausgang", ein Klick auf eine Zeile zeigt die Original-Mail

## v0.275 · 04.08.2026 · Automatik bis zur NDA, Plattform-Herkunft sichtbar
- **Ansprache erklärt CapitalMatch**: Die Einladung sagt jetzt, dass CapitalMatch unsere eigene Plattform zur Abwicklung ist, lädt zur Registrierung ein (macht den Prozess für beide Seiten einfacher) und weist darauf hin, dass die NDA direkt nach der Registrierung automatisch kommt. Die Herkunft (Marktplatz, Inserat) steht weiterhin oben
- **Automatik bis zur NDA**: Registriert sich ein per Mandats-Einladung angesprochener Kontakt, läuft ohne weiteres Zutun: Interesse wird gesetzt (Funnel rückt auf „NDA"), eine NDA-Anfrage wird angelegt und der Kontakt bekommt automatisch die E-Mail mit dem Link zum digitalen Zeichnen (`server/utils/outreach.js`, ausgelöst in `/invite/:token/register`). Nach der Unterschrift folgt das Information Memorandum automatisch. **Die Freigabe des Datenraums bleibt manuell**, das entscheidest weiterhin du
- **Plattform-Herkunft sichtbar**: Im Deal-Funnel zeigt jede Karte, über welche Plattform der Kontakt kam (z. B. „⬢ DUB.de"). Oben steht eine Übersicht „Plattform-Leads" mit Anzahl je Quelle (`GET /api/crm/leads/sources`)
- Verifiziert: 8 Tests für die automatische NDA-Einladung (Guards, Stage, Anfrage, Mail, keine Dublette) plus erweiterte Mailtext-Tests; Build sauber

## v0.274 · 03.08.2026 · Gedankenstrich raus aus den gespeicherten Mailvorlagen
- **Der Strich in der DSGVO-Einladung**: Die im Vorlagen-Editor sichtbaren Vorlagen (`crm_invite`, `profile_link`) trugen noch den Gedankenstrich, obwohl der Quellcode seit v0.267 sauber ist. Grund: Seed-Migrationen überschreiben bestehende Datenbankzeilen nicht, und v0.267 hatte genau diese beiden Vorlagen nicht mitgezogen
- **Fix**: Migration `scrub_template_dashes` zieht die beiden Systemvorlagen aus der sauberen Quelle nach (nur wo nicht im Admin von Hand bearbeitet) und entfernt danach als Sicherheitsnetz jeden verbliebenen Strich aus allen Vorlagen (Betreff, Text, Name, Button). Damit ist der Gedankenstrich in keiner transaktionsbezogenen Mail mehr enthalten
- Hinweis: Wirksam nach dem nächsten Deploy, weil die Bereinigung in der Datenbank läuft

## v0.273 · 03.08.2026 · Anfragen per Einfügen: der Standardweg
- **Copy-and-paste ist der Standardweg**: Marktplatz-Anfragen werden direkt in der Plattform eingefügt, ohne Zusatztarif bei einem Maildienst. Der Dialog weist jetzt darauf hin
- **Weiterleitung zurückgestellt**: Die Brevo-Inbound-Weiterleitung setzt bei Brevo den Professional-Tarif voraus und ist vorerst nicht aktiv. Der Webhook (`/api/inbound/lead`) bleibt im Code und ist einsatzbereit, sobald der Tarif vorliegt, es entstehen keine Kosten, solange er ungenutzt ist
- **Klarstellung**: Das Versenden der Ansprache-Mails läuft über die Transactional-Funktion und funktioniert unabhängig vom Inbound-Tarif

## v0.272 · 02.08.2026 · Anfragen weiterleiten und automatisch ansprechen
- **Weiterleiten per E-Mail (Brevo Inbound)**: Neben Copy-and-paste lassen sich Anfragen jetzt an eine Brevo-Eingangsadresse weiterleiten. Der Webhook `POST /api/inbound/lead` (abgesichert über `INBOUND_SECRET`) parst die Mail (`items[]`, `RawTextBody`) und legt den Lead an. Die Ingest-Logik liegt gemeinsam in `server/utils/leadIngest.js`, Copy-and-paste und Weiterleitung nutzen denselben Weg
- **Direkt ansprechen**: Im Übernahme-Dialog gibt es die Option „Direkt ansprechen". Ist sie gesetzt und ein Mandat zugeordnet, geht die Erstansprache sofort raus, mit Einwilligung (Double-Opt-in), Pflege-Link und Herkunftshinweis. Die 7/21-Tage-Reminder greifen automatisch, weil eine wiederverwendbare Kampagne je Mandat geführt wird (`server/utils/outreach.js`)
- **Automatik beim Weiterleiten**: `INBOUND_AUTO_OUTREACH=1` lässt die Erstansprache beim Webhook-Weg automatisch erfolgen
- **Beim Hochladen**: Neue Unterlagen benachrichtigen weiterhin automatisch die berechtigten, eingewilligten Interessenten (bestehende Funktion, hier dokumentiert)
- **Body-Limit** auf 8 MB erhöht, damit weitergeleitete Mails nicht abgewiesen werden
- Verifiziert: gemeinsame Ingest-Logik mit 6 Tests (Mandat-Treffer, Anlegen, Update, Stufe „Rückmeldung"); Parser-Tests grün; Build sauber

## v0.271 · 01.08.2026 · Kaufanfragen aus Marktplätzen einlesen
- **Anfrage einfügen**: Neuer Knopf im Deal-Funnel. Die komplette Anfrage-E-Mail eines Portals (DUB.de, nexxt-change u. a.) wird eingefügt, der Parser (`server/utils/leadParser.js`) erkennt Quelle, Name, Titel, E-Mail, Telefon, Firma, Adresse, Investortyp, Inseratsnummer und den Mandats-Hinweis
- **Vorschau vor dem Anlegen**: Alle erkannten Felder sind editierbar; das Mandat wird über den Codename in der Referenz automatisch zugeordnet (z. B. „5381 Betongold" → Betongold), lässt sich aber überschreiben
- **Übernahme**: Kontakt wird per E-Mail wiederverwendet oder neu angelegt, die Firma verknüpft, und als aktiver Inbound-Lead in die Funnel-Stufe „Rückmeldung" gestellt (`source=inbound`, Signal `marketplace`)
- **Herkunft in der Ansprache**: Portal und Inseratsnummer werden am Kontakt gespeichert (`lead_source`, `lead_ref`). Die Erstansprache nennt sie automatisch („Sie haben über die Deutsche Unternehmerbörse (DUB.de), Inserat 17392 Interesse bekundet"), und der Platzhalter `{{herkunft}}` steht in allen Vorlagen zur Verfügung. So weiß der Angeschriebene, warum und woher wir schreiben
- **Zwei Wege**: heute per Copy-and-paste im Admin. Ein Weiterleiten an eine feste Eingangsadresse (BCC/Postfach) ist als nächster Schritt vorbereitet, benötigt aber ein Eingangs-Postfach
- Verifiziert: 15 Parser-Tests an der echten DUB-Mail (Quelle, Kontakt, Referenz, Mandats-Hinweis, Fallbacks); Provenance in Invite- und Vorlagenmails geprüft; Build sauber

## v0.270 · 01.08.2026 · Anrede registrierter Nutzer, NDA-Stufe präzisiert
- **Anrede auch für registrierte Nutzer**: Die bei der Registrierung erfasste Anrede (Herr/Frau/Divers) und der optionale Titel werden jetzt in Mails genutzt, „Sehr geehrter Herr Dr. Malessa," statt „Guten Tag Alexander Malessa,". Umgesetzt zentral in `resolvePerson` (`server/utils/email.js`): fehlt die Anrede am Aufruf, wird sie über die E-Mail-Adresse aus `users` nachgeschlagen. Keine der rund zwei Dutzend Aufrufstellen muss `salutation`/`title` mitliefern
- **Korrektur zur Anrede-Aussage aus v0.268**: Registrierte Nutzer haben sehr wohl eine Anrede (Pflichtfeld bei der Registrierung); sie wurde bisher nur in den Mails nicht ausgelesen. Das ist jetzt behoben
- **NDA-Stufe im Deal-Funnel präzisiert**: Eine freigegebene, aber noch nicht unterschriebene NDA hält den Interessenten in der Spalte „NDA" (Stufe 3). Erst die tatsächliche Unterschrift (`nda_requests.signed_at`) hebt ihn auf „IM / Unterlagen" (Stufe 4). Damit steht z. B. Herr Malessa (NDA freigegeben, nicht gezeichnet) korrekt in der NDA-Spalte. Gilt für die laufende Spiegelung und den Backfill
- Verifiziert: `resolvePerson` liefert für registrierte Nutzer die förmliche Anrede und lässt CRM-Kontakte unverändert; dealSync-Tests um die NDA-Signatur erweitert (freigegeben → 3, unterschrieben → 4)

## v0.269 · 31.07.2026 · Interessenten aus der Plattform im Deal-Funnel
- **Der Fehler bei Betongold**: Herr Malessa hatte die NDA-Freigabe, tauchte aber in keiner Funnel-Spalte auf. Grund: Der Funnel kannte nur CRM-Kontakte, NDA und Interesse leben in der Nutzer-Welt. Beide Welten sind jetzt verbunden
- **Automatische Spiegelung** (`server/utils/dealSync.js`): Fordert ein Nutzer eine NDA an, zeigt Interesse oder beobachtet ein Mandat, wird zur E-Mail ein CRM-Kontakt gefunden oder angelegt und eine Partei im Funnel geführt, auf der passenden Stufe (NDA → NDA, Datenraum → IM/Unterlagen, Beobachten → Eingang). Zentrale Einbindung in `setStage`, dazu die Beobachten-Aktion
- **Neue Spalte „Eingang"** ganz vorne im Deal-Funnel: sammelt frische Inbound-Leads (Beobachter, Favoriten), bevor sie aktiv bearbeitet werden. Karten aus der Plattform tragen die Markierung „Eingang" mit dem Signal (NDA, Interesse, beobachtet)
- **Nur hochstufen, nie zurück**: Eine bestehende Partei wird höchstens auf eine höhere Stufe gehoben; eine aus der Ansprache stammende Partei behält ihre Herkunft; ein Ausstieg (`rejected`) setzt sie auf „ausgestiegen"
- **Backfill**: Bestehende Interessenten und Beobachter wurden nachgetragen, damit niemand fehlt
- Verifiziert: 11 Tests (`server/tests/dealSync.test.js`) für Stufen-Mapping, Kontakt-Anlage, Wiederverwendung und Update-statt-Doppelanlage; Build sauber

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
