// ─────────────────────────────────────────────────────────────────────────────
// Öffentliche Empfängerseite für den Unterlagen-Link (v0.306).
//
// Kein Konto, keine Anmeldung. Der Empfänger bestätigt mit seinem Namen die
// Vertraulichkeit und lädt danach genau eine Unterlage. Das Wasserzeichen trägt
// seinen Namen, jeder Abruf wird protokolliert.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { FileText, Lock, ShieldCheck, AlertCircle } from 'lucide-react';

const C = { navy: '#0D2A4A', accent: '#1D4E89', bg: '#F3F7FB', card: '#FFFFFF', border: '#D6E4F0', muted: '#64748B', text: '#1E293B' };
const INPUT = { width: '100%', padding: '0.7rem 0.9rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' };

export default function SharedDocument() {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/share/${encodeURIComponent(token)}`);
      const d = await res.json();
      if (!res.ok || !d.success) { setError(d.error || 'Dieser Link ist nicht gültig.'); return; }
      setInfo(d.data); setError('');
    } catch { setError('Der Link konnte nicht geprüft werden.'); }
  };
  useEffect(() => { if (token) load(); else setError('Es fehlt ein Zugangs-Token.'); /* eslint-disable-next-line */ }, [token]);

  async function confirm() {
    setBusy(true);
    try {
      const res = await fetch(`/api/share/${encodeURIComponent(token)}/ack`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, accepted }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) { setError(d.error || 'Bestätigung fehlgeschlagen.'); return; }
      await load();
    } catch { setError('Bestätigung fehlgeschlagen.'); }
    finally { setBusy(false); }
  }

  function download() {
    window.location.href = `/api/share/${encodeURIComponent(token)}/file`;
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, width: 'min(560px, 100%)', padding: '2rem', boxShadow: '0 10px 40px rgba(13,42,74,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.2rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EDF4FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={18} color={C.navy} />
          </div>
          <div>
            <div style={{ fontWeight: 800, color: C.navy, fontSize: '1.05rem' }}>Vertrauliche Unterlage</div>
            <div style={{ fontSize: '0.78rem', color: C.muted }}>Bereitgestellt über CapitalMatch</div>
          </div>
        </div>

        {error && (
          <div style={{ display: 'flex', gap: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#991b1b', borderRadius: 10, padding: '0.9rem 1rem', fontSize: '0.86rem', lineHeight: 1.55 }}>
            <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              {error}
              <div style={{ marginTop: 6, fontSize: '0.8rem', color: '#7f1d1d' }}>
                Bitte wenden Sie sich an Ihren Ansprechpartner, wenn Sie einen neuen Link benötigen.
              </div>
            </div>
          </div>
        )}

        {info && (
          <>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '0.9rem 1rem', marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: C.text, fontSize: '0.9rem' }}>
                <FileText size={15} color={C.accent} /> {info.label}
              </div>
              <div style={{ fontSize: '0.8rem', color: C.muted, marginTop: 4 }}>
                Mandat {info.codename}{info.filename ? ` · ${info.filename}` : ''}
              </div>
              <div style={{ fontSize: '0.76rem', color: C.muted, marginTop: 2 }}>
                Gültig bis {new Date(info.expires_at).toLocaleDateString('de-DE')}
              </div>
            </div>

            {info.needs_ack ? (
              <>
                <p style={{ fontSize: '0.86rem', color: C.text, lineHeight: 1.6, marginBottom: '1rem' }}>
                  Diese Unterlage ist vertraulich. Bitte bestätigen Sie mit Ihrem Namen, dass Sie sie
                  ausschließlich zur Prüfung einer möglichen Beteiligung verwenden, nicht an Dritte
                  weitergeben und nach Abschluss der Prüfung löschen.
                </p>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Vor- und Nachname" style={{ ...INPUT, marginBottom: '0.7rem' }} />
                <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: '0.84rem', color: C.text, cursor: 'pointer', marginBottom: '1.1rem', lineHeight: 1.5 }}>
                  <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} style={{ marginTop: 3 }} />
                  Ich behandle diese Unterlage vertraulich und gebe sie nicht an Dritte weiter.
                </label>
                <button onClick={confirm} disabled={busy || name.trim().length < 3 || !accepted}
                  style={{
                    width: '100%', padding: '0.8rem', borderRadius: 9, border: 'none', cursor: (name.trim().length < 3 || !accepted) ? 'not-allowed' : 'pointer',
                    background: (name.trim().length < 3 || !accepted) ? '#94a3b8' : C.navy, color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                  }}>
                  {busy ? 'Wird bestätigt…' : 'Bestätigen und öffnen'}
                </button>
                <div style={{ fontSize: '0.73rem', color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
                  Ihre Bestätigung wird mit Zeitpunkt protokolliert. Die Unterlage trägt ein Wasserzeichen mit Ihrem Namen.
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 9, padding: '0.7rem 0.9rem', fontSize: '0.84rem', color: '#065f46', marginBottom: '1.1rem' }}>
                  <ShieldCheck size={16} /> Bestätigt als {info.acked_name}
                </div>
                <button onClick={download}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: 9, border: 'none', cursor: 'pointer', background: C.navy, color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
                  Unterlage herunterladen
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
