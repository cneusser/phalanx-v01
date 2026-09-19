// ─────────────────────────────────────────────────────────────────────────────
// Sichtbarkeit im Datenraum (Safe) für Käufer (v0.392).
//
// Grundregel nach Freigabe: Der Käufer sieht den gesamten Ordnerbaum. Ausgenommen
// sind als vertraulich gekennzeichnete Knoten (Clean Team). Diese erscheinen nur
// als gesperrter Eintrag, ihr Inhalt bleibt verborgen, bis es für die Person eine
// ausdrückliche Einzelfreigabe gibt.
//
// Vererbung, in beide Richtungen:
//   • Vertraulichkeit wird nach unten vererbt: Was unter einem vertraulichen
//     Ordner liegt, ist ebenfalls vertraulich.
//   • Eine Freigabe wird nach unten vererbt: Wer einen Ordner freigegeben
//     bekommt, sieht dessen Inhalt.
//
// Stufen einer Freigabe: 'read' (ansehen) und 'download' (ansehen und laden).
//
// Die Funktion ist bewusst frei von Datenbank und Netz, damit die Regeln
// vollständig testbar sind.
// ─────────────────────────────────────────────────────────────────────────────

const STUFE = { read: 1, download: 2 };

/**
 * Trifft eine Freigabe auf diesen Nutzer zu?
 *   subject_type: 'user' | 'buyer_group' | 'party_all' | 'group'
 */
function giltFuer(grant, { userId, buyerType, groupIds = [] }) {
  switch (grant.subject_type) {
    case 'user': return String(grant.subject_ref) === String(userId);
    case 'buyer_group': return !!buyerType && String(grant.subject_ref) === String(buyerType);
    case 'party_all': return true;
    case 'group': return groupIds.map(String).includes(String(grant.subject_ref));
    default: return false;
  }
}

/**
 * Bewertet den gesamten Baum für einen Käufer.
 *
 * items:  [{ id, parent_id, is_folder, confidential }]
 * grants: [{ item_id, subject_type, subject_ref, level }]
 * Rückgabe: Map<id, { sichtbar, gesperrt, download, vertraulich }>
 *   sichtbar   Eintrag erscheint in der Liste
 *   gesperrt   erscheint, aber Inhalt und Download bleiben zu
 *   download   Datei darf geladen werden
 */
function bewerteBaum({ items = [], grants = [], userId, buyerType = null, groupIds = [] } = {}) {
  const proId = new Map(items.map((i) => [Number(i.id), i]));
  const kinder = new Map();
  const wurzeln = [];
  for (const i of items) {
    const p = i.parent_id == null ? null : Number(i.parent_id);
    if (p == null || !proId.has(p)) wurzeln.push(Number(i.id));
    else {
      if (!kinder.has(p)) kinder.set(p, []);
      kinder.get(p).push(Number(i.id));
    }
  }

  // Eigene Freigabestufe je Knoten (höchste zutreffende)
  const eigeneStufe = new Map();
  for (const g of grants) {
    if (!giltFuer(g, { userId, buyerType, groupIds })) continue;
    const id = Number(g.item_id);
    const s = STUFE[g.level] || 0;
    if (s > (eigeneStufe.get(id) || 0)) eigeneStufe.set(id, s);
  }

  // Liegt irgendwo unterhalb (oder auf) diesem Knoten eine Freigabe? Wird
  // gebraucht, damit eine Einzelfreigabe tief im vertraulichen Zweig auch
  // erreichbar ist: Die Ordner auf dem Weg dorthin öffnen sich dann gerade so
  // weit, dass das freigegebene Objekt sichtbar wird, der Rest bleibt verborgen.
  const freigabeImTeilbaum = new Map();
  const pruefeTeilbaum = (id) => {
    if (freigabeImTeilbaum.has(id)) return freigabeImTeilbaum.get(id);
    let treffer = (eigeneStufe.get(id) || 0) > 0;
    for (const k of (kinder.get(id) || [])) { if (pruefeTeilbaum(k)) treffer = true; }
    freigabeImTeilbaum.set(id, treffer);
    return treffer;
  };
  for (const w of wurzeln) pruefeTeilbaum(w);

  const ergebnis = new Map();
  const lauf = (id, vertraulichVonOben, stufeVonOben) => {
    const item = proId.get(id);
    if (!item) return;
    const vertraulich = vertraulichVonOben || Number(item.confidential || 0) === 1;
    const stufe = Math.max(stufeVonOben, eigeneStufe.get(id) || 0);

    let gesperrt = false;
    let download = true;

    if (vertraulich) {
      if (stufe === 0) {
        download = false;
        // Ohne jede Freigabe im Teilbaum: als gesperrter Eintrag zeigen, Inhalt zu.
        if (!freigabeImTeilbaum.get(id)) gesperrt = true;
      } else if (stufe === STUFE.read) {
        download = false;
      }
    }
    ergebnis.set(id, { sichtbar: true, gesperrt, download, vertraulich });

    if (gesperrt) return;   // Inhalt eines gesperrten Ordners bleibt verborgen
    for (const k of (kinder.get(id) || [])) {
      // Im vertraulichen Zweig ohne eigene Freigabe nur den Weg zu freigegebenen
      // Objekten zeigen; alles andere dort bleibt unsichtbar.
      if (vertraulich && stufe === 0 && !freigabeImTeilbaum.get(k)) continue;
      lauf(k, vertraulich, stufe);
    }
  };
  for (const w of wurzeln) lauf(w, false, 0);
  return ergebnis;
}

/** Nur die Einträge, die der Käufer in der Liste sehen darf. */
function sichtbareItems(items, bewertung) {
  return items
    .filter((i) => bewertung.has(Number(i.id)))
    .map((i) => {
      const b = bewertung.get(Number(i.id));
      return { ...i, gesperrt: b.gesperrt, darf_download: b.download, vertraulich: b.vertraulich };
    });
}

/** Alle Dateien unterhalb eines Ordners, die tatsächlich geladen werden dürfen. */
function ladbareDateienUnter(items, bewertung, ordnerId) {
  const proId = new Map(items.map((i) => [Number(i.id), i]));
  const kinder = new Map();
  for (const i of items) {
    const p = i.parent_id == null ? null : Number(i.parent_id);
    if (p == null) continue;
    if (!kinder.has(p)) kinder.set(p, []);
    kinder.get(p).push(Number(i.id));
  }
  const raus = [];
  const lauf = (id) => {
    const b = bewertung.get(id);
    if (!b || b.gesperrt) return;                     // gesperrte Zweige bleiben zu
    const item = proId.get(id);
    if (item && Number(item.is_folder) === 0) {
      if (b.download) raus.push(item);
      return;
    }
    for (const k of (kinder.get(id) || [])) lauf(k);
  };
  lauf(Number(ordnerId));
  return raus;
}

module.exports = { bewerteBaum, sichtbareItems, ladbareDateienUnter, giltFuer, STUFE };
