// ─────────────────────────────────────────────────────────────────────────────
// PDF-Textextraktion für die Volltextsuche im geschlossenen Bereich.
// Nutzt pdfjs-dist (robuste, moderne Extraktion). Fehler dürfen nie den Upload
// oder das Übernehmen in den Datenraum stören: im Zweifel wird '' zurückgegeben.
// ─────────────────────────────────────────────────────────────────────────────
const MAX_CHARS = 300000;   // in der DB gespeicherte Textlänge deckeln
const MAX_PAGES = 200;      // sehr große PDFs nicht komplett durchlaufen

function isPdf(mime, name) {
  return String(mime || '').includes('pdf') || String(name || '').toLowerCase().endsWith('.pdf');
}

async function extractPdfText(buffer) {
  if (!buffer || !buffer.length) return '';
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task = pdfjs.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, disableFontFace: true });
    const pdf = await task.promise;
    const pages = Math.min(pdf.numPages, MAX_PAGES);
    let text = '';
    for (let i = 1; i <= pages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((x) => (x.str || '')).join(' ') + '\n';
      if (text.length > MAX_CHARS) break;
    }
    await pdf.destroy().catch(() => {});
    return text.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
  } catch (e) {
    console.warn('[pdfText] Extraktion fehlgeschlagen:', e.message);
    return '';
  }
}

// Bequemer Helfer: nur bei PDFs extrahieren, sonst leer.
async function extractIfPdf(buffer, mime, name) {
  if (!isPdf(mime, name)) return '';
  return extractPdfText(buffer);
}

module.exports = { extractPdfText, extractIfPdf, isPdf };
