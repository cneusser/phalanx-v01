# CapitalMatch · Datenschutz-, Aufbewahrungs- und Löschkonzept

Stand: 26.07.2026 · Arbeitsdokument, keine Rechtsberatung. Vor Livegang mit einem
Datenschutzbeauftragten oder Anwalt final abstimmen.

## 1. Rechtsgrundlagen

- Registrierung und Vertragsanbahnung: Art. 6 Abs. 1 lit. b DSGVO.
- Projektbezogene Ansprache im laufenden M&A-Prozess: Art. 6 Abs. 1 lit. f DSGVO,
  mit Widerspruchsmöglichkeit in jeder Nachricht.
- Einladung von Bestandskontakten: Einwilligung per Double-Opt-in
  (Art. 6 Abs. 1 lit. a DSGVO), revisionssicher protokolliert (Zeitpunkt, IP,
  Textversion).
- Nachfolge-Profil und Lebenslaufdaten: ausdrückliche Einwilligung, Zweckbindung,
  Anonymität bis zur Namensnennung.

## 2. Datenkategorien

- Stammdaten: Anrede, Name, Firma, Position, Kontakt, Rolle.
- Prozessdaten: Interessen, NDA, Datenraum-Zugriffe, Nachrichten, Angebote.
- Nachfolge-Profil: Erfahrung, Zielbranche und -region, Umsatzband, Eigenkapital.
- Protokolle: Audit-Log und Aktivitäts-Log (append-only), inklusive IP.
- Abrechnung: Abrechnungsereignisse ohne Zahlungsmittel-Daten (Provider extern).

## 3. Aufbewahrungsfristen (Vorschlag)

- Aktive Konten: solange die Geschäftsbeziehung besteht.
- Inaktive Konten ohne Transaktion: Prüfung nach 24 Monaten, dann Anonymisierung.
- Protokolle (Audit, Aktivität): 12 Monate, danach Verdichtung oder Löschung,
  soweit keine gesetzliche Aufbewahrung entgegensteht.
- Abrechnungsereignisse: nach handels- und steuerrechtlichen Fristen (bis 10 Jahre).
- Datenraum-Dokumente: mit dem Mandat, spätestens nach Abschluss plus vereinbarte
  Frist, dann sichere Löschung.

## 4. Löschung und Anonymisierung

- Nutzer-Löschung durch Admin: pseudonymisiert die Person, entfernt oder anonymisiert
  personenbezogene Felder, IP in Protokollen wird anonymisiert. Bereits umgesetzt.
- Einladung abgelehnt: der Kontakt wird dauerhaft auf nicht kontaktieren gesetzt.
- Ziel: eine Selbstbedienungs-Löschanfrage im Konto, die einen Admin-Workflow auslöst.

## 5. Auskunft und Datenübertragbarkeit (Art. 15 und 20)

- Vorhanden: Selbstbedienungs-Export des eigenen Aktivitäts- und Audit-Trails.
- Offen (nächster Schritt): vollständiger Export der Stammdaten, des Profils und
  der Kommunikationsübersicht als maschinenlesbare Datei.

## 6. Auftragsverarbeiter (zu pflegen)

- Hosting und Datenbank: EU-Region, Auftragsverarbeitungsvertrag erforderlich.
- Mailversand und Inbound (z. B. Brevo): Auftragsverarbeitungsvertrag.
- Zahlungsdienst (später, z. B. Stripe oder Mollie): eigener Vertrag, keine
  Kartendaten in der Plattform.
- Optionaler Virenscan und Objekt-Storage: als Auftragsverarbeiter listen.

## 7. Technische und organisatorische Maßnahmen

- Mandantentrennung mit erzwungener Row-Level-Security (fail-closed).
- Rollen und Rechte je Mandat, Datenraum-Zugriff nur nach Freigabe, Wasserzeichen.
- Passwörter mit bcrypt, 2FA für das Team erzwingbar, JWT-Schlüssel stark und
  in Produktion fail-closed, Sitzungsentwertung bei Passwort-Reset.
- Sicherheits-Header inklusive Content-Security-Policy und HSTS.
- Append-only Protokolle für Zugriffe und Änderungen.

## 8. Offene Punkte bis Livegang

- Verzeichnis der Verarbeitungstätigkeiten fertigstellen.
- Auftragsverarbeitungsverträge einholen und ablegen.
- Vollexport nach Art. 15 im Konto ergänzen.
- Automatische Fristenprüfung für inaktive Konten und Protokolle.
