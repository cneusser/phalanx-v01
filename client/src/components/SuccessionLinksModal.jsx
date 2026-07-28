import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { X, Plus, Link2, Trash2 } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', text: '#0F172A', muted: '#64748B' };
const STATUS = [
  ['vorgeschlagen', 'Vorgeschlagen'], ['vorgestellt', 'Vorgestellt'], ['interesse', 'Übergeber interessiert'],
  ['gespraech', 'Im Gespräch'], ['abgesagt', 'Abgesagt'], ['vermittelt', 'Vermittelt'],
];
const STATUS_LABEL = Object.fromEntries(STATUS);

// Kandidat zu Mandat: welchem Übergeber wurde der Kandidat vorgestellt, mit
// Mini-Status und Notiz je Zuordnung.
export default function SuccessionLinksModal({ candidate, onClose, onChanged }) {
  const [links, setLinks] = useState([]);
  const [mandates, setMandates] = useState([]);
  const [newProject, setNewProject] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => api.get(`/succession/interested/${candidate.id}/links`).then(d => setLinks(d.links || [])).catch(() => setLinks([]));
  useEffect(() => {
    load();
    api.get('/succession/mandates').then(setMandates).catch(() => setMandates([]));
    // eslint-disable-next-line
  }, [candidate.id]);

  const linkedIds = new Set(links.map(l => l.project_id));

  async function add() {
    if (!newProject) return;
    setMsg('');
    try { await api.post(`/succession/interested/${candidate.id}/links`, { project_id: Number(newProject) }); setNewProject(''); await load(); onChanged && onChanged(); }
    catch (e) { setMsg(e.message); }
  }
  async function setStatus(id, status) {
    setLinks(ls => ls.map(l => l.id === id ? { ...l, status } : l));
    try { await api.put(`/succession/links/${id}`, { status }); } catch { load(); }
  }
  async function saveNote(id, note) { try { await api.put(`/succession/links/${id}`, { note }); } catch { /* ignore */ } }
  async function remove(id) {
    try { await api.delete(`/succession/links/${id}`); await load(); onChanged && onChanged(); } catch { /* ignore */ }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: '1.6rem', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <h2 style={{ fontWeight: 700, color: C.text, fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Link2 size={18} /> Mandats-Zuordnungen</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
        </div>
        <div style={{ fontSize: '0.83rem', color: C.muted, marginBottom: '1rem' }}>{[candidate.first_name, candidate.last_name].filter(Boolean).join(' ')} · {candidate.email}</div>

        {msg && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 6, padding: '0.5rem 0.8rem', fontSize: '0.8rem', marginBottom: '0.8rem' }}>{msg}</div>}

        {/* Neue Zuordnung */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <select value={newProject} onChange={e => setNewProject(e.target.value)} style={{ flex: 1, padding: '0.55rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.85rem', background: '#fff' }}>
            <option value="">Mandat auswählen...</option>
            {mandates.filter(m => !linkedIds.has(m.id)).map(m => <option key={m.id} value={m.id}>{m.codename} ({[m.industry, m.region].filter(Boolean).join(', ')})</option>)}
          </select>
          <button onClick={add} disabled={!newProject} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 0.9rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', opacity: newProject ? 1 : 0.5 }}><Plus size={14} /> Zuordnen</button>
        </div>

        {links.length === 0 && <div style={{ fontSize: '0.84rem', color: C.muted, textAlign: 'center', padding: '1.5rem 0' }}>Noch keinem Mandat zugeordnet. Oben ein Mandat auswählen und zuordnen.</div>}

        <div style={{ display: 'grid', gap: '0.6rem' }}>
          {links.map(l => (
            <div key={l.id} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.7rem 0.8rem', background: C.bg }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ fontWeight: 700, color: C.text, fontSize: '0.88rem' }}>{l.codename}<span style={{ fontWeight: 400, color: C.muted, fontSize: '0.76rem' }}> · {[l.industry, l.region].filter(Boolean).join(', ')}</span></div>
                <button onClick={() => remove(l.id)} title="Entfernen" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}><Trash2 size={15} /></button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 6, alignItems: 'center' }}>
                <select value={l.status} onChange={e => setStatus(l.id, e.target.value)} style={{ padding: '0.35rem 0.5rem', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, background: '#fff' }}>
                  {STATUS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
              </div>
              <textarea defaultValue={l.note || ''} onBlur={e => saveNote(l.id, e.target.value)} placeholder="Notiz zur Zuordnung (speichert beim Verlassen)" rows={2}
                style={{ width: '100%', boxSizing: 'border-box', marginTop: 6, fontSize: '0.78rem', border: `1px solid ${C.border}`, borderRadius: 6, padding: '0.4rem', resize: 'vertical' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
