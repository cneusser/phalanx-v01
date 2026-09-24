// ─────────────────────────────────────────────────────────────────────────────
// Datenraum auf die einheitliche Struktur umbauen (v0.404).
//
// Zwei Schritte, immer in dieser Reihenfolge:
//   1. Die sieben Bereiche und ihre Unterordner anlegen, soweit sie fehlen.
//   2. Jede vorhandene Datei dorthin verschieben, wo sie nach ihrem Namen
//      hingehört. Leere Altordner verschwinden anschließend.
//
// Nichts wird gelöscht, was Inhalt hat. Dateien, die sich nicht sicher zuordnen
// lassen, bleiben liegen und werden im Plan als offen ausgewiesen. Lieber ein
// Rest zum Nachsortieren als ein Dokument im falschen Ordner: Im Datenraum
// entscheidet die Ablage darüber, wer etwas zu sehen bekommt.
// ─────────────────────────────────────────────────────────────────────────────
const { STRUKTUR, CLEAN_TEAM, zuordnen } = require('./datenraumStruktur');

// Ordnerbaum als Karte „pfad → id" aufbauen (nur Ordner, nur zwei Ebenen).
function pfadKarte(items) {
  const proId = new Map(items.map((i) => [Number(i.id), i]));
  const karte = new Map();
  for (const i of items) {
    if (Number(i.is_folder) !== 1) continue;
    const eltern = i.parent_id == null ? null : proId.get(Number(i.parent_id));
    const pfad = eltern && Number(eltern.is_folder) === 1 ? `${eltern.name}/${i.name}` : i.name;
    if (!karte.has(pfad)) karte.set(pfad, Number(i.id));
  }
  return karte;
}

// Pfad eines Objekts für die Anzeige im Plan.
function pfadVon(item, proId) {
  const teile = [item.name];
  let p = item.parent_id == null ? null : Number(item.parent_id);
  while (p) {
    const el = proId.get(p);
    if (!el) break;
    teile.unshift(el.name);
    p = el.parent_id == null ? null : Number(el.parent_id);
  }
  return teile.join('/');
}

/**
 * Plan berechnen, ohne etwas zu ändern.
 * @param {Array} items  alle safe_items des Mandats (nicht gelöscht)
 * @returns {{anzulegen: string[], verschiebungen: Array, offen: Array, leer: Array}}
 */
function planen(items) {
  const karte = pfadKarte(items);
  const proId = new Map(items.map((i) => [Number(i.id), i]));

  const anzulegen = [];
  for (const [bereich, unter] of STRUKTUR) {
    if (!karte.has(bereich)) anzulegen.push(bereich);
    for (const u of unter) if (!karte.has(`${bereich}/${u}`)) anzulegen.push(`${bereich}/${u}`);
  }

  const zielPfade = new Set();
  for (const [bereich, unter] of STRUKTUR) { zielPfade.add(bereich); for (const u of unter) zielPfade.add(`${bereich}/${u}`); }

  const verschiebungen = [];
  const offen = [];
  for (const i of items) {
    if (Number(i.is_folder) === 1) continue;
    const jetzt = pfadVon(i, proId);
    const elternName = i.parent_id != null && proId.get(Number(i.parent_id)) ? proId.get(Number(i.parent_id)).name : '';
    const { pfad, sicher } = zuordnen(i.name, elternName);
    if (!pfad) { offen.push({ id: Number(i.id), name: i.name, jetzt }); continue; }
    // Schon am richtigen Platz? Dann nichts tun.
    const zielOrdner = pfad;
    const istSchonDort = jetzt === `${zielOrdner}/${i.name}`;
    if (istSchonDort) continue;
    verschiebungen.push({ id: Number(i.id), name: i.name, von: jetzt, nach: zielOrdner, sicher });
  }

  // Altordner, die nach dem Umbau leer wären und nicht zur Struktur gehören.
  const behaeltDatei = new Set();
  for (const v of verschiebungen) { /* Quelle wird leerer */ void v; }
  const leer = [];
  for (const i of items) {
    if (Number(i.is_folder) !== 1) continue;
    const pfad = pfadVon(i, proId);
    if (zielPfade.has(pfad)) continue;                 // gehört zur neuen Struktur
    const bleibt = items.some((k) => Number(k.parent_id) === Number(i.id)
      && (Number(k.is_folder) === 1 || offen.some((o) => o.id === Number(k.id))));
    if (!bleibt) leer.push({ id: Number(i.id), name: i.name, pfad });
  }
  void behaeltDatei;

  return { anzulegen, verschiebungen, offen, leer };
}

/**
 * Plan anwenden.
 * @param {object} q   DB-Handle { get, all, run, insert }
 * @param {object} ctx { tenant, projectId, userId }
 * @returns {Promise<{angelegt:number, verschoben:number, entfernt:number, offen:number}>}
 */
async function anwenden(q, { tenant = 1, projectId, userId = null } = {}) {
  const items = await q.all(
    'SELECT id, parent_id, name, is_folder, confidential FROM safe_items WHERE project_id = ? AND deleted_at IS NULL',
    [projectId]);
  const plan = planen(items);
  const karte = pfadKarte(items);

  // 1. Fehlende Ordner anlegen, Bereiche zuerst, damit die Unterordner einen
  //    Elternteil haben.
  let angelegt = 0;
  const reihenfolge = [];
  for (const [bereich, unter] of STRUKTUR) { reihenfolge.push(bereich); for (const u of unter) reihenfolge.push(`${bereich}/${u}`); }
  for (const pfad of reihenfolge) {
    if (karte.has(pfad)) continue;
    const [bereich, unterName] = pfad.split('/');
    const elternId = unterName ? karte.get(bereich) : null;
    const posRow = await q.get(
      `SELECT COALESCE(MAX(position), 0) AS m FROM safe_items WHERE project_id = ? AND deleted_at IS NULL AND ${elternId ? 'parent_id = ?' : 'parent_id IS NULL'}`,
      elternId ? [projectId, elternId] : [projectId]).catch(() => null);
    const pos = (posRow ? Number(posRow.m) : 0) + 1;
    const vertraulich = pfad === CLEAN_TEAM ? 1 : 0;
    const id = await q.insert(
      `INSERT INTO safe_items (tenant_id, project_id, parent_id, name, is_folder, position, confidential, uploaded_by)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
      [tenant, projectId, elternId, unterName || bereich, pos, vertraulich, userId]);
    karte.set(pfad, Number(id));
    angelegt += 1;
  }

  // 2. Dateien verschieben.
  let verschoben = 0;
  for (const v of plan.verschiebungen) {
    const zielId = karte.get(v.nach);
    if (!zielId) continue;
    await q.run('UPDATE safe_items SET parent_id = ? WHERE id = ?', [zielId, v.id]).catch(() => {});
    verschoben += 1;
  }

  // 3. Leere Altordner in den Papierkorb. Erst jetzt, weil vorher Dateien
  //    darin lagen. Geprüft wird noch einmal frisch, nicht nach dem alten Plan.
  let entfernt = 0;
  const danach = await q.all(
    'SELECT id, parent_id, name, is_folder FROM safe_items WHERE project_id = ? AND deleted_at IS NULL', [projectId]);
  const zielPfade = new Set(reihenfolge);
  const proId2 = new Map(danach.map((i) => [Number(i.id), i]));
  // Von unten nach oben, damit sich verschachtelte Altordner auflösen können.
  const ordner = danach.filter((i) => Number(i.is_folder) === 1)
    .map((i) => ({ i, tiefe: pfadVon(i, proId2).split('/').length }))
    .sort((a, b) => b.tiefe - a.tiefe);
  for (const { i } of ordner) {
    const pfad = pfadVon(i, proId2);
    if (zielPfade.has(pfad)) continue;
    const kinder = await q.get(
      'SELECT COUNT(*)::int AS n FROM safe_items WHERE parent_id = ? AND deleted_at IS NULL', [i.id]).catch(() => ({ n: 1 }));
    if (kinder && Number(kinder.n) > 0) continue;
    await q.run('UPDATE safe_items SET deleted_at = now() WHERE id = ?', [i.id]).catch(() => {});
    proId2.delete(Number(i.id));
    entfernt += 1;
  }

  return { angelegt, verschoben, entfernt, offen: plan.offen.length };
}

module.exports = { planen, anwenden, pfadKarte, pfadVon };
