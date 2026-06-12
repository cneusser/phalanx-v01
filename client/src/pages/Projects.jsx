import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Search, Filter, Building2, MapPin, TrendingUp, Tag, ChevronRight, Lock } from 'lucide-react';

const C = { navy: '#1B3A5C', gold: '#C8A97E', bg: '#F5F3EF' };

const badge = (text, bg = '#e8f0f8', color = C.navy) => (
  <span style={{ background: bg, color, padding: '0.2rem 0.65rem', borderRadius: 20, fontSize: '0.72rem', fontWeight: 500 }}>{text}</span>
);

const dealTypeBg = { 'Nachfolge': '#fef3e2', 'Wachstumskapital': '#e8f5e9', 'MBO': '#f3e8ff', 'MBI': '#e8f0ff', 'Buy-and-Build': '#fce4ec', 'Strategische Partnerschaft': '#e0f7fa' };

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({ industries: [], regions: [], deal_types: [] });
  const [sel, setSel] = useState({ industry: '', region: '', deal_type: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProjects();
  }, [sel]);

  async function loadProjects() {
    try {
      const params = new URLSearchParams();
      if (sel.industry) params.set('industry', sel.industry);
      if (sel.region) params.set('region', sel.region);
      if (sel.deal_type) params.set('deal_type', sel.deal_type);
      if (sel.search) params.set('search', sel.search);
      const data = await api.get(`/projects?${params.toString()}`);
      setProjects(data.projects);
      if (!sel.industry && !sel.region && !sel.deal_type) setFilters(data.filters);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const select = (k, v) => setSel(prev => ({ ...prev, [k]: prev[k] === v ? '' : v }));

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 700, color: C.navy, marginBottom: '0.4rem' }}>Transaktionsmandate</h1>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>Alle Projekte sind anonymisiert. Detailinformationen erhalten Sie nach Registrierung und NDA-Freigabe.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Sidebar Filters */}
        <aside style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e4dc', position: 'sticky', top: 80 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: C.navy, fontWeight: 600 }}>
            <Filter size={16} /> Filter
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
            <input
              placeholder="Suche..."
              value={sel.search}
              onChange={e => setSel(prev => ({ ...prev, search: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.85rem', outline: 'none' }}
            />
          </div>

          {[
            { label: 'Branche', key: 'industry', items: filters.industries },
            { label: 'Region', key: 'region', items: filters.regions },
            { label: 'Deal-Typ', key: 'deal_type', items: filters.deal_types },
          ].map(({ label, key, items }) => (
            <div key={key} style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#999', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>{label.toUpperCase()}</div>
              {items.map(item => (
                <button key={item} onClick={() => select(key, item)} style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '0.4rem 0.6rem', border: 'none',
                  borderRadius: 6, cursor: 'pointer', marginBottom: '0.2rem', fontSize: '0.8rem',
                  background: sel[key] === item ? `${C.navy}12` : 'transparent',
                  color: sel[key] === item ? C.navy : '#555',
                  fontWeight: sel[key] === item ? 600 : 400,
                }}>
                  {item}
                </button>
              ))}
            </div>
          ))}

          {(sel.industry || sel.region || sel.deal_type || sel.search) && (
            <button onClick={() => setSel({ industry: '', region: '', deal_type: '', search: '' })} style={{
              width: '100%', padding: '0.5rem', border: `1px solid ${C.navy}30`, borderRadius: 6,
              cursor: 'pointer', fontSize: '0.8rem', color: C.navy, background: 'transparent', marginTop: '0.5rem'
            }}>
              Filter zurücksetzen
            </button>
          )}
        </aside>

        {/* Project Grid */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Projekte werden geladen...</div>
          ) : error ? (
            <div style={{ padding: '2rem', background: '#fee', borderRadius: 8, color: '#c00' }}>{error}</div>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Keine Projekte gefunden.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {projects.map(p => (
                <div key={p.id} style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e4dc', transition: 'box-shadow 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontWeight: 700, color: C.navy, fontSize: '1rem' }}>{p.codename}</h3>
                    {badge(p.deal_type, dealTypeBg[p.deal_type] || '#f0f0f0', '#333')}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', color: '#555' }}>
                      <Building2 size={12} /> {p.industry}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', color: '#555' }}>
                      <MapPin size={12} /> {p.region}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.83rem', color: '#555', lineHeight: 1.5, marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.short_description}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div style={{ background: C.bg, borderRadius: 6, padding: '0.5rem 0.75rem' }}>
                      <div style={{ fontSize: '0.68rem', color: '#999', marginBottom: '0.1rem' }}>UMSATZ</div>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: C.navy }}>{p.revenue_band}</div>
                    </div>
                    <div style={{ background: C.bg, borderRadius: 6, padding: '0.5rem 0.75rem' }}>
                      <div style={{ fontSize: '0.68rem', color: '#999', marginBottom: '0.1rem' }}>EBITDA</div>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: C.navy }}>{p.ebitda_band}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Link to={`/projekte/${p.id}`} style={{
                      flex: 1, background: C.navy, color: '#fff', padding: '0.55rem', borderRadius: 6,
                      textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600, textAlign: 'center',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem'
                    }}>
                      Teaser ansehen <ChevronRight size={14} />
                    </Link>
                    <Link to="/registrieren" style={{
                      flex: 1, background: 'transparent', border: `1px solid ${C.gold}`, color: C.navy,
                      padding: '0.55rem', borderRadius: 6, textDecoration: 'none', fontSize: '0.82rem',
                      fontWeight: 600, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem'
                    }}>
                      <Lock size={13} /> NDA anfordern
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
