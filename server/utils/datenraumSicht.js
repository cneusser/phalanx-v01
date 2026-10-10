// ─────────────────────────────────────────────────────────────────────────────
// Die Sicht eines Käufers auf den Datenraum, an einer Stelle (v0.455).
//
// Anlass: „Ich bekomme bei Herrn Eder den Hinweis, dass er die Dokumente nicht
// anklicken kann. Ich würde das gerne in seinem Blick nachvollziehen."
//
// Dafür gibt es zwei Wege, und nur einer taugt. Der untaugliche wäre, in der
// Prüfung nachzubauen, was der Datenraum tut. Dann prüft man die Nachbildung
// und nicht die Anlage, und der Tag, an dem beide auseinanderlaufen, ist genau
// der Tag, an dem jemand etwas sieht, was er nicht sehen sollte.
//
// Deshalb steht hier der Käufer-Zweig aus safe.js, wörtlich übernommen und von
// req gelöst. Die Datenraum-Route ruft ihn auf, die Prüfung ruft ihn auf. Es
// gibt also keine zweite Fassung der Regeln, die veralten könnte.
//
// `alle(sql, params)` wird hereingereicht, damit beide Aufrufer ihre eigene
// Verbindung mitbringen können: die Route die mandantengebundene, die Prüfung
// die gewöhnliche.
// ─────────────────────────────────────────────────────────────────────────────

// safeVisibility ist frei von Datenbank und Netz und darf deshalb oben stehen.
// Alles, was die Verbindung anfasst, wird erst beim Aufruf geholt: Sonst liesse
// sich `zusammenfassen` nicht ohne laufende Datenbank prüfen, und genau diese
// Zählung ist der Teil, der geprüft gehört.
const sichtbarkeit = require('./safeVisibility');

/**
 * Der Lesekontext eines Käufers: null, wenn das Stage-Gate zu ist.
 *
 * Gilt ausdrücklich nur für Käufer. Ob jemand zum Mandatsteam gehört, prüft
 * der Aufrufer vorher, denn für das Team gibt es keine Grenzen im Baum.
 */
async function kaeuferKontext(user, projectId, alle) {
  const db = require('../db/database');
  const { getStage } = require('../middleware/gates');
  const { stageAllows } = require('./dealStateMachine');
  const stage = await getStage(user.id, projectId);
  if (!stageAllows(stage, 'dataroom')) return { offen: false, stage: stage || null };
  const u = await db.get('SELECT buyer_type FROM users WHERE id = ?', [user.id]).catch(() => null);
  const gruppen = await alle(
    'SELECT group_id FROM safe_group_members WHERE user_id = ?', [user.id]).catch(() => []);
  return {
    offen: true,
    stage,
    userId: user.id,
    buyerType: (u && u.buyer_type) || null,
    groupIds: (gruppen || []).map((g) => g.group_id),
  };
}

/**
 * Den Baum für diesen Käufer bewerten.
 * Rückgabe: { items, bewertung } oder null, wenn das Gate zu ist.
 */
async function bewerteFuer(ktx, projectId, alle) {
  if (!ktx || !ktx.offen) return null;
  const items = await alle(
    'SELECT id, parent_id, is_folder, confidential, name FROM safe_items WHERE project_id = ? AND deleted_at IS NULL',
    [projectId]);
  const grants = await alle(
    'SELECT item_id, subject_type, subject_ref, level FROM safe_grants WHERE project_id = ?',
    [projectId]).catch(() => []);
  const bewertung = sichtbarkeit.bewerteBaum({
    items, grants, userId: ktx.userId, buyerType: ktx.buyerType, groupIds: ktx.groupIds,
  });
  return { items, bewertung };
}

/**
 * Ein Satz Zahlen über das, was diese Person im Datenraum vorfindet.
 *
 * Ordner werden mitgezählt, aber getrennt ausgewiesen: Ein Käufer, der zehn
 * gesperrte Ordner sieht und keine Datei, hat ein anderes Problem als einer,
 * der nichts sieht.
 */
function zusammenfassen(items, bewertung) {
  let dateien = 0; let sichtbareDateien = 0; let ladbar = 0; let gesperrt = 0; let ordner = 0;
  for (const i of items) {
    const ist = Number(i.is_folder) === 1;
    if (ist) ordner += 1; else dateien += 1;
    const b = bewertung.get(Number(i.id));
    if (!b) continue;
    if (b.gesperrt) { gesperrt += 1; continue; }
    if (!ist) { sichtbareDateien += 1; if (b.download) ladbar += 1; }
  }
  return { dateien_gesamt: dateien, ordner_gesamt: ordner, dateien_sichtbar: sichtbareDateien, dateien_ladbar: ladbar, eintraege_gesperrt: gesperrt };
}

module.exports = { kaeuferKontext, bewerteFuer, zusammenfassen };
