import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { X, Eye, EyeOff, ShieldCheck } from 'lucide-react';

const C = { navy: '#111820', accent: '#1D4E89', bg: '#f4f6f7', card: '#FFFFFF', border: '#d8dde1', text: '#0F172A', muted: '#64748B' };

// Kontaktoffenlegung je Mandat (v0.468).
//
// Die Liste zeigt auch die Fälle, die noch nicht freigegeben werden dürfen,
// und sagt warum. Ein ausgegrauter Knopf ohne Begründung erzeugt nur die
// Rückfrage, die man sich damit sparen wollte.
export default function KontaktFreigabeModal({ projectId, onClose }) {
  const [data, setData] = useState(null);
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(0);

  const laden = () => api.get(`/admin/projects/${projectId}/kontakt-freigaben`)
    .then((d) => { setData(d); setFehler(''); })
    .catch((e) => setFehler(e.message || 'Die Freigaben konnten nicht geladen werden.'));
  useEffect(() => { laden(); /* eslint-disable-next-line */ }, [projectId]);

  async function freigeben(z) {
    setLaeuft(z.interessent_id);
    try { await api.post(`/admin/projects/${projectId}/kontakt-freigaben`, { interessent_id: z.interessent_id }); await laden(); }
    catch (e) { setFehler(e.message); }
    finally { setLaeuft(0); }
  }
  async function widerrufen(z) {
    setLaeuft(z.interessent_id);
    try { await api.delete(`/admin/projects/${projectId}/kontakt-freigaben/${z.interessent_id}`); await laden(); }
    catch (e) { setFehler(e.message); }
    finally { setLaeuft(0); }
  }

  const zeilen = data?.zeilen || [];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '1rem' }}>
      <div style={{ background: C.card, borderRadius: 14, width: 'min(760px, 100%)', maxHeight: '86vh', overflow: 'auto', border: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: `1px solid ${C.border}` }}>
          <div>
            <div style={{ fontWeight: 700, color: C.navy }}>Kontaktdaten offenlegen</div>
            <div style={{ fontSize: '.8rem', color: C.muted }}>{data?.codename || 'Mandat'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}><X size={18} /></button>
        </div>

        <div style={{ padding: '1rem 1.25rem', fontSize: '.84rem', color: C.text, lineHeight: 1.55 }}>
          Solange hier nichts freigegeben ist, sehen Verkäufer und Interessent die
          Adresse der jeweils anderen Seite nicht. Freigeben lässt sich erst, wenn
          die Vertraulichkeitsvereinbarung von allen Seiten unterzeichnet ist.
          Ein Widerruf ist jederzeit möglich und bleibt im Protokoll stehen.
        </div>

        {fehler && (
          <div style={{ margin: '0 1.25rem 1rem', padding: '.75rem .9rem', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '.84rem' }}>
            {fehler}
          </div>
        )}

        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          {!data && !fehler && <div style={{ color: C.muted, fontSize: '.85rem' }}>Wird geladen.</div>}
          {data && zeilen.length === 0 && (
            <div style={{ color: C.muted, fontSize: '.85rem' }}>Für dieses Mandat ist noch keine Gegenseite erfasst.</div>
          )}
          {zeilen.map((z) => (
            <div key={z.interessent_id} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.75rem 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: C.navy, fontSize: '.9rem' }}>{z.name}</div>
                <div style={{ fontSize: '.78rem', color: C.muted }}>
                  {z.company || 'ohne Firma'}
                  {z.freigegeben
                    ? ' · offengelegt'
                    : (z.darf_freigegeben_werden ? ' · bereit zur Freigabe' : ` · ${z.fehlend.join(' ')}`)}
                </div>
              </div>
              {z.freigegeben ? (
                <button onClick={() => widerrufen(z)} disabled={laeuft === z.interessent_id}
                  style={{ display: 'flex', alignItems: 'center', gap: '.4rem', padding: '.45rem .8rem', borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', color: C.text, cursor: 'pointer', fontSize: '.82rem' }}>
                  <EyeOff size={15} /> Widerrufen
                </button>
              ) : (
                <button onClick={() => freigeben(z)} disabled={!z.darf_freigegeben_werden || laeuft === z.interessent_id}
                  title={z.darf_freigegeben_werden ? 'Kontaktdaten beider Seiten offenlegen' : z.fehlend.join(' ')}
                  style={{ display: 'flex', alignItems: 'center', gap: '.4rem', padding: '.45rem .8rem', borderRadius: 8, border: 'none',
                    background: z.darf_freigegeben_werden ? C.accent : '#e2e8f0', color: z.darf_freigegeben_werden ? '#fff' : C.muted,
                    cursor: z.darf_freigegeben_werden ? 'pointer' : 'not-allowed', fontSize: '.82rem' }}>
                  {z.darf_freigegeben_werden ? <Eye size={15} /> : <ShieldCheck size={15} />} Offenlegen
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
