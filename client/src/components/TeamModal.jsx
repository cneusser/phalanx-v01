import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { X, Send, RotateCw, Trash2, Eye, PenLine } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', text: '#0F172A', muted: '#64748B' };
const INPUT = { width: '100%', padding: '0.55rem 0.7rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' };

// Einladungs-Funnel: eingeladen → geöffnet → angenommen
const FUNNEL_STEPS = [
  ['invited', 'Eingeladen', '#94a3b8'],
  ['opened', 'Geöffnet', '#0ea5e9'],
  ['accepted', 'Angenommen', '#10b981'],
];
const STATUS_STYLE = {
  invited: { label: 'Eingeladen', bg: '#f1f5f9', color: '#475569' },
  opened: { label: 'Geöffnet', bg: '#e0f2fe', color: '#0369a1' },
  accepted: { label: 'Angenommen', bg: '#d1fae5', color: '#065f46' },
  declined: { label: 'Abgelehnt', bg: '#fee2e2', color: '#991b1b' },
  revoked: { label: 'Widerrufen', bg: '#f1f5f9', color: '#64748b' },
  expired: { label: 'Abgelaufen', bg: '#fef3c7', color: '#92400e' },
};

export default function TeamModal({ projectId, codename, onClose }) {
  const [data, setData] = useState(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try { setData(await api.get(`/invitations/project/${projectId}`)); }
    catch (e) { setMsg('Fehler: ' + e.message); }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  async function invite(e) {
    e.preventDefault();
    setBusy(true); setMsg('');
    try {
      await api.post(`/invitations/project/${projectId}`, { email, role, message });
      setEmail(''); setMessage('');
      setMsg('Einladung versendet ✓');
      await load();
    } catch (e) { setMsg('Fehler: ' + e.message); }
    finally { setBusy(false); }
  }

  const act = async (fn, okMsg) => {
    setBusy(true); setMsg('');
    try { await fn(); setMsg(okMsg); await load(); }
    catch (e) { setMsg('Fehler: ' + e.message); }
    finally { setBusy(false); }
  };

  const funnel = data?.funnel || {};
  const totalOpen = (funnel.invited || 0) + (funnel.opened || 0);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,54,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: 12, width: '100%', maxWidth: 720, maxHeight: '88vh', overflowY: 'auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: C.navy, margin: 0 }}>Team & Einladungen</h2>
            <div style={{ fontSize: '0.8rem', color: C.muted, marginTop: 2 }}>{codename}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}><X size={20} /></button>
        </div>

        {msg && (
          <div style={{ background: msg.startsWith('Fehler') ? '#fee2e2' : '#d1fae5', color: msg.startsWith('Fehler') ? '#991b1b' : '#065f46', borderRadius: 8, padding: '0.6rem 0.9rem', fontSize: '0.83rem', marginBottom: '1rem' }}>{msg}</div>
        )}

        {/* Einladen */}
        <form onSubmit={invite} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: C.muted, letterSpacing: '0.06em', marginBottom: '0.6rem' }}>NEUEN KONTAKT EINLADEN</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#333', fontWeight: 600, marginBottom: 3 }}>E-Mail-Adresse</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@firma.de" style={INPUT} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#333', fontWeight: 600, marginBottom: 3 }}>Rolle</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={INPUT}>
                <option value="viewer">Betrachter (nur lesen)</option>
                <option value="editor">Pflegender (bearbeiten)</option>
              </select>
            </div>
            <button type="submit" disabled={busy} style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 1rem', fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
              <Send size={14} /> Einladen
            </button>
          </div>
          <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Persönliche Nachricht (optional)" style={{ ...INPUT, marginTop: '0.5rem' }} />
          <div style={{ fontSize: '0.72rem', color: C.muted, marginTop: '0.5rem', lineHeight: 1.5 }}>
            <strong>Betrachter</strong> dürfen das Mandat ansehen (inkl. Exposé und Safe), aber nichts ändern.
            <strong> Pflegende</strong> dürfen Daten, Exposé und Unterlagen bearbeiten und selbst einladen.
          </div>
        </form>

        {/* Funnel */}
        {data && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: C.muted, letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
              EINLADUNGS-FUNNEL {totalOpen > 0 && <span style={{ color: '#d97706' }}>· {totalOpen} offen</span>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {FUNNEL_STEPS.map(([key, label, color]) => (
                <div key={key} style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: (funnel[key] || 0) > 0 ? color : C.muted }}>{funnel[key] || 0}</div>
                  <div style={{ fontSize: '0.7rem', color: C.muted, fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aktuelles Team */}
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: C.muted, letterSpacing: '0.06em', marginBottom: '0.5rem' }}>AKTUELLES TEAM</div>
        {data?.members?.length ? data.members.map(m => (
          <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem', border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: '0.4rem' }}>
            {m.member_role === 'viewer' ? <Eye size={15} color={C.muted} /> : <PenLine size={15} color={C.accent} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: C.text }}>{m.name}</div>
              <div style={{ fontSize: '0.72rem', color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}{m.company ? ` · ${m.company}` : ''}</div>
            </div>
            <select
              value={m.member_role === 'viewer' ? 'viewer' : 'editor'}
              onChange={e => act(() => api.put(`/invitations/project/${projectId}/member/${m.user_id}`, { role: e.target.value }), 'Rolle geändert ✓')}
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.4rem', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>
              <option value="viewer">Betrachter</option>
              <option value="editor">Pflegender</option>
            </select>
            <button title="Zugriff entfernen" onClick={() => act(() => api.delete(`/invitations/project/${projectId}/member/${m.user_id}`), 'Zugriff entfernt ✓')}
              style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, padding: '0.3rem 0.45rem', cursor: 'pointer' }}>
              <Trash2 size={13} />
            </button>
          </div>
        )) : <div style={{ fontSize: '0.82rem', color: C.muted, padding: '0.5rem 0' }}>Noch keine zusätzlichen Mitglieder.</div>}

        {/* Einladungen */}
        {data?.invitations?.length > 0 && (
          <>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: C.muted, letterSpacing: '0.06em', margin: '1.25rem 0 0.5rem' }}>EINLADUNGEN</div>
            {data.invitations.map(i => {
              const st = STATUS_STYLE[i.status] || STATUS_STYLE.invited;
              const open = ['invited', 'opened'].includes(i.status);
              return (
                <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.75rem', border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: '0.35rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.email}</div>
                    <div style={{ fontSize: '0.7rem', color: C.muted }}>
                      {i.role === 'viewer' ? 'Betrachter' : 'Pflegender'}
                      {i.invited_by_name ? ` · von ${i.invited_by_name}` : ''}
                      {i.invited_at ? ` · ${new Date(i.invited_at).toLocaleDateString('de-DE')}` : ''}
                    </div>
                  </div>
                  <span style={{ background: st.bg, color: st.color, padding: '0.15rem 0.5rem', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{st.label}</span>
                  {open && (
                    <>
                      <button title="Erinnerung senden" onClick={() => act(() => api.post(`/invitations/${i.id}/resend`, {}), 'Erinnerung gesendet ✓')}
                        style={{ background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: 6, padding: '0.28rem 0.42rem', cursor: 'pointer' }}>
                        <RotateCw size={13} />
                      </button>
                      <button title="Einladung widerrufen" onClick={() => act(() => api.delete(`/invitations/${i.id}`), 'Einladung widerrufen ✓')}
                        style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, padding: '0.28rem 0.42rem', cursor: 'pointer' }}>
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
