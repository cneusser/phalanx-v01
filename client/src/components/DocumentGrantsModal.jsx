import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { X, Lock, Unlock, Plus, Trash2, Eye, Download, Users } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', text: '#0F172A', muted: '#64748B' };
const SUBJECTS = [['user', 'Person'], ['buyer_group', 'Käufergruppe'], ['party_all', 'Alle Beteiligten'], ['group', 'Eigene Gruppe']];
const sel = { padding: '0.5rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.82rem', background: '#fff' };

// Feingranulare Zugriffsstruktur je Dokument (Drooms-Modell): beschränken und
// gezielt an Personen, Käufergruppen, alle Beteiligten oder eigene Gruppen
// freigeben, jeweils als Ansicht oder Download.
export default function DocumentGrantsModal({ projectId, doc, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [subjectType, setSubjectType] = useState('user');
  const [subjectRef, setSubjectRef] = useState('');
  const [newLevel, setNewLevel] = useState('read');
  const [msg, setMsg] = useState('');
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [groups, setGroups] = useState([]);
  const [newGroup, setNewGroup] = useState('');

  const load = () => api.get(`/documents/${projectId}/${doc.id}/grants`).then(setData).catch(() => setData(null));
  const loadGroups = () => api.get(`/safe/${projectId}/groups`).then(g => setGroups(g || [])).catch(() => setGroups([]));
  useEffect(() => { load(); loadGroups(); /* eslint-disable-next-line */ }, [doc.id]);

  async function setRestricted(on) {
    try { await api.patch(`/documents/${projectId}/${doc.id}`, { restricted: on }); await load(); onChanged && onChanged(); }
    catch (e) { setMsg(e.message); }
  }
  async function addGrant() {
    if (subjectType !== 'party_all' && !subjectRef) return;
    try {
      await api.post(`/documents/${projectId}/${doc.id}/grants`, { subject_type: subjectType, subject_ref: subjectType === 'party_all' ? '*' : subjectRef, level: newLevel });
      setSubjectRef(''); await load(); onChanged && onChanged();
    } catch (e) { setMsg(e.message); }
  }
  async function changeLevel(g, level) {
    try { await api.post(`/documents/${projectId}/${doc.id}/grants`, { subject_type: g.subject_type, subject_ref: g.subject_ref, level }); await load(); }
    catch (e) { setMsg(e.message); }
  }
  async function remove(id) {
    try { await api.delete(`/documents/${projectId}/${doc.id}/grants/${id}`); await load(); onChanged && onChanged(); }
    catch (e) { setMsg(e.message); }
  }
  // Gruppenverwaltung
  async function createGroup() {
    if (!newGroup.trim()) return;
    try { await api.post(`/safe/${projectId}/groups`, { name: newGroup.trim() }); setNewGroup(''); await loadGroups(); await load(); }
    catch (e) { setMsg(e.message); }
  }
  async function deleteGroup(id) {
    if (!window.confirm('Gruppe löschen? Bestehende Freigaben an diese Gruppe verlieren dann ihre Wirkung.')) return;
    try { await api.delete(`/safe/${projectId}/groups/${id}`); await loadGroups(); await load(); }
    catch (e) { setMsg(e.message); }
  }
  async function addMember(groupId, userId) {
    if (!userId) return;
    try { await api.post(`/safe/${projectId}/groups/${groupId}/members`, { user_id: Number(userId) }); await loadGroups(); }
    catch (e) { setMsg(e.message); }
  }
  async function removeMember(groupId, userId) {
    try { await api.delete(`/safe/${projectId}/groups/${groupId}/members/${userId}`); await loadGroups(); }
    catch (e) { setMsg(e.message); }
  }

  const recipients = data?.recipients || [];
  const buyerGroups = data?.buyer_groups || [];
  const ownGroups = data?.groups || [];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: '1.5rem', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
          <h2 style={{ fontWeight: 700, color: C.text, fontSize: '1.05rem', margin: 0 }}>Freigaben je Dokument</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
        </div>
        <div style={{ fontSize: '0.82rem', color: C.muted, marginBottom: '1rem' }}>{doc.filename}</div>

        {msg && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 6, padding: '0.5rem 0.8rem', fontSize: '0.8rem', marginBottom: '0.8rem' }}>{msg}</div>}

        {/* Beschränkung an/aus */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', background: data?.restricted ? '#fffbeb' : C.bg, border: `1px solid ${data?.restricted ? '#fde68a' : C.border}`, borderRadius: 8, padding: '0.7rem 0.9rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.83rem', color: C.text }}>
            {data?.restricted
              ? <><Lock size={14} style={{ verticalAlign: -2 }} /> Beschränkt: nur freigegebene Subjekte sehen dieses Dokument.</>
              : <><Unlock size={14} style={{ verticalAlign: -2 }} /> Offen: alle datenraumberechtigten Interessenten sehen es.</>}
          </div>
          <button onClick={() => setRestricted(!data?.restricted)} style={{ flexShrink: 0, background: data?.restricted ? '#fff' : C.navy, color: data?.restricted ? C.navy : '#fff', border: `1px solid ${C.navy}`, borderRadius: 6, padding: '0.35rem 0.7rem', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}>
            {data?.restricted ? 'Öffnen' : 'Beschränken'}
          </button>
        </div>

        {/* Freigabe hinzufügen */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginBottom: '0.6rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select value={subjectType} onChange={e => { setSubjectType(e.target.value); setSubjectRef(''); }} style={{ ...sel, width: 150 }}>
              {SUBJECTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            {subjectType === 'user' && (
              <select value={subjectRef} onChange={e => setSubjectRef(e.target.value)} style={{ ...sel, flex: 1, minWidth: 160 }}>
                <option value="">Person auswählen…</option>
                {recipients.map(r => <option key={r.id} value={r.id}>{r.name} ({r.email})</option>)}
              </select>
            )}
            {subjectType === 'buyer_group' && (
              <select value={subjectRef} onChange={e => setSubjectRef(e.target.value)} style={{ ...sel, flex: 1, minWidth: 160 }}>
                <option value="">Käufergruppe…</option>
                {buyerGroups.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
              </select>
            )}
            {subjectType === 'group' && (
              <select value={subjectRef} onChange={e => setSubjectRef(e.target.value)} style={{ ...sel, flex: 1, minWidth: 160 }}>
                <option value="">Eigene Gruppe…</option>
                {ownGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            )}
            {subjectType === 'party_all' && (
              <div style={{ flex: 1, minWidth: 160, fontSize: '0.8rem', color: C.muted, alignSelf: 'center' }}>Alle Beteiligten dieses Mandats</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select value={newLevel} onChange={e => setNewLevel(e.target.value)} style={sel}>
              <option value="read">Nur Ansicht</option>
              <option value="download">Download</option>
            </select>
            <button onClick={addGrant} disabled={subjectType !== 'party_all' && !subjectRef} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 0.9rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', opacity: (subjectType === 'party_all' || subjectRef) ? 1 : 0.5 }}><Plus size={14} /> Freigeben</button>
          </div>
        </div>

        {(!data || data.grants.length === 0) ? (
          <div style={{ fontSize: '0.82rem', color: C.muted, textAlign: 'center', padding: '1rem 0' }}>Noch keine gezielten Freigaben. Ohne Freigaben und ohne Beschränkung gilt der normale Datenraum-Zugang.</div>
        ) : (
          <div style={{ display: 'grid', gap: '0.4rem' }}>
            {data.grants.map(g => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.5rem 0.7rem', background: C.bg }}>
                <div style={{ minWidth: 0, fontWeight: 600, fontSize: '0.82rem', color: C.text }}>{g.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                  <select value={g.level} onChange={e => changeLevel(g, e.target.value)} style={{ padding: '0.3rem 0.45rem', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: '0.76rem', fontWeight: 600, background: '#fff' }}>
                    <option value="read">Ansicht</option>
                    <option value="download">Download</option>
                  </select>
                  {g.level === 'download' ? <Download size={14} color="#166534" /> : <Eye size={14} color={C.accent} />}
                  <button onClick={() => remove(g.id)} title="Entfernen" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Eigene Gruppen verwalten */}
        <div style={{ marginTop: '1.1rem', borderTop: `1px solid ${C.border}`, paddingTop: '0.8rem' }}>
          <button onClick={() => setGroupsOpen(v => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: C.navy, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}>
            <Users size={15} /> Eigene Gruppen verwalten {groupsOpen ? '▾' : '▸'}
          </button>
          {groupsOpen && (
            <div style={{ marginTop: '0.6rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.7rem' }}>
                <input value={newGroup} onChange={e => setNewGroup(e.target.value)} placeholder="Neue Gruppe, z. B. Bieterkonsortium A" style={{ ...sel, flex: 1 }} />
                <button onClick={createGroup} disabled={!newGroup.trim()} style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 0.8rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Anlegen</button>
              </div>
              {groups.length === 0 ? <div style={{ fontSize: '0.8rem', color: C.muted }}>Noch keine eigenen Gruppen.</div> : groups.map(g => (
                <div key={g.id} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.6rem 0.7rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.83rem', color: C.navy }}>{g.name}</div>
                    <button onClick={() => deleteGroup(g.id)} title="Gruppe löschen" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}><Trash2 size={13} /></button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, margin: '0.4rem 0' }}>
                    {(g.members || []).length === 0 ? <span style={{ fontSize: '0.74rem', color: C.muted }}>Keine Mitglieder</span> : g.members.map(m => (
                      <span key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: '0.1rem 0.5rem', fontSize: '0.72rem' }}>
                        {m.name}
                        <button onClick={() => removeMember(g.id, m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', padding: 0, lineHeight: 1 }}>×</button>
                      </span>
                    ))}
                  </div>
                  <select value="" onChange={e => addMember(g.id, e.target.value)} style={{ ...sel, width: '100%', fontSize: '0.78rem' }}>
                    <option value="">Mitglied hinzufügen…</option>
                    {recipients.filter(r => !(g.members || []).some(m => m.id === r.id)).map(r => <option key={r.id} value={r.id}>{r.name} ({r.email})</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
