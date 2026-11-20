// ─────────────────────────────────────────────────────────────────────────────
// Welche Stufe bin ich? (v0.482)
//
// Anlass, wörtlich: „Es sollte eine Produktivebene geben und eine Testebene.
// Und in der Testebene kann ich Daten und so weiter, Demo-Daten etc. ganz gut
// nutzen."
//
// Eine zweite Stufe ist nur dann ein Gewinn, wenn drei Dinge zutreffen. Fehlt
// eines, ist sie gefährlicher als keine:
//
//   1. Man kann sie nicht mit der Produktion verwechseln. Eine Kopie, die
//      aussieht wie das Echte, ist eine Falle: Irgendwann pflegt jemand dort
//      einen Interessenten ein und wundert sich, dass er nicht ankommt.
//   2. Sie schreibt nicht nach draussen. Eine Kopie mit echten Adressen in
//      der Datenbank, die Mails verschickt, schreibt Investoren an. Deshalb
//      ist der Versand auf der Teststufe aus, bis eine Adresse ausdrücklich
//      freigeschaltet ist.
//   3. Sie ist nicht öffentlich. Wer die Adresse errät, soll ein Tor finden
//      und keinen Datenraum.
//
// Diese Datei ist die eine Stelle, an der die Antwort steht. Alles andere
// fragt hier. Ohne gesetzte Variable gilt „produktion", damit eine vergessene
// Variable nie versehentlich die Produktion lockert.
// ─────────────────────────────────────────────────────────────────────────────

const ERLAUBT = ['produktion', 'teststufe'];

/** Die Stufe dieses Dienstes. Ohne Angabe: produktion. */
function stufe() {
  const s = String(process.env.CM_STUFE || '').trim().toLowerCase();
  return ERLAUBT.includes(s) ? s : 'produktion';
}

const istProduktion = () => stufe() === 'produktion';
const istTeststufe = () => stufe() === 'teststufe';

/**
 * Darf an diese Adresse gesendet werden?
 *
 * Auf der Produktion immer. Auf der Teststufe nur, wenn die Adresse in
 * TESTSTUFE_MAIL_AN steht. Dort sind einzelne Adressen erlaubt und ganze
 * Domänen in der Form @example.org. Leer heisst: kein Versand.
 */
function darfMailen(empfaenger) {
  if (istProduktion()) return true;
  const ziel = String(empfaenger || '').trim().toLowerCase();
  if (!ziel) return false;
  const liste = String(process.env.TESTSTUFE_MAIL_AN || '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!liste.length) return false;
  return liste.some((e) => (e.startsWith('@') ? ziel.endsWith(e) : ziel === e));
}

/** Der Betreff, wie er die Teststufe verlässt. Unverwechselbar. */
function betreff(roh) {
  return istTeststufe() ? `[TESTSTUFE] ${roh}` : roh;
}

/**
 * Ein Satz Angaben für die Oberfläche. Der Schlüssel kommt hier nie vor.
 */
function fuerDieOberflaeche() {
  return {
    stufe: stufe(),
    ist_teststufe: istTeststufe(),
    hinweis: istTeststufe()
      ? 'Teststufe. Alle Mandate und Kontakte hier sind erfunden, der Mailversand ist bis auf freigeschaltete Adressen aus.'
      : null,
  };
}

/**
 * Schreibende Arbeit, die eine Datenbank leerräumt, darf nur auf der
 * Teststufe laufen. Wer das aufruft und auf der Produktion steht, bekommt
 * einen Abbruch und keine Warnung.
 */
function nurAufDerTeststufe(was = 'Dieser Vorgang') {
  if (!istTeststufe()) {
    throw new Error(`${was} läuft nur auf der Teststufe. CM_STUFE steht auf „${stufe()}".`);
  }
}

module.exports = {
  stufe, istProduktion, istTeststufe, darfMailen, betreff,
  fuerDieOberflaeche, nurAufDerTeststufe, ERLAUBT,
};
