// ─────────────────────────────────────────────────────────────────────────────
// Vertraulichkeit gilt in beiden Ablagen (v0.481)
//
// Anlass, wörtlich: „Was auch ein Thema ist anscheinend, dass Kunden Daten
// abrufen können, die eigentlich geschwärzt sein müssten."
//
// Nachgestellt an der laufenden Anlage, und es stimmt. Die Ursache sind zwei
// Ablagen mit zwei Begriffen für dieselbe Sache:
//
//   • Im Datenraum heisst sie `safe_items.confidential`, wird nach unten
//     vererbt und kennt Einzelfreigaben über `safe_grants`.
//   • In der alten Unterlagen-Ablage heisst sie `documents.restricted`, kennt
//     keine Vererbung und hat eigene Freigaben in `document_grants`.
//
// Wer im Datenraum „vertraulich" setzt, schreibt nur in die erste. Die zweite
// bleibt offen. Ein Interessent mit Datenraum-Freigabe lud die Datei dann nicht
// im Datenraum, sondern unter „Unterlagen", und dort fragte niemand nach der
// Vertraulichkeit. Der Datenraum antwortete 403, die Unterlagen lieferten aus.
//
// Hier steht die Brücke. Sie fragt für ein Dokument der alten Ablage, was der
// Datenraum über dasselbe Objekt sagt, und zwar mit genau der Logik, die der
// Datenraum benutzt: `datenraumSicht`, nicht eine Nachbildung. Verbunden werden
// die beiden über `documents.safe_item_id` und, wo die fehlt, über den
// Dateinamen. Der Dateiname ist die schwächere Verbindung, aber die falsche
// Richtung des Irrtums ist hier die richtige: Lieber eine Datei zu viel
// gesperrt als eine Gehaltsliste zu viel ausgeliefert.
//
// Mandatspflegende sind nicht betroffen; für sie gibt es im Baum keine Grenzen.
// ─────────────────────────────────────────────────────────────────────────────

const sicht = require('./datenraumSicht');

/**
 * Die Sperrliste für einen Käufer in einem Mandat.
 *
 * @returns {Promise<{idsGesperrt: Set<number>, namenGesperrt: Set<string>, idsOhneDownload: Set<number>, namenOhneDownload: Set<string>}>}
 */
async function fuerKaeufer(user, projectId, alle) {
  const sperre = {
    idsGesperrt: new Set(), namenGesperrt: new Set(),
    idsOhneDownload: new Set(), namenOhneDownload: new Set(),
  };
  const ktx = await sicht.kaeuferKontext(user, projectId, alle).catch(() => null);
  if (!ktx) return sperre;
  const b = await sicht.bewerteFuer(ktx, projectId, alle).catch(() => null);
  if (!b) return sperre;

  for (const i of b.items) {
    if (Number(i.is_folder) === 1) continue;
    const bew = b.bewertung.get(Number(i.id));
    // Kein Eintrag in der Bewertung heisst: im Datenraum nicht sichtbar.
    if (!bew || bew.gesperrt) {
      sperre.idsGesperrt.add(Number(i.id));
      if (i.name) sperre.namenGesperrt.add(String(i.name).toLowerCase());
      continue;
    }
    if (!bew.download) {
      sperre.idsOhneDownload.add(Number(i.id));
      if (i.name) sperre.namenOhneDownload.add(String(i.name).toLowerCase());
    }
  }
  // Objekte, die der Käufer gar nicht in der Bewertung hat, weil seine Stufe
  // sie ausschliesst, kommen über `fuerStufe` schon nicht in b.items vor. Die
  // alte Ablage hat dafür ihr eigenes Gate (access_level), das unverändert gilt.
  return sperre;
}

/** Ist dieses Dokument der alten Ablage für diesen Käufer gesperrt? */
function istGesperrt(doc, sperre) {
  if (!doc || !sperre) return false;
  if (doc.safe_item_id && sperre.idsGesperrt.has(Number(doc.safe_item_id))) return true;
  if (doc.filename && sperre.namenGesperrt.has(String(doc.filename).toLowerCase())) return true;
  return false;
}

/** Darf dieses Dokument geladen werden, oder nur angesehen? */
function nurAnsicht(doc, sperre) {
  if (!doc || !sperre) return false;
  if (doc.safe_item_id && sperre.idsOhneDownload.has(Number(doc.safe_item_id))) return true;
  if (doc.filename && sperre.namenOhneDownload.has(String(doc.filename).toLowerCase())) return true;
  return false;
}

module.exports = { fuerKaeufer, istGesperrt, nurAnsicht };
