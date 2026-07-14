// ─────────────────────────────────────────────────────────────────────────────
// Stub-SignatureProvider (Mock): simuliert eine fortgeschrittene
// elektronische Signatur (eIDAS FES) mit sofortigem Abschluss.
//
// Verhalten:
//   send()           registriert den Vorgang und "signiert" sofort
//   status()         liefert immer 'signed'
//   fetchSignedDoc() liefert das Original-PDF + Evidenz-Metadaten zurück
//
// Der Stub hält Vorgänge nur im Prozessspeicher, die revisionssichere
// Ablage (PDF + SHA-256-audit_ref) übernimmt der NDA-Flow in der DB/auf Disk.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

class StubSignatureProvider {
  constructor({ level = 'fes' } = {}) {
    this.level = level;
    this.jobs = new Map();
  }

  async send(pdfBuffer, signer) {
    const providerRef = `stub-${crypto.randomUUID()}`;
    const evidence = {
      provider: 'stub',
      level: this.level,                       // fes | qes
      signer: { name: signer.name, email: signer.email, company: signer.company || null },
      ip: signer.ip || null,
      signedAt: new Date().toISOString(),
      documentHash: crypto.createHash('sha256').update(pdfBuffer).digest('hex'),
    };
    this.jobs.set(providerRef, { pdfBuffer, evidence });
    return { providerRef, status: 'signed' };
  }

  async status(providerRef) {
    return this.jobs.has(providerRef) ? 'signed' : 'signed'; // Stub: immer signiert
  }

  async fetchSignedDoc(providerRef) {
    const job = this.jobs.get(providerRef);
    return { pdfBuffer: job ? job.pdfBuffer : null, evidence: job ? job.evidence : { provider: 'stub' } };
  }
}

module.exports = StubSignatureProvider;
