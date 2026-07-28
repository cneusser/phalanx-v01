import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { StickyNote, Check, X } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', text: '#0F172A', muted: '#64748B' };
const STAGE_LABEL = {
  neu: 'Neu', profil: 'Profil vollständig', vorgestellt: 'Mandat vorgestellt',
  gespraech: 'Im Gespräch', vermittelt: 'Vermittelt', kein_match: 'Kein Match',
};
const STAGE_COLOR = {
  neu: '#64748B', profil: '#1D4E89', vorgestellt: '#0891b2',
  gespraech: '#d97706', vermittelt: '#166534', kein_match: '#991b1b',
};
const ORDER = ['neu', 'profil', 'vorgestellt', 'gespraech', 'vermittelt', 'kein_match'];
const sel = { padding: '0.5rem', border: '1px solid #DDE8F3', borderRadius: 6, fontSize: '0.82rem', background: '#fff' };

// Nachfolge-Funnel im CRM als Kanban: Kandidaten per Drag-and-drop durch die
// Stufen führen, mit interner Notiz je Karte.
export default function SuccessionFunnel() {
  const [list, setList] = useState([]);
  const [stages, setStages] = useState(ORDER);
  const [filter, setFilter] = useState({ umsatz: '', szenario: '', q: '' });
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const [noteEdit, setNoteEdit] = useState(null);
  const [noteText, setNoteText] = useState('');

  const load = useCallback(() => {
    const p = new URLSearchParams();
    ['umsatz', 'szenario', 'q'].forEach(k => { if (filter[k]) p.set(k, filter[k]); });
    const qs = p.toString();
    api.get('/succession/interested' + (qs ? '?' + qs : '')).then(d => {
      setList(d.list || []);
      if (d.stages && d.stages.length) setStages(d.stages);
    }).catch(() => setList([]));
  }, [filter]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  async function moveTo(userId, stage) {
    setList(l => l.map(u => u.id === userId ? { ...u, succession_stage: stage } : u)); // optimistisch
    try { await api.put(`/succession/interested/${userId}/stage`, { stage }); } catch { load(); }
  }
  async function saveNote(userId) {
    try { await api.put(`/succession/interested/${userId}/note`, { note: noteText }); } catch { /* ignore */ }
    setList(l => l.map(u => u.id === userId ? { ...u, succession_note: noteText } : u));
    setNoteEdit(null);
  }

  const byStage = (st) => list.filter(u => (u.succession_stage || 'neu') === st);

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <input value={filter.q} onChange={e => setFilter(f => ({ ...f, q: e.target.value }))} placeholder="Suche: Name, Firma, Branche, Region..."
          style={{ flex: 1, minWidth: 200, padding: '0.5rem 0.8rem', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: '0.85rem' }} />
        <select value={filter.umsatz} onChange={e => setFilter(f => ({ ...f, umsatz: e.target.value }))} style={sel}>
          <option value="">Umsatz: alle</option>
          <option value="<1">unter 1 Mio.</option><option value="1-3">1 bis 3 Mio.</option><option value="3-10">3 bis 10 Mio.</option><option value="10-30">10 bis 30 Mio.</option><option value=">30">über 30 Mio.</option>
        </select>
        <select value={filter.szenario} onChange={e => setFilter(f => ({ ...f, szenario: e.target.value }))} style={sel}>
          <option value="">Szenario: alle</option>
          <option value="reine_beteiligung">Reine Beteiligung</option><option value="partnerschaft">Strategische Partnerschaft</option><option value="operative_fuehrung">Operative Führung</option><option value="andere">Andere</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.75rem', alignItems: 'flex-start' }}>
        {stages.map(st => {
          const cards = byStage(st);
          return (
            <div key={st}
              onDragOver={(e) => { e.preventDefault(); setOver(st); }}
              onDragLeave={() => setOver(o => (o === st ? null : o))}
              onDrop={() => { if (drag != null) moveTo(drag, st); setDrag(null); setOver(null); }}
              style={{ flex: '0 0 260px', width: 260, background: over === st ? '#EDF4FA' : C.bg, border: `1.5px solid ${over === st ? STAGE_COLOR[st] : C.border}`, borderRadius: 10, padding: '0.7rem', minHeight: 140 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: STAGE_COLOR[st] }}>{STAGE_LABEL[st] || st}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff', background: STAGE_COLOR[st], borderRadius: 20, padding: '0.05rem 0.5rem' }}>{cards.length}</span>
              </div>

              {cards.length === 0 && <div style={{ fontSize: '0.74rem', color: C.muted, textAlign: 'center', padding: '0.8rem 0' }}>Hierher ziehen</div>}

              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {cards.map(u => (
                  <div key={u.id} draggable onDragStart={() => setDrag(u.id)} onDragEnd={() => { setDrag(null); setOver(null); }}
                    style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.6rem 0.7rem', cursor: 'grab', boxShadow: drag === u.id ? '0 4px 12px rgba(13,27,54,0.15)' : 'none' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.83rem', color: C.text }}>{[u.first_name, u.last_name].filter(Boolean).join(' ')}</div>
                    <div style={{ fontSize: '0.72rem', color: C.muted, margin: '2px 0' }}>{u.email}{u.company ? ' · ' + u.company : ''}</div>
                    <div style={{ fontSize: '0.72rem', color: '#555' }}>
                      {[u.succession_type === 'mit_beteiligung' ? 'Mit Beteiligung' : u.succession_type === 'ohne_beteiligung' ? 'Ohne Beteiligung' : null,
                        (u.branchenfokus || [])[0], [...(u.ziel_laender || []), ...(u.ziel_regionen || [])][0], u.umsatz_band ? u.umsatz_band + ' Mio.' : null]
                        .filter(Boolean).join(' · ')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: 5 }}>
                      <span style={{ fontSize: '0.66rem', fontWeight: 600, color: u.has_profile ? '#166534' : '#92400e', background: u.has_profile ? '#d1fae5' : '#fef3c7', borderRadius: 20, padding: '0.05rem 0.45rem' }}>{u.has_profile ? 'Profil gepflegt' : 'Profil offen'}</span>
                      <button onClick={() => { setNoteEdit(u.id); setNoteText(u.succession_note || ''); }} title="Notiz" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: u.succession_note ? C.accent : C.muted, display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: '0.7rem' }}>
                        <StickyNote size={13} />{u.succession_note ? 'Notiz' : ''}
                      </button>
                    </div>

                    {noteEdit === u.id ? (
                      <div style={{ marginTop: 6 }}>
                        <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3} autoFocus
                          style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.75rem', border: `1px solid ${C.border}`, borderRadius: 6, padding: '0.4rem', resize: 'vertical' }} />
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: 4 }}>
                          <button onClick={() => saveNote(u.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: C.navy, color: '#fff', border: 'none', borderRadius: 5, padding: '0.25rem 0.6rem', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}><Check size={12} /> Speichern</button>
                          <button onClick={() => setNoteEdit(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#fff', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 5, padding: '0.25rem 0.6rem', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}><X size={12} /> Abbrechen</button>
                        </div>
                      </div>
                    ) : u.succession_note ? (
                      <div style={{ marginTop: 6, fontSize: '0.72rem', color: '#475569', background: C.bg, borderRadius: 6, padding: '0.35rem 0.5rem', whiteSpace: 'pre-wrap' }}>{u.succession_note}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: '0.76rem', color: C.muted, marginTop: '0.4rem' }}>Karten per Ziehen zwischen den Stufen verschieben. Die Notiz ist nur intern sichtbar.</div>
    </div>
  );
}
