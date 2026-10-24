import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { X, FileText, CheckCircle, Download, Shield, AlertTriangle, Loader } from 'lucide-react';
import { useT } from '../i18n';
import RechtsHinweis from './RechtsHinweis';

const C = { navy: '#14314F', steel: '#A5C8E4', bg: '#F3F7FB' };

// ── Kein Vertragstext mehr im Quelltext der Oberfläche (v0.466) ────────────
//
// Hier stand eine von Hand gepflegte Fassung der Vereinbarung: zehn
// Paragraphen und eine Vertragspartei, die es gar nicht gibt (eine Advisory-
// Gesellschaft in München statt der Phalanx GmbH in Erlangen).
// die es nicht gibt. Das PDF entstand derweil aus der Vorlage in der
// Datenbank. Zwei Texte, zwei Pflegewege, und sie sind auseinandergelaufen,
// bis ein Interessent sie verglichen hat.
//
// Der Dialog holt die Fassung jetzt vom Server, dieselbe, aus der auch das
// PDF entsteht, samt Fingerabdruck. Wo nur eine Fassung existiert, kann
// keine zweite abweichen.

/**
 * NDASignModal
 * Shows the full NDA text and lets the buyer sign online per §10.
 *
 * Props:
 *  projectId   – numeric project ID
 *  projectName – codename for display
 *  onClose     – called on close/cancel
 *  onSigned    – called after successful online signature
 */
export default function NDASignModal({ projectId, projectName, onClose, onSigned }) {
  const t = useT();
  const { user } = useAuth();
  const [step, setStep] = useState('read'); // 'read' | 'sign' | 'done'
  const [scrolled, setScrolled] = useState(false);
  const [consentName, setConsentName] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [signing, setSigning] = useState(false);
  const [pdfFilename, setPdfFilename] = useState(null);
  const [fassung, setFassung] = useState(null);
  const [fassungFehler, setFassungFehler] = useState('');
  const scrollRef = useRef(null);

  // Pre-fill name from user profile
  useEffect(() => {
    if (user) setConsentName(`${user.first_name} ${user.last_name}`);
  }, [user]);

  // Die geltende Fassung holen. Scheitert das, wird nichts angezeigt und
  // nichts unterschrieben: Ein Dialog, der im Zweifel irgendeinen Text zeigt,
  // ist schlimmer als einer, der sagt, dass er gerade nichts zeigen kann.
  useEffect(() => {
    let abgebrochen = false;
    api.get(`/ndas/${projectId}/fassung`)
      .then((f) => { if (!abgebrochen) setFassung(f); })
      .catch((e) => { if (!abgebrochen) setFassungFehler(e.message || 'Die Vereinbarung konnte nicht geladen werden.'); });
    return () => { abgebrochen = true; };
  }, [projectId]);

  // Track scroll to bottom
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom) setScrolled(true);
  };

  const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });

  async function handleSign(e) {
    e.preventDefault();
    if (!confirmed) { setError(t('nda.bitte_bestaetigen', 'Bitte bestätigen Sie, dass Sie die NDA gelesen und verstanden haben.')); return; }
    if (!consentName || consentName.trim().length < 3) { setError(t('nda.name_fehlt', 'Bitte geben Sie Ihren vollständigen Namen ein.')); return; }
    setSigning(true);
    setError('');
    try {
      const result = await api.post(`/ndas/${projectId}/sign-online`, {
        consent_name: consentName.trim(),
        consent_confirmed: true,
        // Der Fingerabdruck der Fassung, die hier angezeigt wurde. Der Server
        // weist ab, wenn sich die Vorlage inzwischen geändert hat.
        fassung_hash: fassung ? fassung.hash : null,
      });
      setPdfFilename(result.pdf_filename);
      setStep('done');
      if (onSigned) onSigned();
    } catch (e) {
      setError(e.message || 'Fehler beim Unterzeichnen.');
    } finally {
      setSigning(false);
    }
  }

  const downloadNDA = async () => {
    try {
      const token = localStorage.getItem('phalanx_token');
      const res = await fetch(`/api/ndas/${projectId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download fehlgeschlagen');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NDA_${projectName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('PDF-Download fehlgeschlagen: ' + e.message);
    }
  };

  const previewNDA = async () => {
    const token = localStorage.getItem('phalanx_token');
    window.open(`/api/ndas/${projectId}/document?token=${token}`, '_blank');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,25,45,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: '1rem',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
      }}>
        {/* Header */}
        <div style={{ background: C.navy, borderRadius: '16px 16px 0 0', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: C.steel, borderRadius: 8, padding: '0.4rem' }}>
              <FileText size={16} color={C.navy} />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>Vertraulichkeitsvereinbarung</div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem' }}>Projekt: {projectName}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, padding: '0.4rem', cursor: 'pointer', color: '#fff' }}>
            <X size={18} />
          </button>
        </div>

        {/* Step: READ */}
        {step === 'read' && (
          <>
            {/* Progress indicator */}
            <div style={{ padding: '0.75rem 1.5rem', background: '#f8f7f5', borderBottom: '1px solid #dce8f2', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: C.navy, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>1</div>
                <span style={{ fontWeight: 600, color: C.navy }}>NDA lesen</span>
              </div>
              <div style={{ flex: 1, height: 2, background: '#ddd', borderRadius: 1 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#e0ddd6', color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>2</div>
                <span style={{ color: '#999' }}>Unterzeichnen</span>
              </div>
            </div>

            {/* NDA text scroll area */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}
            >
              {/* Laedt die Fassung nicht, wird nichts angezeigt und nichts
                  unterschrieben. Ein Dialog, der im Zweifel irgendeinen Text
                  zeigt, ist schlimmer als einer, der sagt, dass er gerade
                  nichts zeigen kann (v0.466). */}
              {fassungFehler && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '1rem', marginBottom: '1.25rem', fontSize: '0.84rem', color: '#991b1b', lineHeight: 1.6 }}>
                  <strong>{t('nda.fassung_fehlt', 'Die Vereinbarung lässt sich gerade nicht laden.')}</strong>
                  <span style={{ display: 'block', marginTop: 4 }}>{fassungFehler}</span>
                  <span style={{ display: 'block', marginTop: 4 }}>
                    {t('nda.fassung_fehlt_hinweis', 'Bitte versuchen Sie es später erneut. Unterzeichnet wird nur, was Ihnen hier vollständig angezeigt wurde.')}
                  </span>
                </div>
              )}
              {!fassung && !fassungFehler && (
                <div style={{ color: '#888', fontSize: '0.85rem', padding: '1rem 0' }}>
                  {t('nda.fassung_laedt', 'Die Vereinbarung wird geladen …')}
                </div>
              )}

              {/* Parties */}
              <div style={{ background: C.bg, borderRadius: 10, padding: '1.1rem', marginBottom: '1.5rem', border: '1px solid #e0ddd6' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#999', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>VERTRAGSPARTEIEN</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: C.navy }}>{user?.first_name} {user?.last_name}</div>
                    {user?.company && <div style={{ fontSize: '0.8rem', color: '#555' }}>{user.company}</div>}
                    <div style={{ fontSize: '0.75rem', color: '#888' }}>{user?.email}</div>
                    <div style={{ fontSize: '0.72rem', color: C.steel, fontWeight: 600, marginTop: '0.2rem' }}>(Interessent)</div>
                  </div>
                  <div>
                    {/* Aus der Vorlage, nicht aus dem Quelltext (v0.466). */}
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: C.navy }}>{fassung?.parteien.berater.name || '…'}</div>
                    {fassung?.parteien.berater.ansprechpartner && (
                      <div style={{ fontSize: '0.8rem', color: '#555' }}>{fassung.parteien.berater.ansprechpartner}</div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: '#888' }}>
                      {[fassung?.parteien.berater.strasse, fassung?.parteien.berater.ort, fassung?.parteien.berater.land]
                        .filter(Boolean).join(', ')}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: C.steel, fontWeight: 600, marginTop: '0.2rem' }}>(Transaktionsberater)</div>
                  </div>
                </div>
              </div>

              {/* Preamble */}
              {/* Der Vertragstext bleibt deutsch, er ist die verbindliche Fassung.
                  Englische Unterzeichner bekommen die Kernpunkte in ihrer Sprache. */}
              <RechtsHinweis punkte={[
                'You undertake to keep all information about this mandate confidential and to use it only to assess the transaction.',
                'The duty of confidentiality does not cover information that is already public or that you demonstrably knew beforehand.',
                'You must report any loss of documents immediately.',
                'Documents are provided free of charge and remain the property of the owner.',
                'The agreement runs for the period stated in the German text.',
                'German law applies, with the place of jurisdiction named in the German text.',
                'Section 10 governs the online signature: typing your full name and confirming the checkbox creates a binding signature.',
              ]} />

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 700, color: C.navy, fontSize: '0.88rem', marginBottom: '0.4rem' }}>Präambel</div>
                <p style={{ fontSize: '0.83rem', color: '#444', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {fassung?.praeambel || ''}
                </p>
              </div>

              {/* Sections */}
              {(fassung?.paragraphen || []).map((p) => {
                const online = /online/i.test(p.titel);
                return (
                  <div key={p.nummer} style={{ marginBottom: '1rem', paddingLeft: '0.75rem', borderLeft: `3px solid ${online ? C.steel : '#e0ddd6'}` }}>
                    <div style={{ fontWeight: 700, color: online ? C.steel : C.navy, fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                      {p.nummer} – {p.titel}
                      {online && <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '0.1rem 0.4rem', borderRadius: 10, marginLeft: '0.5rem' }}>{t('nda.online', 'Gilt für Online-Abschluss')}</span>}
                    </div>
                    {p.absaetze.map((a, i) => (
                      <p key={i} style={{ fontSize: '0.8rem', color: '#555', lineHeight: 1.65, marginBottom: '0.35rem' }}>{a}</p>
                    ))}
                    {p.punkte.length > 0 && (
                      <ul style={{ margin: '0.2rem 0 0 1rem', padding: 0 }}>
                        {p.punkte.map((b, i) => (
                          <li key={i} style={{ fontSize: '0.8rem', color: '#555', lineHeight: 1.6 }}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}

              {/* Woran man diese Fassung wiedererkennt. Steht auch im
                  Nachweis und im Prüfprotokoll (v0.466). */}
              {fassung && (
                <div style={{ marginTop: '1rem', paddingTop: '0.7rem', borderTop: '1px solid #f0ede7', fontSize: '0.72rem', color: '#999', lineHeight: 1.6 }}>
                  {t('nda.fassung_kennung', 'Fassung')}
                  {fassung.version ? ` ${fassung.version}` : ''} · {fassung.hash.slice(0, 16)}
                  <br />
                  {t('nda.fassung_hinweis', 'Genau dieser Text wird unterzeichnet und als PDF ausgestellt. Die Kennung finden Sie im Nachweis wieder.')}
                </div>
              )}

              {/* Scroll hint */}
              {!scrolled && (
                <div style={{ textAlign: 'center', padding: '0.75rem', color: '#aaa', fontSize: '0.78rem', borderTop: '1px solid #f0ede7' }}>
                  ↓ Bitte scrollen Sie bis zum Ende, um fortzufahren
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #dce8f2', background: '#fafaf9', borderRadius: '0 0 16px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={onClose} style={{ padding: '0.6rem 1.25rem', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: '#555' }}>
                  Abbrechen
                </button>
                <button
                  onClick={() => setStep('sign')}
                  disabled={!scrolled || !fassung}
                  style={{
                    padding: '0.65rem 1.5rem', background: (scrolled && fassung) ? C.navy : '#ccc',
                    color: '#fff', border: 'none', borderRadius: 8,
                    cursor: (scrolled && fassung) ? 'pointer' : 'not-allowed',
                    fontWeight: 700, fontSize: '0.875rem',
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    transition: 'background 0.2s',
                  }}
                >
                  NDA gelesen – weiter zur Unterzeichnung →
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step: SIGN */}
        {step === 'sign' && (
          <>
            {/* Progress indicator */}
            <div style={{ padding: '0.75rem 1.5rem', background: '#f8f7f5', borderBottom: '1px solid #dce8f2', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>✓</div>
                <span style={{ color: '#10b981', fontWeight: 600 }}>NDA gelesen</span>
              </div>
              <div style={{ flex: 1, height: 2, background: C.navy, borderRadius: 1 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: C.navy, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>2</div>
                <span style={{ fontWeight: 600, color: C.navy }}>Unterzeichnen</span>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              {/* Legal info box */}
              <div style={{ background: '#eff6ff', borderRadius: 10, padding: '1rem 1.1rem', marginBottom: '1.5rem', border: '1px solid #bfdbfe' }}>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <Shield size={16} color="#1d4ed8" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: '0.8rem', color: '#1e3a8a', lineHeight: 1.65 }}>
                    <strong>{t('nda.online_par10', 'Online-Unterzeichnung gemäß §10 dieser Vereinbarung')}</strong><br />
                    Durch Eingabe Ihres Namens und Bestätigung erkennen Sie die Verbindlichkeit dieser NDA an. Gemäß §10 hat Ihre Online-Zustimmung die gleiche rechtliche Wirkung wie eine handschriftliche Unterschrift. Ihre IP-Adresse, der Zeitstempel und Ihr Name werden im Audit Trail aufgezeichnet. Sie erhalten das unterzeichnete PDF als Nachweis.
                  </div>
                </div>
              </div>

              {/* Summary card */}
              <div style={{ background: C.bg, borderRadius: 10, padding: '1.1rem', marginBottom: '1.5rem', border: '1px solid #e0ddd6' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#999', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>ZUSAMMENFASSUNG DER VEREINBARUNG</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.8rem' }}>
                  {[
                    ['Projekt', projectName],
                    ['Gerichtsstand', fassung?.gerichtsstand || 'wird geladen'],
                    ['Datum', today],
                    ['Interessent', `${user?.first_name} ${user?.last_name}`],
                    ['Berater', fassung?.parteien.berater.name || 'wird geladen'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <span style={{ color: '#999', fontSize: '0.72rem' }}>{k}:</span>
                      <span style={{ color: C.navy, fontWeight: 600, marginLeft: '0.4rem' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sign form */}
              <form onSubmit={handleSign}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, color: '#333', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    Vollständiger Name *
                    <span style={{ fontWeight: 400, color: '#888', marginLeft: '0.4rem', fontSize: '0.75rem' }}>{t('nda.wie_ausweis', 'Bitte genau wie in Ihren Ausweisdokumenten')}</span>
                  </label>
                  <input
                    type="text"
                    value={consentName}
                    onChange={e => setConsentName(e.target.value)}
                    required
                    minLength={3}
                    placeholder="Max Mustermann"
                    style={{ width: '100%', padding: '0.7rem 0.9rem', border: '2px solid #ddd', borderRadius: 8, fontSize: '0.925rem', outline: 'none', fontFamily: 'Georgia, serif', boxSizing: 'border-box', letterSpacing: '0.03em' }}
                    onFocus={e => e.target.style.borderColor = C.navy}
                    onBlur={e => e.target.style.borderColor = '#ddd'}
                  />
                  {user?.company && (
                    <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.35rem' }}>
                      Unterzeichnet für: <strong>{user.company}</strong>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '1rem', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a', marginBottom: '1rem', cursor: 'pointer' }}
                  onClick={() => setConfirmed(!confirmed)}>
                  <div style={{
                    width: 20, height: 20, border: `2px solid ${confirmed ? C.navy : '#d1d5db'}`,
                    borderRadius: 4, background: confirmed ? C.navy : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                    transition: 'all 0.15s',
                  }}>
                    {confirmed && <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>✓</span>}
                  </div>
                  <p style={{ fontSize: '0.83rem', color: '#444', lineHeight: 1.6, margin: 0, userSelect: 'none' }}>
                    Ich, <strong>{consentName || t('nda.ihr_name', '[Ihr Name]')}</strong>, habe die vorstehende Vertraulichkeitsvereinbarung vollständig gelesen und verstanden. Ich erkenne gemäß <strong>§10</strong> die rechtliche Verbindlichkeit dieser Vereinbarung ohne eigenhändige Unterschrift an und verpflichte mich zur Einhaltung aller darin enthaltenen Bestimmungen.
                  </p>
                </div>

                {error && (
                  <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.825rem', color: '#991b1b', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <AlertTriangle size={14} /> {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between' }}>
                  <button type="button" onClick={() => setStep('read')} style={{ padding: '0.6rem 1.1rem', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: '0.875rem', color: '#555' }}>
                    ← Zurück
                  </button>
                  <button
                    type="submit"
                    disabled={signing || !confirmed}
                    style={{
                      flex: 1, padding: '0.75rem', background: confirmed ? C.navy : '#ccc',
                      color: '#fff', border: 'none', borderRadius: 8, cursor: (signing || !confirmed) ? 'not-allowed' : 'pointer',
                      fontWeight: 700, fontSize: '0.9rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    }}
                  >
                    {signing ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> {t('nda.pdf_laeuft', 'PDF wird generiert...')}</> : t('nda.jetzt_zeichnen', '✍ NDA jetzt verbindlich unterzeichnen')}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {/* Step: DONE */}
        {step === 'done' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <CheckCircle size={36} color="#059669" />
            </div>
            <h2 style={{ fontWeight: 700, color: C.navy, fontSize: '1.3rem', marginBottom: '0.5rem' }}>NDA erfolgreich unterzeichnet</h2>
            <p style={{ color: '#555', fontSize: '0.875rem', lineHeight: 1.7, maxWidth: 420, marginBottom: '1.5rem' }}>
              Sie haben die Vertraulichkeitsvereinbarung für Projekt <strong>{projectName}</strong> online gemäß §10 verbindlich unterzeichnet. Ihre Anfrage wird nun vom Berater geprüft und freigegeben.
            </p>

            <div style={{ background: C.bg, borderRadius: 10, padding: '1rem 1.25rem', width: '100%', maxWidth: 380, marginBottom: '1.5rem', border: '1px solid #e0ddd6' }}>
              <div style={{ fontSize: '0.72rem', color: '#999', marginBottom: '0.5rem' }}>AUDIT TRAIL</div>
              <div style={{ fontSize: '0.8rem', color: '#444', lineHeight: 1.8 }}>
                <div>{t('nda.unterzeichnet_von', 'Unterzeichnet von:')} <strong>{consentName}</strong></div>
                <div>Datum: <strong>{today}</strong></div>
                {user?.company && <div>Unternehmen: <strong>{user.company}</strong></div>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={downloadNDA}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: C.navy, color: '#fff', border: 'none', padding: '0.65rem 1.4rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
              >
                <Download size={15} /> NDA-PDF herunterladen
              </button>
              <button
                onClick={onClose}
                style={{ padding: '0.65rem 1.25rem', border: `1px solid ${C.navy}`, color: C.navy, background: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
              >
                Schließen
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
