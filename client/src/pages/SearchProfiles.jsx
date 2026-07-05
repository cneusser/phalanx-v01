import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Bookmark, Trash2, Bell, Search as SearchIcon } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', steel: '#29ABE2', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', text: '#0F172A', muted: '#64748B' };
const FREQ = [['instant', 'Sofort'], ['daily', 'Täglich'], ['weekly', 'Wöchentlich'], ['off', 'Aus']];

export default function SearchProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const load = () => { setLoading(true); api.get('/community/search-profiles').then(d => setProfiles(d || [])).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  async function setFreq(id, notify_frequency) {
    try { await api.put(`/community/search-profiles/${id}`, { notify_frequency }); setProfiles(p => p.map(x => x.id === id ? { ...x, notify_frequency } : x)); }
    catch (e) { setMsg('Fehler: ' + e.message); }
  }
  async function del(id) {
    if (!window.confirm('Suchprofil löschen?')) return;
    try { await api.delete(`/community/search-profiles/${id}`); load(); } catch (e) { setMsg('Fehler: ' + e.message); }
  }
  function openMatches(c) {
    const q = new URLSearchParams();
    ['industry', 'region', 'deal_type', 'mandate_type', 'search'].forEach(k => { if (c[k]) q.set(k, c[k]); });
    navigate(`/projekte?${q.toString()}`);
  }
  const critLabel = (c) => [c.mandate_type === 'fundraising' ? 'Startup' : c.mandate_type === 'ma' ? 'M&A' : null, c.industry, c.region, c.deal_type, c.search ? `„${c.search}"` : null].filter(Boolean).join(' · ') || 'Alle Mandate';

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <div style={{ background: C.navy, color: '#fff', padding: '2rem 1.5rem' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.55rem' }}><Bookmark size={20} /> Meine Suchprofile</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.88rem', marginTop: 4 }}>Gespeicherte Suchen — Sie werden benachrichtigt, sobald ein passendes Mandat verfügbar ist.</p>
        </div>
      </div>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '1.75rem 1.5rem 4rem' }}>
        {msg && <div style={{ background: '#fee2e2', borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#991b1b' }}>{msg}</div>}
        {loading ? <div style={{ padding: '3rem', textAlign: 'center', color: C.muted }}>Wird geladen…</div>
          : profiles.length === 0 ? (
            <div style={{ background: C.card, border: `1px dashed ${C.border}`, borderRadius: 12, padding: '2.5rem', textAlign: 'center', color: C.muted }}>
              Noch keine Suchprofile. Legen Sie im <Link to="/projekte" style={{ color: C.accent, fontWeight: 600 }}>Marktplatz</Link> über „Suche speichern" ein Profil an.
            </div>
          ) : profiles.map(p => (
            <div key={p.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1.1rem 1.25rem', marginBottom: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: '0.95rem' }}>{p.name}</div>
                  <div style={{ fontSize: '0.8rem', color: C.muted, marginTop: 2 }}>{critLabel(p.criteria || {})}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button onClick={() => openMatches(p.criteria || {})} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: C.navy, color: '#fff', border: 'none', borderRadius: 7, padding: '0.4rem 0.8rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}><SearchIcon size={13} /> Treffer</button>
                  <button onClick={() => del(p.id)} style={{ background: '#fff', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 7, padding: '0.4rem 0.6rem', cursor: 'pointer' }}><Trash2 size={14} /></button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.74rem', color: C.muted }}><Bell size={13} /> Benachrichtigung:</span>
                {FREQ.map(([k, l]) => (
                  <button key={k} onClick={() => setFreq(p.id, k)} style={{ padding: '0.25rem 0.6rem', borderRadius: 20, fontSize: '0.72rem', cursor: 'pointer', border: `1.5px solid ${p.notify_frequency === k ? C.accent : C.border}`, background: p.notify_frequency === k ? '#eff6ff' : '#fff', color: p.notify_frequency === k ? C.accent : C.muted, fontWeight: p.notify_frequency === k ? 700 : 400 }}>{l}</button>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
