import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Users, Lock, Unlock, Mail } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', text: '#0F172A', muted: '#64748B' };

// Übergeber-Sicht: passende Nachfolge-Kandidaten zum Mandat. Kontaktdaten erst
// nach Freischaltung (spätere Bezahlstufe, aktuell durch das Team).
export default function SuccessionCandidates({ projectId, isAdmin }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/succession/mandate/${projectId}/candidates`).then(setData).catch(() => setData(null));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [projectId]);

  async function toggle() {
    setBusy(true);
    try { await api.post(`/succession/mandate/${projectId}/unlock`, { unlocked: !data.unlocked }); await load(); }
    catch { /* ignore */ }
    finally { setBusy(false); }
  }

  if (!data || !data.is_succession) return null;

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.9rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={18} color={C.navy} />
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: C.text, margin: 0 }}>Passende Nachfolge-Kandidaten</h3>
          <span style={{ background: '#EDF4FA', color: C.navy, fontWeight: 700, fontSize: '0.75rem', borderRadius: 20, padding: '0.1rem 0.6rem' }}>{data.count}</span>
        </div>
        {isAdmin && (
          <button onClick={toggle} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: data.unlocked ? '#fff' : '#166534', color: data.unlocked ? C.navy : '#fff', border: `1px solid ${data.unlocked ? C.border : '#166534'}`, borderRadius: 6, padding: '0.4rem 0.8rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
            {data.unlocked ? <><Lock size={13} /> Freischaltung aufheben</> : <><Unlock size={13} /> Kontakte freischalten</>}
          </button>
        )}
      </div>

      {data.count === 0 && <div style={{ fontSize: '0.85rem', color: C.muted }}>Aktuell keine passenden Kandidaten im Nachfolge-Netzwerk. Sobald jemand Passendes dazukommt, taucht er hier auf.</div>}

      {!data.unlocked && data.count > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.7rem 0.9rem', fontSize: '0.8rem', color: '#92400e', marginBottom: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Lock size={14} /> Die Namen und Kontaktdaten der Kandidaten sind noch nicht freigeschaltet. {isAdmin ? 'Als Team können Sie oben freischalten.' : 'Ihr Ansprechpartner bei Phalanx schaltet sie für Sie frei.'}
        </div>
      )}

      <div style={{ display: 'grid', gap: '0.6rem' }}>
        {data.candidates.map((c, i) => (
          <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.75rem 0.9rem', background: C.bg }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
              <div style={{ fontWeight: 700, color: C.text, fontSize: '0.9rem' }}>
                {c.unlocked ? c.name : c.label}
                {c.succession_type && <span style={{ fontWeight: 500, color: C.muted, fontSize: '0.78rem' }}> · {c.succession_type}</span>}
              </div>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: c.score >= 55 ? '#166534' : C.navy }}>{c.score}%</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: C.muted, marginTop: 3 }}>
              {[c.branchenfokus?.join(', '), c.region?.join(', '), c.umsatz_band ? 'Umsatzziel ' + c.umsatz_band + ' Mio.' : null, c.fuehrungserfahrung].filter(Boolean).join(' · ')}
            </div>
            {c.reasons?.length > 0 && (
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: 5 }}>
                {c.reasons.map(r => <span key={r} style={{ fontSize: '0.68rem', fontWeight: 600, color: '#065f46', background: '#d1fae5', borderRadius: 20, padding: '0.1rem 0.5rem' }}>{r}</span>)}
              </div>
            )}
            {c.unlocked && (
              <div style={{ fontSize: '0.78rem', color: C.text, marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
                <a href={`mailto:${c.email}`} style={{ color: C.accent, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Mail size={13} /> {c.email}</a>
                {c.company && <span>{c.company}</span>}
                {c.plz_ort && <span>{c.plz_ort}</span>}
                {c.eigenkapital && <span>EK: {c.eigenkapital}</span>}
                {c.verfuegbarkeit && <span>Verfügbar: {c.verfuegbarkeit}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
