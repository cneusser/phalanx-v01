import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Star, Trash2, Tag } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', steel: '#29ABE2', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', text: '#0F172A', muted: '#64748B' };

export default function Watchlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({}); // id → {tags, note}
  const [msg, setMsg] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const navigate = useNavigate();

  const load = () => { setLoading(true); api.get('/community/watchlist').then(d => { setItems(d || []); const dr = {}; (d || []).forEach(w => dr[w.project_id] = { tags: (w.tags || []).join(', '), note: w.note || '' }); setDrafts(dr); }).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  async function save(pid) {
    const d = drafts[pid] || {};
    try {
      await api.put(`/community/watchlist/${pid}`, { tags: (d.tags || '').split(',').map(s => s.trim()).filter(Boolean), note: d.note || '' });
      setMsg('Gespeichert.'); setTimeout(() => setMsg(''), 2500); load();
    } catch (e) { setMsg('Fehler: ' + e.message); }
  }
  async function remove(pid) {
    try { await api.delete(`/community/watchlist/${pid}`); setItems(i => i.filter(x => x.project_id !== pid)); } catch (e) { setMsg('Fehler: ' + e.message); }
  }

  const allTags = [...new Set(items.flatMap(w => w.tags || []))].sort();
  const shown = tagFilter ? items.filter(w => (w.tags || []).includes(tagFilter)) : items;

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <div style={{ background: C.navy, color: '#fff', padding: '2rem 1.5rem' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.55rem' }}><Star size={20} /> Merkliste</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.88rem', marginTop: 4 }}>Ihre gemerkten Mandate: mit eigenen Tags und Notizen.</p>
        </div>
      </div>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.75rem 1.5rem 4rem' }}>
        {msg && <div style={{ background: msg.startsWith('Fehler') ? '#fee2e2' : '#d1fae5', borderRadius: 8, padding: '0.55rem 0.9rem', marginBottom: '1rem', fontSize: '0.82rem', color: msg.startsWith('Fehler') ? '#991b1b' : '#065f46' }}>{msg}</div>}
        {allTags.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.74rem', color: C.muted, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Tag size={12} /> Filter:</span>
            <button onClick={() => setTagFilter('')} style={chip(tagFilter === '')}>Alle</button>
            {allTags.map(t => <button key={t} onClick={() => setTagFilter(t)} style={chip(tagFilter === t)}>{t}</button>)}
          </div>
        )}
        {loading ? <div style={{ padding: '3rem', textAlign: 'center', color: C.muted }}>Wird geladen…</div>
          : shown.length === 0 ? (
            <div style={{ background: C.card, border: `1px dashed ${C.border}`, borderRadius: 12, padding: '2.5rem', textAlign: 'center', color: C.muted }}>
              Noch keine gemerkten Mandate. Im <Link to="/projekte" style={{ color: C.accent, fontWeight: 600 }}>Marktplatz</Link> auf den Stern ☆ klicken.
            </div>
          ) : shown.map(w => (
            <div key={w.project_id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1.1rem 1.25rem', marginBottom: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/projekte/${w.project_id}`)}>
                  <div style={{ fontWeight: 700, color: C.navy, fontSize: '0.98rem' }}>{w.codename} <span style={{ fontSize: '0.66rem', fontWeight: 700, background: w.mandate_type === 'fundraising' ? '#ede9fe' : C.bg, color: w.mandate_type === 'fundraising' ? '#5b21b6' : C.navy, padding: '0.1rem 0.45rem', borderRadius: 6 }}>{w.mandate_type === 'fundraising' ? 'Startup' : 'M&A'}</span></div>
                  <div style={{ fontSize: '0.8rem', color: C.muted, marginTop: 2 }}>{[w.industry, w.region, w.revenue_band && w.revenue_band !== 'k. A.' ? 'Umsatz ' + w.revenue_band : null, w.deal_type].filter(Boolean).join(' · ')}</div>
                </div>
                <button onClick={() => remove(w.project_id)} style={{ background: '#fff', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 7, padding: '0.4rem 0.6rem', cursor: 'pointer' }}><Trash2 size={14} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr auto', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
                <input value={drafts[w.project_id]?.tags || ''} onChange={e => setDrafts(s => ({ ...s, [w.project_id]: { ...s[w.project_id], tags: e.target.value } }))} placeholder="Tags (Komma-getrennt)" style={inp} />
                <input value={drafts[w.project_id]?.note || ''} onChange={e => setDrafts(s => ({ ...s, [w.project_id]: { ...s[w.project_id], note: e.target.value } }))} placeholder="Notiz…" style={inp} />
                <button onClick={() => save(w.project_id)} style={{ padding: '0.5rem 1rem', background: C.navy, color: '#fff', border: 'none', borderRadius: 7, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Speichern</button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

const inp = { padding: '0.5rem 0.7rem', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box' };
const chip = (active) => ({ padding: '0.25rem 0.7rem', borderRadius: 20, fontSize: '0.74rem', cursor: 'pointer', border: `1.5px solid ${active ? C.accent : C.border}`, background: active ? '#eff6ff' : '#fff', color: active ? C.accent : C.muted, fontWeight: active ? 700 : 400 });
