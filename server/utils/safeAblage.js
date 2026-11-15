// ─────────────────────────────────────────────────────────────────────────────
// Eine hochgeladene Datei im Safe-Baum eintragen (v0.477, Sprint 1a)
//
// Anlass, wörtlich: „Gefühlt kann ich Dateien hochladen wie zum Beispiel
// Teaser oder Exposé, aber sie tauchen nicht im Datenraum auf."
//
// Genau so ist es, und es ist kein Bedienfehler. Der Dokumente-Reiter
// schrieb in `documents`, der Datenraum zeigt `safe_items`. Zwei Ablagen,
// eine Oberfläche je Ablage, und dazwischen nichts.
//
// Diese Datei schlägt die Brücke: Was über den Dokumente-Reiter hochgeladen
// wird, bekommt zusätzlich einen Eintrag im Safe-Baum, der auf DIESELBE
// Datei zeigt. Kein zweiter Inhalt, kein zweiter Schlüssel, nur ein zweiter
// Platz im Baum.
//
// Der Ordner ergibt sich aus der Zugangsstufe, und die Namen sind so
// gewählt, dass die Reihenfolge im Baum der Reihenfolge im Prozess
// entspricht:
//
//   public    00 Teaser
//   nda       01 Informationsmemorandum
//   approved  02 Unterlagen
//
// Wer eine eigene Ordnerangabe mitschickt, bekommt die; sie schlägt die
// Zugangsstufe. Fehlt der Ordner, wird er angelegt, einmal und nicht
// zweimal.
// ─────────────────────────────────────────────────────────────────────────────

const STUFEN_ORDNER = {
  public: '00 Teaser',
  nda: '01 Informationsmemorandum',
  approved: '02 Unterlagen',
};

/** Den Ordnernamen zu einer Zugangsstufe. */
const ordnerFuerStufe = (stufe) => STUFEN_ORDNER[stufe] || STUFEN_ORDNER.approved;

/**
 * Einen Ordnerpfad im Safe-Baum sicherstellen und die Id des letzten
 * Ordners zurückgeben. Vorhandene Ordner werden benutzt, nicht ergänzt.
 *
 * @param lauf  async (sql, params) => Zeile   (lesend)
 * @param neu   async (sql, params) => Id      (schreibend)
 * @returns {Promise<number|null>}
 */
async function ordnerSicherstellen(lauf, neu, { projectId, pfad, userId }) {
  const teile = String(pfad || '')
    .replace(/\\/g, '/')
    .split('/')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);
  let eltern = null;
  for (const name of teile) {
    // eslint-disable-next-line no-await-in-loop
    const da = await lauf(
      `SELECT id FROM safe_items
        WHERE project_id = ? AND is_folder = 1 AND name = ? AND deleted_at IS NULL
          AND ${eltern === null ? 'parent_id IS NULL' : 'parent_id = ?'}
        LIMIT 1`,
      eltern === null ? [projectId, name] : [projectId, name, eltern]);
    if (da) { eltern = da.id; continue; }
    // eslint-disable-next-line no-await-in-loop
    eltern = await neu(
      'INSERT INTO safe_items (project_id, parent_id, name, is_folder, uploaded_by) VALUES (?, ?, ?, 1, ?)',
      [projectId, eltern, name, userId || null]);
  }
  return eltern;
}

/**
 * Eine bereits abgelegte Datei im Safe-Baum eintragen.
 *
 * Erzeugt KEINE Kopie: `storage_key` ist derselbe wie an der
 * Dokumentzeile. Gibt es im Zielordner schon eine Datei dieses Namens,
 * wird nichts angelegt und die vorhandene Id zurückgegeben.
 *
 * @returns {Promise<{safe_item_id: number, angelegt: boolean}>}
 */
async function alsSafeObjekt(lauf, neu, {
  projectId, name, storageKey, mime, size, pruefsumme, stufe, ordner, userId, contentText,
}) {
  const zielpfad = (ordner && String(ordner).trim()) || ordnerFuerStufe(stufe);
  const elternId = await ordnerSicherstellen(lauf, neu, { projectId, pfad: zielpfad, userId });

  const da = await lauf(
    `SELECT id FROM safe_items
      WHERE project_id = ? AND is_folder = 0 AND name = ? AND deleted_at IS NULL
        AND ${elternId === null ? 'parent_id IS NULL' : 'parent_id = ?'}
      LIMIT 1`,
    elternId === null ? [projectId, name] : [projectId, name, elternId]);
  if (da) return { safe_item_id: da.id, angelegt: false };

  const id = await neu(
    `INSERT INTO safe_items (project_id, parent_id, name, is_folder, storage_key, size, mime, checksum_sha256, uploaded_by, content_text)
     VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
    [projectId, elternId, name, storageKey, size || 0, mime || null, pruefsumme || null, userId || null, contentText || null]);
  return { safe_item_id: id, angelegt: true };
}

module.exports = { STUFEN_ORDNER, ordnerFuerStufe, ordnerSicherstellen, alsSafeObjekt };
