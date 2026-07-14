// ─────────────────────────────────────────────────────────────────────────────
// Sprint 3: Austauschbares E-Signatur-Provider-Interface (eIDAS)
//
// interface SignatureProvider {
//   /**
//    * Dokument zur Signatur senden.
//    * @param {Buffer} pdfBuffer   Zu signierendes PDF
//    * @param {object} signer      { name, email, company, ip }
//    * @returns {Promise<{ providerRef: string, status: string }>}
//    */
//   send(pdfBuffer, signer)
//
//   /**
//    * Signaturstatus abfragen.
//    * @param {string} providerRef
//    * @returns {Promise<'pending'|'signed'|'declined'>}
//    */
//   status(providerRef)
//
//   /**
//    * Signiertes Dokument abholen.
//    * @param {string} providerRef
//    * @returns {Promise<{ pdfBuffer: Buffer|null, evidence: object }>}
//    */
//   fetchSignedDoc(providerRef)
// }
//
// Standard-Signaturniveau: fortgeschrittene elektronische Signatur (eIDAS FES).
// QES ist als Option je Provider konfigurierbar (SIGNATURE_LEVEL=qes).
//
// ── Echten Dienst anbinden (z. B. Skribble, DocuSign, d.velop, sign8) ────────
// 1. Neue Datei providers/signature/<Anbieter>Provider.js mit den drei
//    Methoden oben implementieren (API-Aufrufe des Anbieters).
// 2. Unten in PROVIDERS registrieren.
// 3. In Railway die ENV-Variablen setzen:
//      SIGNATURE_PROVIDER=<anbieter>
//      SIGNATURE_LEVEL=fes|qes
//      <ANBIETER>_API_KEY=…
// Kein weiterer Codeeingriff nötig: der NDA-Flow spricht nur das Interface.
// ─────────────────────────────────────────────────────────────────────────────

const StubSignatureProvider = require('./StubSignatureProvider');

const PROVIDERS = {
  stub: StubSignatureProvider,
  // skribble: require('./SkribbleProvider'),
  // docusign: require('./DocusignProvider'),
};

function getSignatureProvider() {
  const key = (process.env.SIGNATURE_PROVIDER || 'stub').toLowerCase();
  const Provider = PROVIDERS[key];
  if (!Provider) {
    throw new Error(`Unbekannter SIGNATURE_PROVIDER "${key}", verfügbar: ${Object.keys(PROVIDERS).join(', ')}`);
  }
  return new Provider({ level: process.env.SIGNATURE_LEVEL || 'fes' });
}

module.exports = { getSignatureProvider };
