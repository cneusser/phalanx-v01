// ─────────────────────────────────────────────────────────────────────────────
// Standard-Ordnerstruktur für den Container-Safe jedes Mandats.
// Wird beim Anlegen eines Projekts automatisch erzeugt (leer) und lässt sich für
// bestehende Projekte nachziehen. Idempotent: vorhandene Ordner bleiben unberührt.
//
// Der erste Ordner „Teaser und Investment Memorandum" nimmt die personalisierten
// Teaser-/IM-PDFs auf (siehe Datenraum-Übernahme + Wasserzeichen).
// ─────────────────────────────────────────────────────────────────────────────
const TEASER_FOLDER = 'Teaser und Investment Memorandum';

const STANDARD_SAFE_FOLDERS = [
  TEASER_FOLDER,
  'Rechtliche Situation im Unternehmen',
  'Entwicklung und Übersicht des Unternehmens',
  'Mitarbeiter und Management',
  'Finanzierung',
  'Wirtschaftliche Entwicklung (GuV, Bilanz, Cash Flow)',
  'Leistungswirtschaftliche Entwicklung (Produkte, Kunden, Markt, Wettbewerb, Fertigung)',
  'Organisation und Steuerung',
  'Finanz- und Rechnungswesen, IT',
];

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

module.exports = { seedStandardStructure, STANDARD_SAFE_FOLDERS, TEASER_FOLDER };
