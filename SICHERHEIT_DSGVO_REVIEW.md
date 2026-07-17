# Sicherheits- und DSGVO-Review, CapitalMatch

Stand: v0.284. Diese Prüfung fasst zusammen, welche Schutzmaßnahmen vorhanden sind, wo Handlungsbedarf besteht und was vor dem öffentlichen Livegang erledigt sein sollte. Sie ersetzt keinen externen Penetrationstest oder eine anwaltliche DSGVO-Abnahme, gibt aber einen belastbaren Überblick.

## Was gut abgesichert ist

- **Passwörter** werden mit bcrypt gehasht (Cost-Faktor 10), niemals im Klartext gespeichert.
- **Zugriffstrennung je Mandant** über PostgreSQL Row Level Security (FORCE, fail-closed) auf 22 Tabellen. Ohne gesetzten Mandanten-Kontext sind keine Zeilen sichtbar.
- **Zugriffs-Gates serverseitig**: Teaser, Information Memorandum, Exposé und Datenraum werden anhand der Interest-Stage geprüft. Direkte URLs oder API-Aufrufe umgehen das nicht.
- **Das Exposé ist NICHT offen**: Das Exposé-PDF wird nur nach unterzeichneter Vertraulichkeitsvereinbarung (IM-Stufe) ausgeliefert. Anonyme oder nur registrierte Nutzer ohne NDA erhalten es nicht.
- **2-Faktor-Authentifizierung** (TOTP) für Staff, optional erzwingbar.
- **Rate Limiting**: global (500 / 15 min) und schärfer für Anmeldung/Registrierung (50 / 15 min) gegen Durchprobieren.
- **Bot-Test** (Cloudflare Turnstile) an Login und Registrierung, sobald konfiguriert (v0.284).
- **Transport/Härtung**: Helmet-Header, CORS mit Allowlist, `trust proxy` für korrekte Client-IPs.
- **DSGVO-Betroffenenrechte**: Auskunft nach Art. 15 (JSON-Export je Kontakt) und Löschung/Anonymisierung nach Art. 17 sind implementiert; Einwilligungen (Double-Opt-in) werden mit Zeitpunkt, Textversion und IP protokolliert; Widerspruch sperrt die weitere Ansprache.
- **Audit-Trail** (append-only) über sicherheitsrelevante Aktionen.

## Vor dem Livegang unbedingt erledigen

1. **JWT_SECRET setzen** (höchste Priorität). Fehlt die Variable, wird ein öffentlich bekannter Default verwendet, dann ließen sich Sitzungs-Tokens fälschen. In Railway eine lange Zufallszeichenkette (z. B. 48+ Zeichen) als `JWT_SECRET` hinterlegen. Der Server warnt beim Start laut, wenn der Wert fehlt (v0.284).
2. **Turnstile aktivieren**: `TURNSTILE_SITE_KEY` und `TURNSTILE_SECRET` aus dem (kostenlosen) Cloudflare-Turnstile-Dashboard in Railway setzen. Bis dahin ist der Bot-Test inaktiv.
3. **HTTPS erzwingen**: Railway liefert TLS. Sicherstellen, dass es keine HTTP-Zugänge gibt und ein HSTS-Header gesetzt ist (Helmet kann das übernehmen, sollte aktiviert werden).
4. **Rechtstexte anwaltlich prüfen**: AGB, Datenschutzerklärung und die NDA sind Entwürfe auf Basis der tatsächlichen Funktionsweise, aber ohne juristische Abnahme.
5. **Auftragsverarbeitungsverträge (AVV)** mit den Dienstleistern schließen: Railway (Hosting/DB), Brevo (Mailversand). Beide verarbeiten personenbezogene Daten in Ihrem Auftrag.

## Mittelfristig empfohlen

- **Passwort-Reset und Einladungs-Register** ebenfalls hinter Turnstile bzw. strengeres Rate Limit stellen.
- **Content-Security-Policy** (in Helmet aktuell deaktiviert) für die ausgelieferte App einschalten, reduziert XSS-Risiko.
- **Backup-/Restore-Konzept** der Datenbank dokumentieren und testen (Railone-Point-in-Time oder regelmäßige Dumps).
- **Session-Invalidierung**: Tokens laufen nach 7 Tagen ab; ein „überall abmelden" bei Passwortwechsel wäre eine sinnvolle Ergänzung.
- **node_modules nicht ins Repo**: aktuell mitversioniert; sauberer wäre eine `.gitignore` plus Installation im Build.

## Zur Frage „können extern Passwörter abgegriffen werden?"

- Passwörter werden nur gehasht gespeichert und nie zurückgegeben. Über die API werden keine Passwort-Hashes ausgeliefert.
- Der Login ist ratenbegrenzt und (mit Turnstile) bot-geschützt; automatisiertes Durchprobieren wird deutlich erschwert.
- Das Restrisiko liegt vor allem beim fehlenden `JWT_SECRET` (Punkt 1) und bei Phishing gegen einzelne Nutzer, nicht in einer offenen Schnittstelle. Mit gesetztem `JWT_SECRET`, aktivem Turnstile und 2FA ist die Anmeldung solide abgesichert.
