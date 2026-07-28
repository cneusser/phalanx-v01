import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { Users } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', text: '#0F172A', muted: '#64748B' };
const STAGE_LABEL = {
  neu: 'Neu', profil: 'Profil vollständig', vorgestellt: 'Mandat vorgestellt',
  gespraech: 'Im Gespräch', vermittelt: 'Vermittelt', kein_match: 'Kein Match',
};
const STAGE_COLOR = {
  neu: '#64748B', profil: '#1D4E89', vorgestellt: '#0891b2',
  gespraech: '#d97706', vermittelt: '#166534', kein_match: '#991b1b',
};

// Nachfolge-Funnel im CRM: Interessierte pflegen und durch die Stufen führen.
export default function SuccessionFunnel() {
  const [data, setData] = useState({ list: [], overview: {}, stages: [] });
  const [filter, setFilter] = useState({ umsatz: '', szenario: '', q: '', stage: '' });

  const load = useCallback(() => {
    const p = new URLSearchParams();
    ['umsatz', 'szenario', 'q', 'stage'].forEach(k => { if (filter[k]) p.set(k, filter[k]); });
    const qs = p.toString();
    api.get('/succession/interested' + (qs ? '?' + qs : '')).then(setData).catch(() => setData({ list: [], overview: {}, stages: [] }));
  }, [filter]);

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  async function setStage(userId, stage) {
    try { await api.put(`/succession/interested/${userId}/stage`, { stage }); load(); } catch { /* ignore */ }
  }

  const stages = data.stages && data.stages.length ? data.stages : Object.keys(STAGE_LABEL);

  return (
    <div>
      {/* Trichter-Überblick: Anzahl je Stufe, klickbar als Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button onClick={() => setFilter(f => ({ ...f, stage: '' }))} style={chip(!filter.stage, C.navy)}>
          Alle <strong>{Object.values(data.overview || {}).reduce((a, b) => a + b, 0)}</strong>
        </button>
        {stages.map(st => (
          <button key={st} onClick={() => setFilter(f => ({ ...f, stage: f.stage === st ? '' : st }))} style={chip(filter.stage === st, STAGE_COLOR[st])}>
            {STAGE_LABEL[st] || st} <strong>{data.overview?.[st] || 0}</strong>
          </button>
        ))}
      </div>

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

      <div style={{ background: C.card, borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
          <thead><tr style={{ background: C.bg }}>
            {['Name', 'Interesse', 'Branchenfokus', 'Region', 'Umsatz', 'Profil', 'Funnel-Status'].map(h => <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontWeight: 600, color: C.navy, fontSize: '0.72rem' }}>{h.toUpperCase()}</th>)}
          </tr></thead>
          <tbody>
            {(data.list || []).length === 0 && <tr><td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: C.muted }}>Keine Nachfolge-Interessierten gefunden.</td></tr>}
            {(data.list || []).map(u => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '0.7rem 1rem', fontWeight: 600, color: C.text }}>{[u.first_name, u.last_name].filter(Boolean).join(' ')}<div style={{ fontSize: '0.72rem', color: C.muted, fontWeight: 400 }}>{u.email}{u.company ? ' · ' + u.company : ''}</div></td>
                <td style={{ padding: '0.7rem 1rem', color: '#555' }}>{u.succession_type === 'mit_beteiligung' ? 'Mit Beteiligung' : u.succession_type === 'ohne_beteiligung' ? 'Ohne Beteiligung' : 'k. A.'}</td>
                <td style={{ padding: '0.7rem 1rem', color: '#555' }}>{(u.branchenfokus || []).slice(0, 2).join(', ') || 'k. A.'}</td>
                <td style={{ padding: '0.7rem 1rem', color: '#555' }}>{[...(u.ziel_laender || []), ...(u.ziel_regionen || [])].slice(0, 2).join(', ') || 'k. A.'}</td>
                <td style={{ padding: '0.7rem 1rem', color: '#555' }}>{u.umsatz_band || 'k. A.'}</td>
                <td style={{ padding: '0.7rem 1rem' }}>{u.has_profile ? <span style={{ color: '#166534', fontWeight: 600, fontSize: '0.75rem' }}>gepflegt</span> : <span style={{ color: '#92400e', fontWeight: 600, fontSize: '0.75rem' }}>offen</span>}</td>
                <td style={{ padding: '0.7rem 1rem' }}>
                  <select value={u.succession_stage || 'neu'} onChange={e => setStage(u.id, e.target.value)}
                    style={{ padding: '0.3rem 0.5rem', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: '0.78rem', fontWeight: 600, color: STAGE_COLOR[u.succession_stage || 'neu'], background: '#fff' }}>
                    {stages.map(st => <option key={st} value={st}>{STAGE_LABEL[st] || st}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const chip = (active, color) => ({
  padding: '0.4rem 0.75rem', borderRadius: 20, cursor: 'pointer', fontSize: '0.8rem',
  border: `1.5px solid ${active ? (color || '#0D1B36') : '#DDE8F3'}`,
  background: active ? (color || '#0D1B36') : '#fff', color: active ? '#fff' : (color || '#0D1B36'), fontWeight: 600,
});
const sel = { padding: '0.5rem', border: '1px solid #DDE8F3', borderRadius: 6, fontSize: '0.82rem', background: '#fff' };
