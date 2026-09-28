/**
 * Die Konversationsliste sortieren, filtern und kappen.
 *
 * Steht bewusst neben der Seite und nicht darin: Wer zwanzig Konversationen
 * hat, merkt einen Fehler hier erst, wenn er eine Antwort übersieht. Das ist
 * genau die Art Fehler, die man nicht durch Hinsehen findet.
 *
 * Regeln:
 *   • Ungelesenes zuerst, darin das Neueste oben.
 *   • Ungelesenes wird nie abgeschnitten. Das ist der Teil, der Arbeit bedeutet.
 *   • Gekappt wird nur der gelesene Rest, und zwar so, dass die Liste insgesamt
 *     die Grenze einhält.
 */
export const GRENZE = 10;

const nachDatum = (a, b) => new Date(b.last_at || 0) - new Date(a.last_at || 0);

export function ordnen(liste, { suche = '', alleZeigen = false, grenze = GRENZE } = {}) {
  const text = String(suche || '').trim().toLowerCase();
  const passt = (k) => !text
    || [k.name, k.company, k.last].some((f) => String(f || '').toLowerCase().includes(text));

  const gefiltert = (liste || []).filter(passt);
  const ungelesen = gefiltert.filter((k) => Number(k.unread) > 0).sort(nachDatum);
  const gelesen = gefiltert.filter((k) => !Number(k.unread)).sort(nachDatum);
  const platz = Math.max(0, grenze - ungelesen.length);
  const gelesenSichtbar = alleZeigen ? gelesen : gelesen.slice(0, platz);

  return {
    gefiltert, ungelesen, gelesen, gelesenSichtbar,
    versteckt: gelesen.length - gelesenSichtbar.length,
  };
}
