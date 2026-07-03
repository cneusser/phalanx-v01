import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Search, Filter, Building2, MapPin, ChevronRight, Lock,
  CheckCircle, Clock, TrendingUp, Euro, Percent, BarChart3,
  Briefcase, ArrowUpRight,
} from 'lucide-react';

const C = {
  navy:    '#0D1B36',
  accent:  '#1D4E89',
  steel:   '#8AB4D4',
  bg:      '#F8FAFC',
  card:    '#FFFFFF',
  border:  '#E2E8F0',
  text:    '#0F172A',
  muted:   '#64748B',
  green:   '#10b981',
  amber:   '#f59e0b',
  purple:  '#8b5cf6',
  blue:    '#3b82f6',
};

const stageBadge = {
  'Seed':         { bg: '#fef3c7', color: '#92400e' },
  'Angel Round':  { bg: '#ede9fe', color: '#5b21b6' },
  'Series A':     { bg: '#dbeafe', color: '#1e40af' },
  'Series B':     { bg: '#dcfce7', color: '#166534' },
  'Pre-Seed':     { bg: '#fce7f3', color: '#9d174d' },
  'Nachfolge':    { bg: '#EDF4FA', color: C.navy },
  'MBO':          { bg: '#f3e8ff', color: '#6d28d9' },
  'MBI':          { bg: '#e8f0ff', color: '#1e40af' },
  'Wachstumskapital': { bg: '#dcfce7', color: '#166534' },
  'Buy-and-Build':    { bg: '#fce4ec', color: '#9d174d' },
  'Strategische Partnerschaft': { bg: '#e0f7fa', color: '#006064' },
  'default':      { bg: '#f1f5f9', color: '#334155' },
};

function StageBadge({ label }) {
  const s = stageBadge[label] || stageBadge.default;
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '0.2rem 0.55rem', borderRadius: 6,
      fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

const ndaStatusLabel = {
  requested: { label: 'NDA angefordert', color: C.amber, bg: '#fef3c7', icon: Clock },
  sent:      { label: 'NDA versendet',   color: C.blue,  bg: '#dbeafe', icon: Clock },
  signed:    { label: 'NDA unterzeichnet', color: C.purple, bg: '#ede9fe', icon: CheckCircle },
  approved:  { label: 'Zugang freigeschaltet', color: C.green, bg: '#d1fae5', icon: CheckCircle },
  rejected:  { label: 'Abgelehnt',       color: '#ef4444', bg: '#fee2e2', icon: null },
};

// Initialen-Kreis aus den ersten 2 Buchstaben des Codenamens
function InitialsAvatar({ name }) {
  const words = name ? name.trim().split(/\s+/) : [];
  let initials = '';
  if (words.length >= 2) {
    initials = (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1) {
    initials = words[0].substring(0, 2).toUpperCase();
  }

  // Deterministisch eine Farbe aus dem Namen ableiten
  const hue = name
    ? name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
    : 200;

  return (
    <div style={{
      width: 44, height: 44, borderRadius: 6,
      background: `hsl(${hue}, 45%, 88%)`,
      border: `1px solid hsl(${hue}, 35%, 78%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: `hsl(${hue}, 45%, 25%)` }}>
        {initials || <Briefcase size={16} />}
      </span>
    </div>
  );
}

function MetricBox({ label, value }) {
  return (
    <div style={{
      background: C.bg, borderRadius: 6, padding: '0.5rem 0.6rem', flex: 1,
      border: `1px solid ${C.border}`,
    }}>
      <div style={{ fontSize: '0.59rem', color: C.muted, fontWeight: 700, letterSpacing: '0.07em', marginBottom: '0.15rem' }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: C.text, lineHeight: 1.2 }}>{value || '—'}</div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem', color: C.muted }}>
      <div style={{
        width: 36, height: 36, margin: '0 auto 1rem',
        border: `3px solid ${C.border}`,
        borderTop: `3px solid ${C.navy}`,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ fontSize: '0.875rem' }}>Mandate werden geladen...</div>
    </div>
  );
}

function MandateCard({ p, ndaStatus, onNdaRequest, ndaLoading, isAdmin }) {
  const isStartup = p.mandate_type === 'fundraising';
  const statusInfo = ndaStatus ? ndaStatusLabel[ndaStatus] : null;

  return (
    <div style={{
      background: C.card, borderRadius: 6, padding: '1.4rem',
      border: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column',
      transition: 'box-shadow 0.18s, transform 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(13,27,54,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Obere Leiste: Typ-Tag links, Status rechts */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <span style={{
          background: isStartup ? '#EDE9FE' : '#EDF4FA',
          color: isStartup ? '#5B21B6' : C.navy,
          padding: '0.18rem 0.5rem', borderRadius: 6,
          fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em',
        }}>
          {isStartup ? 'Fundraising' : 'M&A'}
        </span>
        <StageBadge label={p.stage || p.deal_type} />
      </div>

      {/* Codename + Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.6rem' }}>
        <InitialsAvatar name={p.codename} />
        <div style={{ minWidth: 0 }}>
          <h3 style={{
            fontWeight: 700, color: C.text, fontSize: '0.97rem',
            margin: 0, lineHeight: 1.3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{p.codename}</h3>
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
            {p.industry && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.71rem', color: C.muted }}>
                <Building2 size={10} /> {p.industry}
              </span>
            )}
            {(p.location_city || p.region) && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.71rem', color: C.muted }}>
                <MapPin size={10} /> {p.location_city || p.region}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Kurzbeschreibung */}
      <p style={{
        fontSize: '0.81rem', color: '#444', lineHeight: 1.55,
        marginBottom: '0.9rem', flex: 1,
        display: '-webkit-box', WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {p.short_description}
      </p>

      {/* Metriken */}
      {isStartup ? (
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.85rem' }}>
          <MetricBox label="RUNDE" value={p.investment_needed} />
          <MetricBox label="STAKE" value={p.equity_stake} />
          <MetricBox label="POST-MONEY" value={p.post_money_valuation} />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.85rem' }}>
          <MetricBox label="UMSATZ" value={p.revenue_band} />
          <MetricBox label="EBITDA" value={p.ebitda_band} />
        </div>
      )}

      {/* NDA-Status Badge */}
      {statusInfo && (
        <div style={{
          background: statusInfo.bg, color: statusInfo.color,
          padding: '0.3rem 0.75rem', borderRadius: 6,
          fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.75rem', textAlign: 'center',
        }}>
          {statusInfo.label}
        </div>
      )}

      {/* Aktion */}
      <Link to={`/projekte/${p.id}`} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
        background: C.navy, color: '#fff',
        padding: '0.6rem', borderRadius: 6,
        textDecoration: 'none', fontSize: '0.81rem', fontWeight: 600,
        marginTop: 'auto',
      }}>
        {ndaStatus === 'approved' ? 'Mandat öffnen' : 'Details ansehen'} <ChevronRight size={13} />
      </Link>
    </div>
  );
}

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({ industries: [], regions: [], deal_types: [], stages: [] });
  // Initiale Filter aus der URL übernehmen (Live-Filter über klickbare Tags,
  // z. B. /projekte?industry=Food%20%26%20Nutrition)
  const urlParams = new URLSearchParams(location.search);
  const [sel, setSel] = useState({
    industry:     urlParams.get('industry')     || '',
    region:       urlParams.get('region')       || '',
    deal_type:    urlParams.get('deal_type')    || '',
    search:       urlParams.get('search')       || '',
    mandate_type: urlParams.get('mandate_type') || '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ndaStatus, setNdaStatus] = useState({});
  const [ndaLoading, setNdaLoading] = useState({});
  // Gesamtzahlen kommen vom Server (/projects/stats) — unabhängig vom aktiven
  // Tab und von Filtern. null = lädt noch; 0 wird korrekt als 0 angezeigt.
  const [totalCounts, setTotalCounts] = useState({ all: null, ma: null, fundraising: null });

  useEffect(() => { loadProjects(); }, [sel]);

  useEffect(() => {
    api.get('/projects/stats')
      .then(s => setTotalCounts({
        all: s.total_active ?? 0,
        ma: s.ma?.active ?? 0,
        fundraising: s.fundraising?.active ?? 0,
      }))
      .catch(() => {});
  }, []);

  async function loadProjects() {
    try {
      const params = new URLSearchParams();
      if (sel.industry)      params.set('industry', sel.industry);
      if (sel.region)        params.set('region', sel.region);
      if (sel.deal_type)     params.set('deal_type', sel.deal_type);
      if (sel.search)        params.set('search', sel.search);
      if (sel.mandate_type)  params.set('mandate_type', sel.mandate_type);
      const data = await api.get(`/projects?${params.toString()}`);
      setProjects(data.projects);
      if (!sel.industry && !sel.region && !sel.deal_type) setFilters(data.filters);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user || ['super_admin', 'advisor'].includes(user.role)) return;
    api.get('/ndas').then(data => {
      const map = {};
      (data || []).forEach(n => { map[n.project_id] = n.status; });
      setNdaStatus(map);
    }).catch(() => {});
  }, [user, projects]);

  async function handleNdaRequest(projectId) {
    if (!user) { navigate('/registrieren'); return; }
    setNdaLoading(prev => ({ ...prev, [projectId]: true }));
    try {
      await api.post('/ndas', { project_id: projectId });
      setNdaStatus(prev => ({ ...prev, [projectId]: 'requested' }));
    } catch (e) {
      if (e.message?.includes('bereits')) {
        const s = await api.get(`/ndas/${projectId}/status`);
        setNdaStatus(prev => ({ ...prev, [projectId]: s.status }));
      }
    } finally {
      setNdaLoading(prev => ({ ...prev, [projectId]: false }));
    }
  }

  const select = (k, v) => setSel(prev => ({ ...prev, [k]: prev[k] === v ? '' : v }));
  const isAdmin = user && ['super_admin', 'advisor'].includes(user.role);

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      {/* Hero Banner — solides Navy */}
      <div style={{ background: C.navy, padding: '3rem 1.5rem 2.5rem', color: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ fontSize: '0.72rem', color: C.steel, letterSpacing: '0.1em', fontWeight: 600, marginBottom: '0.65rem' }}>
            PHALANX MARKTPLATZ
          </div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 700, marginBottom: '0.6rem', lineHeight: 1.2 }}>
            Transaktionsmandate
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.68)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: 520 }}>
            Anonymisierte M&A-Transaktionen und Startup-Finanzierungen — strukturiert, vertraulich, professionell begleitet.
          </p>

          {/* Filter-Buttons — always show global counts, not just filtered counts */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { key: '', label: totalCounts.all === null ? 'Alle (…)' : `Alle (${totalCounts.all})` },
              { key: 'ma', label: totalCounts.ma === null ? 'M&A (…)' : `M&A (${totalCounts.ma})` },
              { key: 'fundraising', label: totalCounts.fundraising === null ? 'Fundraising (…)' : `Fundraising (${totalCounts.fundraising})` },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setSel(prev => ({ ...prev, mandate_type: key }))} style={{
                padding: '0.4rem 1rem', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600,
                cursor: 'pointer',
                background: sel.mandate_type === key ? C.steel : 'transparent',
                color:      sel.mandate_type === key ? C.navy  : 'rgba(255,255,255,0.8)',
                border:     sel.mandate_type === key ? 'none'  : '1px solid rgba(255,255,255,0.3)',
              }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '2rem', alignItems: 'start' }}>

          {/* Sidebar */}
          <aside style={{
            background: C.card, borderRadius: 6, padding: '1.25rem',
            border: `1px solid ${C.border}`,
            position: 'sticky', top: 80,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', color: C.text, fontWeight: 600, fontSize: '0.85rem' }}>
              <Filter size={14} /> Filter
            </div>

            {/* Suche */}
            <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#bbb' }} />
              <input
                placeholder="Suche..."
                value={sel.search}
                onChange={e => setSel(prev => ({ ...prev, search: e.target.value }))}
                style={{
                  width: '100%', padding: '0.45rem 0.5rem 0.45rem 1.9rem',
                  border: `1px solid ${C.border}`, borderRadius: 6, fontSize: '0.8rem',
                  outline: 'none', boxSizing: 'border-box', background: C.bg,
                }}
              />
            </div>

            {[
              { label: 'Branche',   key: 'industry',  items: filters.industries },
              { label: 'Region',    key: 'region',    items: filters.regions },
              { label: 'Deal-Typ',  key: 'deal_type', items: filters.deal_types },
            ].map(({ label, key, items }) => items.length > 0 && (
              <div key={key} style={{ marginBottom: '1.1rem' }}>
                <div style={{ fontSize: '0.66rem', fontWeight: 700, color: C.muted, letterSpacing: '0.09em', marginBottom: '0.4rem' }}>
                  {label.toUpperCase()}
                </div>
                {items.map(item => (
                  <button key={item} onClick={() => select(key, item)} style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '0.35rem 0.55rem', border: 'none', borderRadius: 5,
                    cursor: 'pointer', marginBottom: '0.15rem', fontSize: '0.77rem',
                    background: sel[key] === item ? `${C.navy}12` : 'transparent',
                    color:      sel[key] === item ? C.navy         : '#555',
                    fontWeight: sel[key] === item ? 600            : 400,
                  }}>
                    {item}
                  </button>
                ))}
              </div>
            ))}

            {(sel.industry || sel.region || sel.deal_type || sel.search) && (
              <button
                onClick={() => setSel({ industry: '', region: '', deal_type: '', search: '', mandate_type: sel.mandate_type })}
                style={{
                  width: '100%', padding: '0.45rem', border: `1px solid ${C.border}`,
                  borderRadius: 6, cursor: 'pointer', fontSize: '0.77rem',
                  color: C.navy, background: 'transparent', marginTop: '0.25rem',
                }}
              >
                Filter zurücksetzen
              </button>
            )}
          </aside>

          {/* Projektraster */}
          <div>
            {loading ? (
              <LoadingSpinner />
            ) : error ? (
              <div style={{ padding: '2rem', background: '#fee', borderRadius: 6, color: '#c00', fontSize: '0.85rem', border: '1px solid #fca5a5' }}>{error}</div>
            ) : projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>
                <Briefcase size={32} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.9rem' }}>Keine Mandate für diese Filterauswahl.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '0.82rem', color: C.muted }}>
                    {projects.length} Mandat{projects.length !== 1 ? 'e' : ''} gefunden
                  </span>
                  {!user && (
                    <Link to="/registrieren" style={{
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                      fontSize: '0.8rem', color: C.navy, fontWeight: 600,
                      textDecoration: 'none',
                    }}>
                      <ArrowUpRight size={13} /> Jetzt registrieren & NDA anfordern
                    </Link>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                  {projects.map(p => (
                    <MandateCard
                      key={p.id}
                      p={p}
                      ndaStatus={ndaStatus[p.id]}
                      onNdaRequest={handleNdaRequest}
                      ndaLoading={!!ndaLoading[p.id]}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>

                {/* CTA für nicht-registrierte */}
                {!user && (
                  <div style={{
                    marginTop: '2.5rem', background: C.navy,
                    borderRadius: 6, padding: '2rem', color: '#fff', textAlign: 'center',
                    border: `1px solid ${C.accent}`,
                  }}>
                    <Lock size={24} color={C.steel} style={{ marginBottom: '0.75rem' }} />
                    <h3 style={{ fontWeight: 700, marginBottom: '0.4rem', fontSize: '1.05rem' }}>
                      Detailinformationen & CIM nach Registrierung
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                      Kostenlos registrieren, NDA anfordern und vollständige Unterlagen erhalten.
                    </p>
                    <Link to="/registrieren" style={{
                      background: C.steel, color: C.navy,
                      padding: '0.65rem 1.75rem', borderRadius: 6,
                      fontWeight: 700, textDecoration: 'none', fontSize: '0.875rem',
                      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    }}>
                      Kostenlos registrieren <ArrowUpRight size={14} />
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
