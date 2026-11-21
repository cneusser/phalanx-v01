# Die Teststufe in Railway einrichten

Das sind die Schritte, die ich nicht für Sie klicken kann, weil sie Geld kosten
und in Ihrem Konto passieren. Alles andere ist gebaut.

Rechnen Sie mit etwa 20 Minuten. Am Ende haben Sie eine zweite, vollständige
CapitalMatch-Instanz mit eigener Datenbank, eigenem Dateispeicher, erfundenen
Daten, abgeschaltetem Mailversand und einem Einladungslink.

## Was entsteht

```
Produktion                          Teststufe
───────────                         ─────────
capitalmatch.de                     staging.capitalmatch.de
Branch main                         Branch staging
Postgres (Produktion)               Postgres (eigene, leer)
Volume beziehungsweise R2           eigenes Volume
CM_STUFE nicht gesetzt              CM_STUFE=teststufe
Mailversand an                      Mailversand aus
öffentlich                          nur mit Einladungslink
```

Die beiden teilen **nichts**. Eine fehlerhafte Migration auf der Teststufe
trifft die Produktion nicht, und das ist der ganze Zweck.

## Schritt 1: Branch anlegen

Entweder in GitHub Desktop, ohne Terminal:

1. Menü **Branch** → **New Branch**, Name `staging`, **Create Branch**
2. Oben auf **Publish branch** klicken
3. Bei **Current Branch** wieder auf `main` zurückstellen

Oder im Terminal. Der Pfad enthält Leerzeichen und braucht deshalb
Anführungszeichen, sonst meldet git „not a git repository":

```bash
cd "/Users/christianneusser/Downloads/Claude/Projekte/Phalanx Plattform/phalanx-v01"
git checkout -b staging
git push -u origin staging
git checkout main
```

Ab jetzt ist die Reihenfolge: Ich committe auf `main`, Sie pushen. Für einen
Test schieben Sie `main` auf `staging`, lassen die Teststufe deployen, spielen
das Drehbuch durch, und erst danach pushen Sie die Produktion. Das ist der
Gewinn.

```bash
# Wenn Sie auf der Teststufe prüfen wollen, was auf main liegt
git push origin main:staging
```

## Schritt 2: Dienst in Railway anlegen

Im bestehenden Railway-Projekt, nicht in einem neuen:

1. **New** → **GitHub Repo** → dasselbe Repository wählen.
2. Den neuen Dienst umbenennen auf `capitalmatch-teststufe`.
3. **Settings** → **Source** → **Branch** auf `staging` stellen.
4. **Settings** → **Build**: dieselben Angaben wie beim Produktionsdienst
   (Build Command und Start Command abschreiben, nicht neu erfinden).

## Schritt 3: Eigene Datenbank

1. Im Projekt: **New** → **Database** → **PostgreSQL**.
2. Umbenennen auf `postgres-teststufe`, damit Sie die beiden nie verwechseln.
3. Beim Dienst `capitalmatch-teststufe`: **Variables** → **New Variable** →
   **Add Reference** → `postgres-teststufe` → `DATABASE_URL`.

**Prüfen Sie diese Zuordnung zweimal.** Eine Teststufe, die auf die
Produktionsdatenbank zeigt, ist die gefährlichste Fehlkonfiguration in diesem
ganzen Aufbau. Danach setzen die Migrationen die Tabellen auf, und die
Demowelt schreibt hinein.

## Schritt 4: Eigenes Volume

**Settings** → **Volumes** → **New Volume**, Mount-Pfad genauso wie beim
Produktionsdienst (dort nachsehen, meist `/data`).

Für die Teststufe reicht das Volume. Die R2-Zugangsdaten der Produktion gehören
**nicht** hierher: Ein Deployment auf der Teststufe soll Dateien der Produktion
nicht überschreiben können. Also `STORAGE_PROVIDER=local` setzen (Schritt 5).

## Schritt 5: Variablen

Beim Dienst `capitalmatch-teststufe` unter **Variables**:

| Variable | Wert | Warum |
|---|---|---|
| `CM_STUFE` | `teststufe` | Balken, Tor, Demowelt, Mailbremse hängen daran |
| `TESTSTUFE_SCHLUESSEL` | eine lange Zufallsfolge | der Einladungslink |
| `TESTSTUFE_MAIL_AN` | leer lassen | kein Versand; später bei Bedarf Ihre Adresse |
| `JWT_SECRET` | eine **andere** lange Zufallsfolge als in der Produktion | sonst gilt ein Anmeldeschein auf beiden Stufen |
| `STORAGE_PROVIDER` | `local` | Dateien aufs eigene Volume |
| `NODE_ENV` | `production` | es ist ein echtes Deployment |
| `FRONTEND_URL` | `https://staging.capitalmatch.de` | |
| `DATABASE_URL` | Referenz aus Schritt 3 | |

Den Schlüssel erzeugen:

```bash
openssl rand -hex 24
```

Beide Zufallsfolgen notieren Sie in Ihrem Kennwortspeicher. Ich kenne sie
nicht und soll sie nicht kennen.

**Was Sie bewusst NICHT übernehmen:** `BREVO_API_KEY`, die R2-Zugangsdaten,
`PHALANX_*`, Webhook-Geheimnisse. Alles, was nach draussen wirkt, bleibt auf
der Produktion. Setzen Sie den Brevo-Schlüssel trotzdem, greift immer noch die
Bremse in `utils/email.js`, aber zwei Schlösser sind besser als eines.

## Schritt 6: Adresse

**Settings** → **Networking** → **Custom Domain** → `staging.capitalmatch.de`.
Railway nennt einen CNAME-Eintrag, den Sie bei Ihrem Anbieter setzen.

Wenn Sie keine eigene Adresse wollen, geht auch die
`*.up.railway.app`-Adresse, die Railway vergibt. Der Einladungslink
funktioniert genauso.

## Schritt 7: Deployen und Demowelt setzen

Nach dem ersten erfolgreichen Deployment laufen die Migrationen von selbst. Die
Demowelt setzen Sie einmal:

Railway → Dienst `capitalmatch-teststufe` → **Settings** → **Deploy** →
**Custom Start Command** vorübergehend auf

```
node server/scripts/demowelt.js --zuruecksetzen && NODE_ENV=production node server/index.js
```

Einmal deployen lassen, in den Logs den Bericht lesen, dann das Start Command
zurückstellen. Oder, bequemer, über die Railway-CLI:

```bash
railway run --service capitalmatch-teststufe node server/scripts/demowelt.js --zuruecksetzen
```

Das Skript weigert sich, wenn `CM_STUFE` nicht auf `teststufe` steht, und es
löscht ausschliesslich, was es selbst angelegt hat.

## Schritt 8: Die erste Prüfung

1. `https://staging.capitalmatch.de` aufrufen. Erwartet: die Torseite.
2. `https://staging.capitalmatch.de/teststufe/<Schlüssel>` aufrufen. Erwartet:
   Weiterleitung auf die Startseite, oben der braun gestreifte Balken
   **TESTSTUFE**.
3. Als `datenraum@demo.capitalmatch.invalid` anmelden, Kennwort
   `Teststufe!2026`.
4. `docs/testdrehbuch.md` durchgehen.

Sehen Sie den Balken **nicht**, brechen Sie ab und prüfen `CM_STUFE`. Ohne
Balken wissen Sie nicht, auf welcher Stufe Sie stehen, und dann ist die
Teststufe gefährlicher als keine.

## Der Ablauf je Release

So sieht ein Release künftig aus. Die ersten vier Schritte sind meine, die
mit **Sie** markierten Ihre.

| | Schritt | Wer |
|---|---|---|
| 1 | Bauen, Quelltextprüfungen, Textprüfung, Client-Build (`npm run check:full`) | ich |
| 2 | Commit mit Fassungsnummer, Changelog-Migration, `./scripts/fassung-markieren.sh` | ich |
| 3 | **Push auf `staging`:** `git push origin main:staging --follow-tags` (im Repository-Verzeichnis, siehe Schritt 1) | Sie |
| 4 | Prüfstand gegen die Teststufe: `npm run test:pruefstand` | ich |
| 5 | Testdrehbuch von Hand, `docs/testdrehbuch.md` | Sie |
| 6 | Bericht, Punkt für Punkt, offene Punkte benannt | ich |
| 7 | **Freigabe.** Ohne sie geht nichts weiter | Sie |
| 8 | **Push auf die Produktion:** `git push origin main --follow-tags` | Sie |

`--follow-tags` schickt das Fassungs-Tag mit. Ohne das bleibt die Version in
GitHub Desktop leer, weil die Anzeige dort am Tag hängt und nicht an
`package.json`.

Dafür brauche ich von Ihnen einmal: die Adresse der Teststufe und den
Einladungsschlüssel. Die Datenbank-Adresse brauche ich **nicht**, und Sie
sollen sie mir auch nicht geben.

Wenn auf der Teststufe etwas bricht, bleibt die Produktion unberührt und ich
baue nach. Das ist der ganze Zweck des Aufbaus, und deshalb ist Schritt 7
keine Formalie.

## Laufende Kosten

Ein weiterer Dienst, eine weitere Postgres, ein weiteres Volume. Bei Railway
sind das nach meinem Kenntnisstand wenige Euro im Monat bei diesem
Datenvolumen, aber die Preise ändern sich, prüfen Sie sie im Dashboard. Dem
gegenüber steht, was zwei unentdeckte Fehler an Zugkraft gekostet haben.
