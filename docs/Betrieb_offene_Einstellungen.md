# Zwei Einstellungen in Railway, Stand 14.11.2026

Beides lässt sich nicht im Quelltext erledigen, weil beides eine Entscheidung
über die Umgebung ist und nicht über den Code. Hier steht, was zu setzen ist
und woran man erkennt, ob es gewirkt hat.

---

## 1. EIGENE_DOMAINS

### Was ohne die Variable passiert

Der Mailverlauf (seit v0.462) kann eingehende und ausgehende Mails
unterscheiden. Woran er das erkennt, steht in `EIGENE_DOMAINS`. Ist die
Variable leer, gilt keine Adresse als eigene, und jede Mail wird als eingehend
geführt. Das ist bewusst so gebaut: Eine fehlende Einstellung soll die Richtung
nicht raten.

Folge im Alltag: Ihre eigenen Mails an einen Interessenten stehen im Verlauf
so, als hätte er sie geschrieben, und der Zähler „unbeantwortet" stimmt nicht.

### Was zu setzen ist

In Railway, Variablen des Dienstes:

```
EIGENE_DOMAINS=phalanx.de,capitalmatch.de
```

Kommagetrennt, ohne Leerzeichen, ohne `@`. Unterdomains werden mit erfasst,
eine Mail von `no-reply@mail.phalanx.de` gilt also als eigene. Falls über eine
weitere Versanddomain zugestellt wird, gehört sie in dieselbe Zeile.

### Woran Sie erkennen, dass es gewirkt hat

Im CRM beim Kontakt, Reiter Mailverlauf: Ihre eigenen Mails stehen nach dem
Neustart rechts als ausgehend und setzen den Status nicht mehr auf
„unbeantwortet". Bereits eingelesene Mails werden nicht rückwirkend umsortiert;
die Richtung wird beim Einlesen festgehalten.

---

## 2. Stand der zweisprachigen Spalten

### Worum es geht

Die Wanderung aus v0.410 legte die englischen Spalten nur an, wenn die deutsche
Spalte damals schon bestand. Eine halb ausgeführte Wanderung gilt als
ausgeführt und läuft nie wieder. v0.467 bringt eine zweite, die den Endzustand
prüft statt den Verlauf und sich gefahrlos wiederholen lässt.

Ob sie in der Produktion durchgelaufen ist, lässt sich von aussen nicht sehen,
und raten hilft hier nicht.

### Wie Sie es prüfen

Angemeldet als Verwaltung die Seite **Datenpflege** öffnen und zum Abschnitt
„Übersetzungen der Mandate" gehen.

- Der Abschnitt zeigt die Mandate: Die Spalten sind da, nichts weiter zu tun.
- Es erscheint eine rote Karte mit den Namen fehlender Spalten: Die Wanderung
  ist nicht gelaufen. Dann in Railway die Protokolle des letzten Neustarts
  ansehen; eine fehlgeschlagene Wanderung hält den Start an und steht dort mit
  Namen.

Seit v0.467 wird in beiden Fällen etwas angezeigt. Ein leerer Bereich ohne
Erklärung kann nicht mehr vorkommen; das war der Fehler, der die Sache so lange
verdeckt hat.

### Warum erst danach die englische Fassung von Nexora

Das Exposé selbst ist einsprachig. Die englische Fassung gehört in die
Marktplatzkarte des Mandats, und die braucht die `_en`-Spalten. Solange die
fehlen, nimmt die Plattform den englischen Text nicht an.
