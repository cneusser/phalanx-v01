// Escaped HTML-Sonderzeichen, damit Nutzereingaben nicht als Markup in Mails
// oder anderem HTML interpretiert werden (Schutz vor Content-Injection).
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
module.exports = { escapeHtml };
