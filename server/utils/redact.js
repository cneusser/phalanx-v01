// ─────────────────────────────────────────────────────────────────────────────
// Stichwortbasiertes Schwärzen (Redaction) von PDFs mit mupdf (WASM).
// Fundstellen der Begriffe werden schwarz überdeckt UND der Text an diesen
// Stellen wirklich entfernt (nicht nur verdeckt). Für Bild-PDFs ohne Textebene
// findet die Stichwortsuche nichts (Grenze klar kommunizieren).
// ─────────────────────────────────────────────────────────────────────────────

function normTerms(terms) {
  return [...new Set((terms || [])
    .map((t) => String(t || '').trim())
    .filter((t) => t.length >= 2))].slice(0, 100);
}

// Rechteck aus einem mupdf-Quad ableiten (robust gegen Array- oder Objektform).
function quadRect(q) {
  const n = (v) => (typeof v === 'number' && !Number.isNaN(v));
  const xs = n(q.ul_x) ? [q.ul_x, q.ur_x, q.ll_x, q.lr_x] : (Array.isArray(q) ? [q[0], q[2], q[4], q[6]] : null);
  const ys = n(q.ul_y) ? [q.ul_y, q.ur_y, q.ll_y, q.lr_y] : (Array.isArray(q) ? [q[1], q[3], q[5], q[7]] : null);
  if (!xs || !ys || xs.some((v) => typeof v !== 'number') || ys.some((v) => typeof v !== 'number')) return null;
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

// Nur zählen, wie oft die Begriffe vorkommen (für die Vorschau). Kein Speichern.
async function countTerms(buffer, terms) {
  const list = normTerms(terms);
  if (!list.length) return { total: 0, per_term: {}, pages: 0 };
  const mupdf = await import('mupdf');
  const doc = mupdf.PDFDocument.openDocument(new Uint8Array(buffer), 'application/pdf');
  const pages = doc.countPages();
  const per = {};
  let total = 0;
  for (let i = 0; i < pages; i++) {
    const page = doc.loadPage(i);
    for (const term of list) {
      const found = page.search(term, 500) || [];
      const c = found.length;
      if (c) { per[term] = (per[term] || 0) + c; total += c; }
    }
  }
  return { total, per_term: per, pages };
}

// Begriffe schwärzen und entfernen. Gibt { buffer, hits } zurück.
async function redactPdf(buffer, terms) {
  const list = normTerms(terms);
  const mupdf = await import('mupdf');
  const doc = mupdf.PDFDocument.openDocument(new Uint8Array(buffer), 'application/pdf');
  const pages = doc.countPages();
  let hits = 0;
  for (let i = 0; i < pages; i++) {
    const page = doc.loadPage(i);
    let added = 0;
    for (const term of list) {
      const found = page.search(term, 500) || [];
      for (const quads of found) {
        for (const q of quads) {
          const rect = quadRect(q);
          if (!rect) continue;
          const annot = page.createAnnotation('Redact');
          annot.setRect(rect);
          added += 1; hits += 1;
        }
      }
    }
    if (added) page.applyRedactions(true, 1); // schwarze Fläche, Bilder mitentfernen
  }
  const out = Buffer.from(doc.saveToBuffer('garbage=compact,sanitize=yes').asUint8Array());
  return { buffer: out, hits };
}

module.exports = { redactPdf, countTerms, normTerms };
