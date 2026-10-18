/**
 * Die Begrüßung im eigenen Bereich (v0.464).
 *
 * Anlass: „Es sollte ein wenig persönlicher zugehen und der Nutzer begrüßt
 * werden."
 *
 * Zwei Festlegungen, beide bewusst:
 *
 * 1. Anrede und Nachname, nicht der Vorname. „Willkommen, Simon" klingt nach
 *    einer App für Freizeitsport. Hier verkauft jemand sein Lebenswerk oder
 *    kauft ein Unternehmen; die Sie-Form ist die, in der dieses Geschäft
 *    geführt wird. Fehlt die Anrede, bleibt der Vorname als Rückfall, denn
 *    „Guten Tag, Hodapp" wäre schlechter als beides.
 *
 * 2. Tageszeit statt immer „Willkommen". Das kostet nichts und ist der
 *    Unterschied zwischen einer Maske und einem Gegenüber.
 */

/** „Guten Morgen" bis fünf Uhr nachmittags, danach „Guten Abend". */
export function tagesgruss(jetzt = new Date()) {
  const h = jetzt.getHours();
  if (h < 11) return 'Guten Morgen';
  if (h < 18) return 'Guten Tag';
  return 'Guten Abend';
}

/** Die vollständige Zeile, zum Beispiel „Guten Tag, Herr Dr. Hodapp". */
export function begruessung(user, jetzt = new Date()) {
  const gruss = tagesgruss(jetzt);
  if (!user) return gruss;
  const anrede = ['Herr', 'Frau'].includes(user.salutation) ? user.salutation : null;
  const nachname = (user.last_name || '').trim();
  if (anrede && nachname) {
    return `${gruss}, ${[anrede, (user.title || '').trim(), nachname].filter(Boolean).join(' ')}`;
  }
  const vorname = (user.first_name || '').trim();
  return vorname ? `${gruss}, ${vorname}` : gruss;
}

/**
 * Der eine Satz unter der Begrüßung: was jetzt ansteht.
 *
 * Bewusst genau ein nächster Schritt und nicht eine Liste. Wer drei
 * gleichwertige Vorschläge sieht, macht keinen davon.
 */
export function naechsterSchritt({ rolle, deals = 0, profilGepflegt = true, ndaGezeichnet = true }) {
  if (rolle === 'seller') {
    return deals > 0
      ? 'Ihr Unternehmen ist eingereicht. Unten sehen Sie, wie weit die einzelnen Interessenten sind.'
      : 'Als Nächstes: Reichen Sie Ihr Unternehmen ein. Wir prüfen es und melden uns bei Ihnen.';
  }
  if (!ndaGezeichnet) return 'Als Nächstes: Zeichnen Sie die einmalige Vertraulichkeitsvereinbarung. Das dauert zwei Minuten.';
  if (!profilGepflegt) return 'Als Nächstes: Hinterlegen Sie Ihre Suchkriterien, dann schlagen wir Ihnen passende Mandate vor.';
  if (!deals) return 'Als Nächstes: Sehen Sie sich den Marktplatz an und melden Sie Interesse bei einem Kurzprofil.';
  return 'Unten sehen Sie Ihren Stand je Mandat.';
}
