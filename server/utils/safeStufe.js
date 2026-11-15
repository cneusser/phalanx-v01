// ─────────────────────────────────────────────────────────────────────────────
// Welche Stufe sieht dieser Käufer, und was gehört auf diese Stufe?
// (v0.478, Datenraum 2.0 Sprint 1, Teil 2)
//
// Bis v0.477 kannte der Safe nur eine Antwort: Entweder der Käufer hat die
// Datenraum-Freigabe, dann sieht er den Baum, oder er hat sie nicht, dann
// sieht er nichts. Ein Teaser, der auf die öffentliche Stufe gehört, hatte
// im Baum also keinen Platz, an dem er für den Käufer sichtbar wäre.
//
// Deshalb hier zwei kleine Begriffe und eine Regel.
//
//   Stufe       public < nda < dataroom
//               Was der Käufer erreicht, ergibt sich aus seiner Akte.
//   Stand       entwurf, geprueft, freigegeben, zurueckgezogen
//               Nur Freigegebenes verlässt das Haus.
//
// Die Regel: Ein Objekt ist für den Käufer überhaupt erst ein Kandidat,
// wenn seine Stufe erreicht ist UND sein Stand „freigegeben" lautet. Alles
// Weitere, also Vertraulichkeit und Einzelfreigaben, entscheidet danach
// unverändert `safeVisibility`.
//
// Die Reihenfolge ist Absicht: Erst wird weggenommen, was gar nicht in
// Frage kommt, dann wird das Übrige bewertet. Umgekehrt müsste die
// Bewertung die Stufe kennen, und die Regeln lägen wieder an zwei Stellen.
//
// Ordner sind der Sonderfall, der es interessant macht. Ein Ordner gehört
// dazu, wenn unter ihm etwas liegt, das dazugehört. Sonst stünde der Teaser
// in einem Ordner, den der Käufer nicht sehen darf, und wäre damit wieder
// unsichtbar.
// ─────────────────────────────────────────────────────────────────────────────

const RANG = { public: 1, nda: 2, dataroom: 3 };

/** Die höchste Stufe, die diese Akte erreicht. */
function stufeAusAkte(stage, { stageAllows }) {
  if (stageAllows(stage, 'dataroom')) return 'dataroom';
  if (stageAllows(stage, 'im')) return 'nda';
  return 'public';
}

/** Ist diese Stufe von jener aus erreichbar? */
const erreicht = (stufeDesObjekts, stufeDesKaeufers) => (RANG[stufeDesObjekts] || 3) <= (RANG[stufeDesKaeufers] || 1);

/** Die Stufe, auf die eine Zugangsart des alten Dokumentenmodells zeigt. */
const ausZugangsart = (level) => ({ public: 'public', nda: 'nda', approved: 'dataroom' }[level] || 'dataroom');

/**
 * Den Baum auf das reduzieren, was für diese Stufe überhaupt in Frage kommt.
 *
 * @param items  [{ id, parent_id, is_folder, sichtbar_ab, stand }]
 * @param stufe  'public' | 'nda' | 'dataroom'
 * @returns dieselben Objekte, gefiltert
 */
function fuerStufe(items = [], stufe = 'public') {
  const kandidat = (i) => {
    if (Number(i.is_folder) === 1) return false;         // Ordner später, über ihre Kinder
    if (String(i.stand || 'freigegeben') !== 'freigegeben') return false;
    return erreicht(i.sichtbar_ab || 'dataroom', stufe);
  };

  const proId = new Map(items.map((i) => [Number(i.id), i]));
  const behalten = new Set();
  for (const i of items) {
    if (!kandidat(i)) continue;
    behalten.add(Number(i.id));
    // Den Weg nach oben mitnehmen, sonst hängt die Datei im Nichts.
    let p = i.parent_id == null ? null : Number(i.parent_id);
    let schutz = 0;
    while (p != null && proId.has(p) && schutz++ < 50) {
      behalten.add(p);
      const eltern = proId.get(p);
      p = eltern.parent_id == null ? null : Number(eltern.parent_id);
    }
  }
  return items.filter((i) => behalten.has(Number(i.id)));
}

module.exports = { RANG, stufeAusAkte, erreicht, ausZugangsart, fuerStufe };
