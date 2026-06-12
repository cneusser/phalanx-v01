import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Lock, CheckCircle, Clock, FileText, MapPin, Building2, ChevronRight, AlertCircle, Download } from 'lucide-react';

const C = { navy: '#1B3A5C', gold: '#C8A97E', bg: '#F5F3EF' };

const statusMap = {
  requested: { label: 'NDA angefordert', icon: Clock, color: '#f59e0b', bg: '#fef3c7' },
  sent: { label: 'NDA versendet', icon: Clock, color: '#3b82f6', bg: '#dbeafe' },
  signed: { label: 'NDA unterschrieben – Prüfung ausstehend', icon: Clock, color: '#8b5cf6', bg: '#ede9fe' },
  approved: { label: 'Zugang freigeschaltet', icon: CheckCircle, color: '#10b981', bg: '#d1fae5' },
  rejected: { label: 'Zugang abgelehnt', icon: AlertCircle, color: '#ef4444', bg: '#fee2e2' },
};

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teaser, setTeaser] = useState(null);
  const [ndaStatus, setNdaStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadProject();
  }, [id]);

  async function loadProject() {
    try {
      const data = await api.get(`/projects/${id}/teaser`);
      setTeaser(data);
      if (user) {
        const ndaData = await api.get(`/ndas/${id}/status`);
        setNdaStatus(ndaData.status);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function requestNDA() {
    if (!user) return navigate('/registrieren');
    setRequesting(true);
    try {
      await api.post('/ndas', { project_id: parseInt(id) });
      setNdaStatus('requested');
    } catch (e) {
      if (e.message.includes('bereits')) setNdaStatus('requested');
      else setError(e.message);
    } finally {
      setRequesting(false);
    }
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>Wird geladen...</div>;
  if (error) return <div style={{ padding: '3rem', textAlign: 'center', color: '#c00' }}>{error}</div>;
  if (!teaser) return null;

  const approved = ndaStatus === 'approved';

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: '0.8rem', color: '#999', marginBottom: '1.5rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <Link to="/projekte" style={{ color: C.navy, textDecoration: 'none' }}>Transaktionen</Link>
        <span>›</span> <span>{teaser.codename}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
        {/* Main */}
        <div>
          <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e4dc', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h1 style={{ fontSize: '1.7rem', fontWeight: 700, color: C.navy, marginBottom: '0.25rem' }}>{teaser.codename}</h1>
                <div style={{ display: 'flex', gap: '1rem', color: '#666', fontSize: '0.85rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Building2 size={13} />{teaser.industry}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={13} />{teaser.region}</span>
                </div>
              </div>
              <span style={{ background: '#fef3e2', color: '#92400e', padding: '0.3rem 0.75rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600 }}>
                {teaser.deal_type}
              </span>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Umsatz', value: teaser.revenue_band },
                { label: 'EBITDA', value: teaser.ebitda_band },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: C.bg, borderRadius: 8, padding: '1rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#999', letterSpacing: '0.07em', marginBottom: '0.3rem' }}>{label.toUpperCase()}</div>
                  <div style={{ fontWeight: 700, color: C.navy, fontSize: '1.1rem' }}>{value}</div>
                </div>
              ))}
            </div>

            <p style={{ color: '#555', lineHeight: 1.7, marginBottom: '1.5rem' }}>{teaser.short_description}</p>

            {/* Highlights */}
            {teaser.highlights?.length > 0 && (
              <div>
                <h3 style={{ fontWeight: 600, color: C.navy, marginBottom: '0.75rem', fontSize: '0.95rem' }}>Investment Highlights</h3>
                {teaser.highlights.map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                    <CheckCircle size={15} color={C.gold} style={{ marginTop: 3, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.875rem', color: '#444', lineHeight: 1.5 }}>{h}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Locked section */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e4dc', position: 'relative', overflow: 'hidden' }}>
            <div style={{ opacity: approved ? 1 : 0.35, pointerEvents: approved ? 'auto' : 'none' }}>
              <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #eee', marginBottom: '1.5rem' }}>
                {['overview', 'financials', 'documents'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    padding: '0.5rem 1rem', border: 'none', background: 'transparent', cursor: 'pointer',
                    fontWeight: activeTab === tab ? 600 : 400, color: activeTab === tab ? C.navy : '#888',
                    borderBottom: activeTab === tab ? `2px solid ${C.navy}` : '2px solid transparent',
                    fontSize: '0.875rem',
                  }}>
                    {tab === 'overview' ? 'Übersicht' : tab === 'financials' ? 'Finanzen' : 'Dokumente'}
                  </button>
                ))}
              </div>
              <div style={{ minHeight: 120, color: '#666', fontSize: '0.875rem', lineHeight: 1.7 }}>
                {activeTab === 'overview' && <p>Ausführliche Unternehmensbeschreibung, Management-Profil, Marktposition und strategische Perspektiven.</p>}
                {activeTab === 'financials' && <p>Detaillierte Finanzkennzahlen, historische P&L, EBITDA-Entwicklung, Working Capital Analyse.</p>}
                {activeTab === 'documents' && (
                  <div>
                    {['Informationsmemorandum.pdf', 'Jahresabschluss_2023.pdf', 'BWA_2024.pdf'].map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem', background: C.bg, borderRadius: 6, marginBottom: '0.5rem' }}>
                        <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><FileText size={14} color={C.navy} />{f}</span>
                        <Download size={14} color={C.navy} style={{ cursor: 'pointer' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {!approved && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)', background: 'rgba(245,243,239,0.7)' }}>
                <Lock size={28} color={C.navy} style={{ marginBottom: '0.75rem' }} />
                <h3 style={{ fontWeight: 600, color: C.navy, marginBottom: '0.4rem' }}>Vertrauliche Informationen</h3>
                <p style={{ color: '#666', fontSize: '0.85rem', textAlign: 'center', maxWidth: 300, marginBottom: '1rem' }}>
                  {ndaStatus ? 'Nach Freigabe Ihrer NDA-Anfrage erhalten Sie vollen Zugang.' : 'Fordern Sie eine NDA an, um Zugang zu erhalten.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ position: 'sticky', top: 80 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e4dc' }}>
            <h3 style={{ fontWeight: 600, color: C.navy, marginBottom: '1rem', fontSize: '0.95rem' }}>Ihr Status</h3>

            {!user ? (
              <>
                <p style={{ color: '#666', fontSize: '0.83rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  Registrieren Sie sich, um eine NDA anzufordern und Zugang zu Detailinformationen zu erhalten.
                </p>
                <Link to="/registrieren" style={{ display: 'block', background: C.navy, color: '#fff', padding: '0.75rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem', textAlign: 'center', marginBottom: '0.75rem' }}>
                  Jetzt registrieren
                </Link>
                <Link to="/login" style={{ display: 'block', border: `1px solid ${C.navy}`, color: C.navy, padding: '0.65rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem', textAlign: 'center' }}>
                  Anmelden
                </Link>
              </>
            ) : ndaStatus ? (
              <>
                {(() => {
                  const s = statusMap[ndaStatus] || statusMap.requested;
                  const Icon = s.icon;
                  return (
                    <div style={{ background: s.bg, borderRadius: 8, padding: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                      <Icon size={16} color={s.color} />
                      <span style={{ fontSize: '0.82rem', color: '#333', fontWeight: 500 }}>{s.label}</span>
                    </div>
                  );
                })()}
                {ndaStatus === 'approved' && (
                  <Link to={`/projekte/${id}/details`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: C.navy, color: '#fff', padding: '0.75rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>
                    Vollständiges Profil <ChevronRight size={14} />
                  </Link>
                )}
              </>
            ) : (
              <>
                <p style={{ color: '#666', fontSize: '0.83rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  Fordern Sie eine Vertraulichkeitsvereinbarung (NDA) an, um Zugang zu Detailinformationen zu erhalten.
                </p>
                <button onClick={requestNDA} disabled={requesting} style={{
                  width: '100%', background: C.navy, color: '#fff', border: 'none',
                  padding: '0.75rem', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem',
                  cursor: requesting ? 'not-allowed' : 'pointer', opacity: requesting ? 0.7 : 1
                }}>
                  {requesting ? 'Wird angefordert...' : 'NDA anfordern'}
                </button>
              </>
            )}

            <div style={{ marginTop: '1.25rem', padding: '0.9rem', background: C.bg, borderRadius: 8 }}>
              <div style={{ fontSize: '0.75rem', color: '#666', lineHeight: 1.6 }}>
                <strong style={{ color: C.navy, display: 'block', marginBottom: '0.25rem' }}>Fragen zum Projekt?</strong>
                Kontaktieren Sie unser M&A-Team direkt unter <a href="mailto:deals@phalanx.de" style={{ color: C.navy }}>deals@phalanx.de</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
