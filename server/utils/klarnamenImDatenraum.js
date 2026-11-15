// ─────────────────────────────────────────────────────────────────────────────
// Klarnamen im Datenraum finden (v0.479, Datenraum 2.0, Vorgriff auf Sprint 3)
//
// Anlass, wörtlich: „Bei FARADAY nochmals alle Dokumente durchsuchen und
// alles, was Klarnamen von Mitarbeitern oder ähnlichem enthält, prüfen und
// in einen Sicherheitsordner schieben beziehungsweise schwärzen."
//
// Die Prüfung auf Klarnamen gibt es seit v0.427. Sie sah bisher nur
// Mandatstexte, Exposé und Dateinamen an. Was in den Dateien steht, hat
// nie jemand geprüft, und genau dort stehen Arbeitsverträge, Gehaltslisten
// und Personallisten.
//
// ── Zwei Dinge, die diese Datei bewusst nicht tut ───────────────────────
//
//   Sie ändert nichts. Gemeldet wird mit Fundstelle und Umgebung; was
//   geschwärzt oder weggeschlossen wird, entscheidet ein Mensch. Automatisch
//   zu schwärzen hiesse, Unterlagen zu verändern, ohne dass jemand hinsieht,
//   und ein falsch geschwärzter Jahresabschluss ist auch ein Schaden.
//
//   Sie behauptet keine Vollständigkeit. Geprüft wird der Text, den die
//   Plattform aus der Datei gewonnen hat. Ein eingescanntes Blatt ohne
//   Textebene hat keinen, und eine Datei ohne Text ist deshalb nicht
//   sauber, sondern ungeprüft. Der Unterschied steht im Bericht, denn ein
//   leeres Ergebnis ist bei einer Personendatenprüfung die gefährlichste
//   Antwort: Es sieht aus wie „alles in Ordnung".
//
// ── Was als Fund zählt ──────────────────────────────────────────────────
//
// Dieselben Regeln wie überall: bekannte Namen aus dem Kontaktbestand des
// Mandats, dazu Muster, die fast immer eine Person bezeichnen. Ergänzt um
// Begriffe aus der Sperrliste des Mandats, sobald es sie gibt.
//
// Zusätzlich ein Hinweis auf Dateien, deren Name oder Ordner schon nach
// Personaldaten klingt. Eine Gehaltsliste gehört auch dann hinter die
// höhere Stufe, wenn in ihr zufällig kein Name im Klartext steht.
// ─────────────────────────────────────────────────────────────────────────────

const { pruefeText } = require('./klarnamen');

// Wörter, die eine Datei unabhängig vom Inhalt verdächtig machen. Sie sind
// kein Beweis, sondern ein Grund hinzusehen.
const VERDAECHTIGE_WOERTER = [
  'personal', 'mitarbeiter', 'gehalt', 'lohn', 'arbeitsvertrag', 'arbeitsverträge',
  'lebenslauf', 'bewerbung', 'kündigung', 'abfindung', 'zeugnis', 'urlaub',
  'krank', 'schwerbehind', 'betriebsrat', 'sozialversicherung', 'lohnsteuer',
  'geburtsdatum', 'personalakte', 'stellenplan', 'headcount', 'payroll',
];

const normal = (s) => String(s || '').toLowerCase();

/** Klingt Name oder Ordner nach Personaldaten? */
function verdaechtigerName(name, pfad) {
  const text = `${normal(name)} ${normal(pfad)}`;
  return VERDAECHTIGE_WOERTER.filter((w) => text.includes(w));
}

/**
 * Eine Datei bewerten.
 *
 * @param datei   { id, name, pfad, mime, content_text, confidential, size }
 * @param bekannt Namen aus dem Kontaktbestand des Mandats
 * @param sperre  zusätzliche Begriffe aus der Sperrliste des Mandats
 * @returns {{ id, name, pfad, geprueft, funde, woerter, stufe, grund }}
 */
function bewerteDatei(datei, bekannt = [], sperre = []) {
  const text = String(datei.content_text || '');
  const geprueft = text.trim().length > 0;
  const funde = geprueft ? pruefeText(text, [...bekannt, ...sperre]) : [];
  // Der Dateiname wird mitgeprüft: „Arbeitsvertrag Bergmann.pdf" verrät
  // einen Namen, bevor jemand die Datei überhaupt öffnet.
  for (const f of pruefeText(datei.name, [...bekannt, ...sperre])) {
    funde.push({ ...f, hinweis: `${f.hinweis} (im Dateinamen)` });
  }
  const woerter = verdaechtigerName(datei.name, datei.pfad);

  let stufe = 'unauffaellig';
  let grund = 'kein Fund';
  if (funde.length) {
    stufe = 'treffer';
    grund = `${funde.length} Fundstelle${funde.length === 1 ? '' : 'n'}`;
  } else if (woerter.length) {
    stufe = 'verdacht';
    grund = `Name oder Ordner deutet auf Personaldaten (${woerter.join(', ')})`;
  } else if (!geprueft) {
    stufe = 'ungeprueft';
    grund = 'kein Text gewonnen, etwa ein Scan oder eine Tabelle';
  }
  return {
    id: datei.id,
    name: datei.name,
    pfad: datei.pfad || '',
    mime: datei.mime || null,
    vertraulich: Number(datei.confidential || 0) === 1,
    geprueft,
    stufe,
    grund,
    woerter,
    funde: funde.slice(0, 40),
    funde_gesamt: funde.length,
    begriffe: [...new Set(funde.map((f) => f.treffer).filter((t) => String(t).length >= 3))].slice(0, 40),
  };
}

/** Eine Liste von Dateien bewerten und zusammenfassen. */
function bewerteAlle(dateien = [], bekannt = [], sperre = []) {
  const zeilen = dateien.map((d) => bewerteDatei(d, bekannt, sperre));
  const zaehle = (s) => zeilen.filter((z) => z.stufe === s).length;
  return {
    zeilen: zeilen.sort((a, b) => {
      const rang = { treffer: 0, verdacht: 1, ungeprueft: 2, unauffaellig: 3 };
      return (rang[a.stufe] - rang[b.stufe]) || (b.funde_gesamt - a.funde_gesamt);
    }),
    stand: {
      dateien: zeilen.length,
      treffer: zaehle('treffer'),
      verdacht: zaehle('verdacht'),
      ungeprueft: zaehle('ungeprueft'),
      unauffaellig: zaehle('unauffaellig'),
      bereits_vertraulich: zeilen.filter((z) => z.vertraulich).length,
    },
  };
}

module.exports = { VERDAECHTIGE_WOERTER, verdaechtigerName, bewerteDatei, bewerteAlle };
