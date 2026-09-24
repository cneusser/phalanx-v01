// ─────────────────────────────────────────────────────────────────────────────
// Standard-Ordnerstruktur für den Container-Safe jedes Mandats.
// Wird beim Anlegen eines Projekts automatisch erzeugt (leer) und lässt sich für
// bestehende Projekte nachziehen. Idempotent: vorhandene Ordner bleiben unberührt.
//
// Der erste Ordner „Teaser und Investment Memorandum" nimmt die personalisierten
// Teaser-/IM-PDFs auf (siehe Datenraum-Übernahme + Wasserzeichen).
// ─────────────────────────────────────────────────────────────────────────────
// Wohin Teaser und Informationsmemorandum gehören. Seit v0.404 ein Pfad mit zwei
// Ebenen, deshalb als Liste: [Bereich, Unterordner].
const TEASER_PFAD = ['Transaktion', 'Teaser und Informationsmemorandum'];
const TEASER_FOLDER = TEASER_PFAD[TEASER_PFAD.length - 1];

// Seit v0.404 gilt für alle Mandate dieselbe Gliederung. Sie steht in
// utils/datenraumStruktur und wird hier nur noch auf die erste Ebene
// heruntergebrochen; die Unterordner legt der Umbau an.
const { STRUKTUR } = require('./datenraumStruktur');
const STANDARD_SAFE_FOLDERS = STRUKTUR.map(([bereich]) => bereich);

/**
 * Legt die Standard-Ordner (Top-Ebene, leer) für ein Mandat an, sofern noch nicht
 * vorhanden. Gibt die Zahl der neu erzeugten Ordner zurück.
 * @param {number} projectId
 * @param {object} opts { tenantId=1, userId=null, db=database }
 */
async function seedStandardStructure(projectId, opts = {}) {
  const db = opts.db || require('../db/database');
  const tenantId = opts.tenantId || 1;
  const userId = opts.userId || null;
  let created = 0;
  for (const name of STANDARD_SAFE_FOLDERS) {
    const exists = await db.get(
      `SELECT id FROM safe_items WHERE project_id = ? AND is_folder = 1 AND name = ? AND parent_id IS NULL AND deleted_at IS NULL`,
      [projectId, name]).catch(() => null);
    if (exists) continue;
    const posRow = await db.get(
      `SELECT COALESCE(MAX(position), 0) AS m FROM safe_items WHERE project_id = ? AND deleted_at IS NULL AND parent_id IS NULL`,
      [projectId]).catch(() => null);
    const pos = (posRow ? Number(posRow.m) : 0) + 1;
    await db.insert(
      `INSERT INTO safe_items (tenant_id, project_id, parent_id, name, is_folder, position, uploaded_by)
       VALUES (?, ?, NULL, ?, 1, ?, ?)`,
      [tenantId, projectId, name, pos, userId]).catch(() => {});
    created += 1;
  }
  return created;
}

module.exports = { seedStandardStructure, STANDARD_SAFE_FOLDERS, TEASER_FOLDER, TEASER_PFAD };
