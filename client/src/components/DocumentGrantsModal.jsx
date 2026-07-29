import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { X, Lock, Unlock, Plus, Trash2, Eye, Download } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', text: '#0F172A', muted: '#64748B' };

// Feingranulare Zugriffsstruktur je Dokument: beschränken und einzelnen
// Empfängern Ansicht (read) oder Download (download) freigeben.
export default function DocumentGrantsModal({ projectId, doc, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [newUser, setNewUser] = useState('');
  const [newLevel, setNewLevel] = useState('read');
  const [msg, setMsg] = useState('');

  const load = () => api.get(`/documents/${projectId}/${doc.id}/grants`).then(setData).catch(() => setData(null));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [doc.id]);

  async function setRestricted(on) {
    try { await api.patch(`/documents/${projectId}/${doc.id}`, { restricted: on }); await load(); onChanged && onChanged(); }
    catch (e) { setMsg(e.message); }
  }
  async function addGrant() {
    if (!newUser) return;
    try { await api.post(`/documents/${projectId}/${doc.id}/grants`, { user_id: Number(newUser), level: newLevel }); setNewUser(''); await load(); onChanged && onChanged(); }
    catch (e) { setMsg(e.message); }
  }
  async function changeLevel(userId, level) {
    try { await api.post(`/documents/${projectId}/${doc.id}/grants`, { user_id: userId, level }); await load(); }
    catch (e) { setMsg(e.message); }
  }
  async function remove(userId) {
    try { await api.delete(`/documents/${projectId}/${doc.id}/grants/${userId}`); await load(); onChanged && onChanged(); }
    catch (e) { setMsg(e.message); }
  }

  const grantedIds = new Set((data?.grants || []).map(g => g.user_id));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: '1.5rem', width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
          <h2 style={{ fontWeight: 700, color: C.text, fontSize: '1.05rem', margin: 0 }}>Zugriff je Empfänger</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
        </div>
        <div style={{ fontSize: '0.82rem', color: C.muted, marginBottom: '1rem' }}>{doc.filename}</div>

        {msg && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 6, padding: '0.5rem 0.8rem', fontSize: '0.8rem', marginBottom: '0.8rem' }}>{msg}</div>}

        {/* Beschränkung an/aus */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', background: data?.restricted ? '#fffbeb' : C.bg, border: `1px solid ${data?.restricted ? '#fde68a' : C.border}`, borderRadius: 8, padding: '0.7rem 0.9rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.83rem', color: C.text }}>
            {data?.restricted
              ? <><Lock size={14} style={{ verticalAlign: -2 }} /> Beschränkt: nur freigegebene Empfänger sehen dieses Dokument.</>
              : <><Unlock size={14} style={{ verticalAlign: -2 }} /> Offen: alle datenraumberechtigten Interessenten sehen es.</>}
          </div>
          <button onClick={() => setRestricted(!data?.restricted)} style={{ flexShrink: 0, background: data?.restricted ? '#fff' : C.navy, color: data?.restricted ? C.navy : '#fff', border: `1px solid ${C.navy}`, borderRadius: 6, padding: '0.35rem 0.7rem', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}>
            {data?.restricted ? 'Öffnen' : 'Beschränken'}
          </button>
        </div>

        {/* Empfänger hinzufügen */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <select value={newUser} onChange={e => setNewUser(e.target.value)} style={{ flex: 1, padding: '0.5rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.82rem', background: '#fff' }}>
            <option value="">Interessent auswählen...</option>
            {(data?.recipients || []).filter(r => !grantedIds.has(r.id)).map(r => <option key={r.id} value={r.id}>{r.name} ({r.email})</option>)}
          </select>
          <select value={newLevel} onChange={e => setNewLevel(e.target.value)} style={{ padding: '0.5rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.82rem', background: '#fff' }}>
            <option value="read">Nur Ansicht</option>
            <option value="download">Download</option>
          </select>
          <button onClick={addGrant} disabled={!newUser} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 0.8rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', opacity: newUser ? 1 : 0.5 }}><Plus size={14} /></button>
        </div>

        {(!data || data.grants.length === 0) ? (
          <div style={{ fontSize: '0.82rem', color: C.muted, textAlign: 'center', padding: '1rem 0' }}>Noch keine gezielten Freigaben. Ohne Freigaben und ohne Beschränkung gilt der normale Datenraum-Zugang.</div>
        ) : (
          <div style={{ display: 'grid', gap: '0.4rem' }}>
            {data.grants.map(g => (
              <div key={g.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.5rem 0.7rem', background: C.bg }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.83rem', color: C.text }}>{g.name}</div>
                  <div style={{ fontSize: '0.72rem', color: C.muted }}>{g.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                  <select value={g.level} onChange={e => changeLevel(g.user_id, e.target.value)} style={{ padding: '0.3rem 0.45rem', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: '0.76rem', fontWeight: 600, background: '#fff' }}>
                    <option value="read">Ansicht</option>
                    <option value="download">Download</option>
                  </select>
                  {g.level === 'download' ? <Download size={14} color="#166534" /> : <Eye size={14} color={C.accent} />}
                  <button onClick={() => remove(g.user_id)} title="Entfernen" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
