import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import NDASignModal from '../components/NDASignModal';
import {
  Lock, CheckCircle, Clock, FileText, MapPin, Building2,
  ChevronRight, AlertCircle, Download, PenLine, TrendingUp,
  Users, Calendar, Shield, Euro, Percent, BarChart3,
  Target, Briefcase, Globe, Lightbulb, PieChart, Phone, Mail,
} from 'lucide-react';

const C = {
  navy:   '#0D1B36',
  accent: '#1D4E89',
  steel:  '#8AB4D4',
  bg:     '#F8FAFC',
  card:   '#FFFFFF',
  border: '#E2E8F0',
  text:   '#0F172A',
  muted:  '#64748B',
};

const statusMap = {
  requested: { label: 'NDA angefordert - Prüfung ausstehend', icon: Clock,       color: '#f59e0b', bg: '#fef3c7' },
  sent:      { label: 'NDA versendet - bitte unterschreiben', icon: PenLine,      color: '#3b82f6', bg: '#dbeafe' },
  signed:    { label: 'NDA unterschrieben - Freigabe ausstehend', icon: Clock,    color: '#8b5cf6', bg: '#ede9fe' },
  approved:  { label: 'Zugang freigeschaltet',                icon: CheckCircle,  color: '#10b981', bg: '#d1fae5' },
  rejected:  { label: 'Zugang abgelehnt',                    icon: AlertCircle,  color: '#ef4444', bg: '#fee2e2' },
};

const fmt = (v) => v != null ? `${v.toLocaleString('de-DE')} Mio. €` : '—';

function KpiCard({ label, value, icon: Icon }) {
  return (
    <div style={{ background: C.bg, borderRadius: 6, padding: '0.9rem 1rem', border: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.3rem' }}>
        {Icon && <Icon size={12} color={C.muted} />}
        <span style={{ fontSize: '0.64rem', color: C.muted, letterSpacing: '0.08em', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontWeight: 700, color: C.text, fontSize: '1rem', lineHeight: 1.2 }}>{value || '—'}</div>
    </div>
  );
}

// Alle Tabs — immer gleich für beide Mandate-Typen
const ALL_TABS = [
  ['overview',  'Überblick'],
  ['company',   'Unternehmen'],
  ['market',    'Markt & Potenzial'],
  ['financials','Finanzen'],
  ['documents', 'Dokumente'],
  ['contact',   'Kontakt'],
];

// Tabs die immer zugänglich sind (ohne NDA)
const PUBLIC_TABS = ['overview', 'contact'];

function LockedTabPlaceholder({ onRequestNDA, user, ndaStatus, navigate }) {
  return (
    <div style={{
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 6,
      padding: '2.5rem 2rem',
      textAlign: 'center',
    }}>
      <div style={{
        width: 48, height: 48, background: `${C.navy}0d`,
        borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 1rem',
      }}>
        <Lock size={22} color={C.navy} />
      </div>
      <h3 style={{ fontWeight: 700, color: C.text, marginBottom: '0.5rem', fontSize: '1rem' }}>
        NDA erforderlich
      </h3>
      <p style={{ color: C.muted, fontSize: '0.83rem', lineHeight: 1.6, marginBottom: '1.25rem', maxWidth: 280, margin: '0 auto 1.25rem' }}>
        {!user
          ? 'Registrieren Sie sich, um Zugang zu vertraulichen Informationen anzufordern.'
          : ndaStatus
            ? 'Ihr NDA wird geprüft. Nach Freigabe erhalten Sie vollständigen Zugang.'
            : 'Fordern Sie eine NDA an, um Zugang zu diesen Informationen zu erhalten.'}
      </p>
      {!user ? (
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <Link to="/registrieren" style={{ background: C.navy, color: '#fff', padding: '0.6rem 1.25rem', borderRadius: 6, textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
            Registrieren
          </Link>
          <Link to="/login" style={{ background: 'transparent', border: `1px solid ${C.navy}`, color: C.navy, padding: '0.6rem 1.25rem', borderRadius: 6, textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
            Anmelden
          </Link>
        </div>
      ) : !ndaStatus ? (
        <button onClick={onRequestNDA} style={{ background: C.navy, color: '#fff', border: 'none', padding: '0.65rem 1.5rem', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
          NDA anfordern
        </button>
      ) : null}
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teaser, setTeaser] = useState(null);
  const [fullData, setFullData] = useState(null);
  const [ndaStatus, setNdaStatus] = useState(null);
  const [ndaId, setNdaId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [showNDAModal, setShowNDAModal] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [publicDocs, setPublicDocs] = useState([]);

  const isAdmin = user && ['super_admin', 'advisor'].includes(user.role);
  const isStartup = teaser?.mandate_type === 'fundraising';

  useEffect(() => { loadProject(); }, [id, user]);

  async function loadProject() {
    setLoading(true);
    try {
      const teaserData = await api.get(`/projects/${id}/teaser`);
      setTeaser(teaserData);
      // Öffentliche Dokumente laden
      try {
        const docs = await api.get(`/documents/${id}`);
        setPublicDocs((docs || []).filter(d => d.access_level === 'public'));
      } catch { /* ignore */ }

      if (user) {
        if (isAdmin) {
          try {
            const full = await api.get(`/projects/${id}`);
            setFullData(full); setNdaStatus('admin');
          } catch { /* ignore */ }
        } else {
          const ndaData = await api.get(`/ndas/${id}/status`);
          setNdaStatus(ndaData.status);
          if (ndaData.id) setNdaId(ndaData.id);
          if (ndaData.status === 'approved') {
            try { const full = await api.get(`/projects/${id}`); setFullData(full); } catch { /* ignore */ }
          }
        }
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
      const result = await api.post('/ndas', { project_id: parseInt(id) });
      setNdaStatus('requested');
      if (result.id) setNdaId(result.id);
    } catch (e) {
      if (e.message?.includes('bereits')) setNdaStatus('requested');
      else setError(e.message);
    } finally {
      setRequesting(false);
    }
  }

  if (loading) return (
    <div style={{ padding: '4rem', textAlign: 'center', color: C.muted }}>
      <div style={{ width: 36, height: 36, margin: '0 auto 1rem', border: `3px solid ${C.border}`, borderTop: `3px solid ${C.navy}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ fontSize: '0.875rem' }}>Mandat wird geladen...</div>
    </div>
  );
  if (error) return (
    <div style={{ padding: '3rem', textAlign: 'center' }}>
      <div style={{ color: '#c00', fontSize: '0.9rem', background: '#fee', padding: '1rem', borderRadius: 6, display: 'inline-block', border: '1px solid #fca5a5' }}>{error}</div>
    </div>
  );
  if (!teaser) return null;

  const approved = ndaStatus === 'approved' || ndaStatus === 'admin';

  // Aktiver Tab prüfen ob zugänglich
  const canViewTab = (key) => PUBLIC_TABS.includes(key) || approved;

  const handleTabClick = (key) => {
    setActiveTab(key);
  };

  // ── Tab-Inhalte ──────────────────────────────────────────────────────────

  const renderTabContent = () => {
    // Überblick — öffentlich
    if (activeTab === 'overview') {
      return (
        <div>
          <p style={{ color: '#444', lineHeight: 1.8, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {teaser.short_description}
          </p>

          {/* Highlights */}
          {teaser.highlights?.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontWeight: 700, color: C.text, marginBottom: '0.75rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle size={14} color={C.steel} /> Investment Highlights
              </h4>
              {teaser.highlights.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.steel, marginTop: 8, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.875rem', color: '#444', lineHeight: 1.6 }}>{h}</span>
                </div>
              ))}
            </div>
          )}

          {/* NDA-Aufforderung wenn nicht freigegeben */}
          {!approved && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '1.25rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Lock size={14} color={C.navy} />
                <span style={{ fontWeight: 600, color: C.text, fontSize: '0.88rem' }}>Vollständige Informationen nach NDA-Freigabe</span>
              </div>
              <p style={{ color: C.muted, fontSize: '0.82rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                Vollständige Unternehmensbeschreibung, Finanzdaten, Teamdetails und vertrauliche Dokumente werden nach NDA-Freigabe zugänglich.
              </p>
              {!user ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link to="/registrieren" style={{ background: C.navy, color: '#fff', padding: '0.55rem 1rem', borderRadius: 6, textDecoration: 'none', fontWeight: 600, fontSize: '0.82rem' }}>Registrieren</Link>
                  <Link to="/login" style={{ border: `1px solid ${C.navy}`, color: C.navy, padding: '0.55rem 1rem', borderRadius: 6, textDecoration: 'none', fontWeight: 600, fontSize: '0.82rem' }}>Anmelden</Link>
                </div>
              ) : !ndaStatus ? (
                <button onClick={requestNDA} disabled={requesting} style={{ background: C.navy, color: '#fff', border: 'none', padding: '0.55rem 1.25rem', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', opacity: requesting ? 0.7 : 1 }}>
                  {requesting ? 'Wird angefordert...' : 'NDA anfordern'}
                </button>
              ) : (
                <div style={{ fontSize: '0.82rem', color: '#666' }}>
                  {statusMap[ndaStatus]?.label || 'NDA-Status: ' + ndaStatus}
                </div>
              )}
            </div>
          )}

          {/* Nach NDA-Freigabe: vollständige Beschreibung + Problem/Lösung */}
          {approved && fullData && (
            <>
              {fullData.details?.full_description && fullData.details.full_description !== teaser.short_description && (
                <div style={{ marginTop: '1.25rem' }}>
                  <h4 style={{ fontWeight: 700, color: C.text, marginBottom: '0.6rem', fontSize: '0.88rem' }}>Vollständige Beschreibung</h4>
                  <p style={{ color: '#444', lineHeight: 1.8, fontSize: '0.9rem' }}>{fullData.details.full_description}</p>
                </div>
              )}

              {isStartup && fullData.details?.problem_solution && (
                <div style={{ background: `${C.navy}06`, borderRadius: 6, padding: '1.1rem', marginTop: '1.25rem', border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    <Lightbulb size={14} color={C.navy} />
                    <span style={{ fontWeight: 700, color: C.text, fontSize: '0.85rem' }}>Problem & Lösung</span>
                  </div>
                  <p style={{ color: '#555', fontSize: '0.83rem', lineHeight: 1.65 }}>{fullData.details.problem_solution}</p>
                </div>
              )}

              {fullData.details?.key_risks && (
                <div style={{ marginTop: '1rem', background: '#fff8e1', borderRadius: 6, padding: '0.9rem', border: '1px solid #ffe082' }}>
                  <h4 style={{ fontWeight: 600, color: '#92400e', marginBottom: '0.35rem', fontSize: '0.8rem' }}>Wesentliche Risiken</h4>
                  <p style={{ color: '#78350f', fontSize: '0.82rem', lineHeight: 1.5 }}>{fullData.details.key_risks}</p>
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    // Unternehmen — NDA-geschützt
    if (activeTab === 'company') {
      if (!canViewTab('company')) return <LockedTabPlaceholder onRequestNDA={requestNDA} user={user} ndaStatus={ndaStatus} navigate={navigate} />;
      return (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {isStartup ? (
              <>
                <KpiCard label="GRÜNDUNGSJAHR" value={fullData?.details?.founding_year || '—'} icon={Calendar} />
                <KpiCard label="MITARBEITER" value={fullData?.details?.employees ? `${fullData.details.employees} Personen` : '—'} icon={Users} />
              </>
            ) : (
              <>
                <KpiCard label="MITARBEITER" value={fullData?.details?.employees || '—'} icon={Users} />
                <KpiCard label="GRÜNDUNGSJAHR" value={fullData?.details?.founding_year || '—'} icon={Calendar} />
                <KpiCard label="STANDORT" value={teaser.location_city || teaser.region || '—'} icon={MapPin} />
                <KpiCard label="BRANCHE" value={teaser.industry || '—'} icon={Building2} />
              </>
            )}
          </div>

          {fullData?.details?.team_description && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                <Users size={14} color={C.navy} />
                <h4 style={{ fontWeight: 700, color: C.text, fontSize: '0.9rem', margin: 0 }}>
                  {isStartup ? 'Gründerteam' : 'Management'}
                </h4>
              </div>
              <p style={{ color: '#444', fontSize: '0.85rem', lineHeight: 1.75, whiteSpace: 'pre-line' }}>
                {fullData.details.team_description}
              </p>
            </div>
          )}

          {!isStartup && fullData?.details?.growth_strategy && (
            <div>
              <h4 style={{ fontWeight: 600, color: C.text, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Wachstumsstrategie</h4>
              <p style={{ color: '#555', fontSize: '0.85rem', lineHeight: 1.6 }}>{fullData.details.growth_strategy}</p>
            </div>
          )}

          {isStartup && fullData?.details?.traction_highlights && (() => {
            try {
              const t = JSON.parse(fullData.details.traction_highlights);
              if (t.length > 0) return (
                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ fontWeight: 700, color: C.text, marginBottom: '0.6rem', fontSize: '0.85rem' }}>Traktion</h4>
                  {t.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'flex-start' }}>
                      <CheckCircle size={13} color={C.steel} style={{ marginTop: 3, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.83rem', color: '#444', lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              );
            } catch { return null; }
          })()}

          {!fullData?.details && (
            <p style={{ color: C.muted, fontSize: '0.875rem' }}>Unternehmensdetails werden im CIM bereitgestellt.</p>
          )}
        </div>
      );
    }

    // Markt & Potenzial — NDA-geschützt
    if (activeTab === 'market') {
      if (!canViewTab('market')) return <LockedTabPlaceholder onRequestNDA={requestNDA} user={user} ndaStatus={ndaStatus} navigate={navigate} />;
      return (
        <div>
          {teaser.tam_band && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                { key: 'TAM', label: 'Total Addressable Market', value: teaser.tam_band, accent: false },
                { key: 'SAM', label: 'Serviceable Addressable Market', value: '—', accent: false },
                { key: 'SOM', label: 'Serviceable Obtainable Market', value: '—', accent: true },
              ].map(({ key, label, value, accent }) => (
                <div key={key} style={{ background: accent ? '#f0fdf4' : C.bg, borderRadius: 6, padding: '1rem', textAlign: 'center', border: `1px solid ${accent ? '#bbf7d0' : C.border}` }}>
                  <div style={{ fontSize: '0.62rem', color: C.muted, letterSpacing: '0.09em', fontWeight: 700, marginBottom: '0.35rem' }}>{key}</div>
                  <div style={{ fontWeight: 800, color: accent ? '#166534' : C.text, fontSize: '1.1rem' }}>{value}</div>
                  <div style={{ fontSize: '0.68rem', color: C.muted, marginTop: '0.2rem' }}>{label}</div>
                </div>
              ))}
            </div>
          )}
          <p style={{ color: '#555', fontSize: '0.83rem', lineHeight: 1.7 }}>
            Vollständige Marktanalyse und Wettbewerbslandschaft im Confidential Information Memorandum (CIM).
          </p>
        </div>
      );
    }

    // Finanzen — NDA-geschützt
    if (activeTab === 'financials') {
      if (!canViewTab('financials')) return <LockedTabPlaceholder onRequestNDA={requestNDA} user={user} ndaStatus={ndaStatus} navigate={navigate} />;

      if (isStartup) {
        // Startup: Mittelverwendung + Meilensteine
        return (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <KpiCard label="RUNDEN-VOLUMEN" value={teaser.investment_needed} icon={Euro} />
              <KpiCard label="INVESTOR-STAKE" value={teaser.equity_stake} icon={Percent} />
              <KpiCard label="POST-MONEY" value={teaser.post_money_valuation} icon={TrendingUp} />
              <KpiCard label="TAM" value={teaser.tam_band} icon={BarChart3} />
            </div>

            {fullData?.details?.use_of_funds && (
              <div style={{ background: `${C.navy}06`, borderRadius: 6, padding: '1.1rem', marginBottom: '1.25rem', border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <PieChart size={13} color={C.navy} />
                  <span style={{ fontWeight: 700, color: C.text, fontSize: '0.85rem' }}>Mittelverwendung</span>
                </div>
                <p style={{ color: '#555', fontSize: '0.83rem', lineHeight: 1.7 }}>{fullData.details.use_of_funds}</p>
              </div>
            )}

            {fullData?.details?.milestones && (
              <div style={{ background: '#f0fdf4', borderRadius: 6, padding: '1.1rem', border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <Target size={13} color="#166534" />
                  <span style={{ fontWeight: 700, color: '#166534', fontSize: '0.85rem' }}>Meilensteine (12 Monate)</span>
                </div>
                <p style={{ color: '#166534', fontSize: '0.83rem', lineHeight: 1.65 }}>{fullData.details.milestones}</p>
              </div>
            )}

            {!fullData?.details?.use_of_funds && !fullData?.details?.milestones && (
              <p style={{ color: C.muted, fontSize: '0.875rem' }}>Detaillierter Finanzplan im CIM verfügbar.</p>
            )}
          </div>
        );
      }

      // M&A: Finanzdaten
      return (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Umsatz (IST)',        value: fmt(fullData?.details?.revenue_actual) },
              { label: 'EBITDA (IST)',        value: fmt(fullData?.details?.ebitda_actual) },
              { label: 'Umsatz-Trend',        value: fullData?.details?.revenue_trend || '—' },
              { label: 'Kaufpreisindikation', value: fullData?.details?.asking_price_band || '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: C.bg, borderRadius: 6, padding: '1rem', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '0.7rem', color: C.muted, letterSpacing: '0.07em', marginBottom: '0.3rem' }}>{label.toUpperCase()}</div>
                <div style={{ fontWeight: 700, color: C.text, fontSize: '1rem' }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#f0f4ff', borderRadius: 6, padding: '0.9rem', fontSize: '0.8rem', color: '#555', border: '1px solid #c7d2fe' }}>
            Detaillierte Jahresabschlüsse stehen im Bereich <strong>Dokumente</strong> zur Verfügung.
          </div>
        </div>
      );
    }

    // Dokumente — zwei Sektionen: öffentlich + NDA-geschützt
    if (activeTab === 'documents') {
      const ndaDocs = approved && fullData?.documents
        ? fullData.documents.filter(d => ['nda', 'approved'].includes(d.access_level))
        : [];

      const downloadDoc = async (doc) => {
        try {
          const token = localStorage.getItem('phalanx_token');
          const res = await fetch(`/api/documents/${id}/${doc.id}/download`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = doc.filename; a.click();
            URL.revokeObjectURL(url);
          }
        } catch { /* ignore */ }
      };

      return (
        <div>
          {/* Öffentliche Dokumente */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Globe size={15} color={C.navy} />
              <h4 style={{ fontWeight: 700, color: C.text, fontSize: '0.9rem', margin: 0 }}>Öffentliche Dokumente</h4>
              <span style={{ background: '#dcfce7', color: '#166534', padding: '0.1rem 0.4rem', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700 }}>Ohne NDA verfügbar</span>
            </div>

            {publicDocs.length === 0 ? (
              <p style={{ color: C.muted, fontSize: '0.83rem' }}>Kein öffentlicher Teaser verfügbar.</p>
            ) : (
              publicDocs.map(doc => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: C.bg, borderRadius: 6, marginBottom: '0.5rem', border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: 32, height: 32, background: `${C.navy}12`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={14} color={C.navy} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.83rem', color: C.text }}>{doc.description || doc.filename}</div>
                      <div style={{ fontSize: '0.72rem', color: C.muted }}>{doc.filename}{doc.file_size ? ` · ${(doc.file_size / 1024 / 1024).toFixed(1)} MB` : ''}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadDoc(doc)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: C.navy, color: '#fff', border: 'none', padding: '0.4rem 0.85rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    <Download size={12} /> Download
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Vertrauliche Dokumente */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Lock size={15} color={C.navy} />
              <h4 style={{ fontWeight: 700, color: C.text, fontSize: '0.9rem', margin: 0 }}>Vertrauliche Dokumente</h4>
              <span style={{ background: approved ? '#d1fae5' : '#fef3c7', color: approved ? '#065f46' : '#92400e', padding: '0.1rem 0.4rem', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700 }}>
                {approved ? 'NDA freigegeben' : 'NDA erforderlich'}
              </span>
            </div>

            {!approved ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', background: C.bg, borderRadius: 6, border: `1px solid ${C.border}` }}>
                <div style={{ width: 36, height: 36, background: '#fef3c7', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Lock size={16} color='#92400e' />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.83rem', color: C.text }}>Informationsmemorandum (IM/CIM)</div>
                  <div style={{ fontSize: '0.72rem', color: C.muted }}>Vollständige Unterlagen nach NDA-Freigabe</div>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 600 }}>NDA erforderlich</span>
              </div>
            ) : ndaDocs.length === 0 ? (
              <p style={{ color: C.muted, fontSize: '0.83rem' }}>Noch keine vertraulichen Dokumente hochgeladen.</p>
            ) : (
              ndaDocs.map(doc => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: C.bg, borderRadius: 6, marginBottom: '0.5rem', border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: 32, height: 32, background: `${C.navy}12`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={14} color={C.navy} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.83rem', color: C.text }}>{doc.description || doc.filename}</div>
                      <div style={{ fontSize: '0.72rem', color: C.muted }}>{doc.filename}{doc.file_size ? ` · ${(doc.file_size / 1024 / 1024).toFixed(1)} MB` : ''}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadDoc(doc)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: C.navy, color: '#fff', border: 'none', padding: '0.4rem 0.85rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    <Download size={12} /> Download
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    // Kontakt — immer sichtbar
    if (activeTab === 'contact') {
      return (
        <div>
          <p style={{ color: '#555', fontSize: '0.875rem', lineHeight: 1.7, marginBottom: '1.25rem' }}>
            Sie haben Fragen zu diesem Mandat? Ihr Ansprechpartner steht Ihnen gerne zur Verfügung.
          </p>
          <div style={{ background: C.bg, borderRadius: 6, padding: '1.25rem', border: `1px solid ${C.border}` }}>
            <div style={{ fontWeight: 700, color: C.text, marginBottom: '0.15rem', fontSize: '0.95rem' }}>Christian Neusser</div>
            <div style={{ fontSize: '0.82rem', color: C.muted, marginBottom: '1rem' }}>Phalanx GmbH · Fundraising Advisory</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <a href="mailto:neusser@phalanx.de" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: C.navy, textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                <Mail size={14} /> neusser@phalanx.de
              </a>
              <a href="tel:+4991319206075" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: C.navy, textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                <Phone size={14} /> +49 9131 9 20 60 75
              </a>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: '0.8rem', color: C.muted, marginBottom: '1.5rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <Link to="/projekte" style={{ color: C.navy, textDecoration: 'none', fontWeight: 600 }}>Marktplatz</Link>
          <ChevronRight size={12} />
          <span>{teaser.codename}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
          {/* Hauptinhalt */}
          <div>
            {/* Header-Karte */}
            <div style={{ background: C.card, borderRadius: 6, padding: '2rem', border: `1px solid ${C.border}`, marginBottom: '1.5rem' }}>
              {/* Badges: Typ + Branche + Region + Status */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{
                  background: teaser.mandate_type === 'fundraising' ? '#EDE9FE' : '#EDF4FA',
                  color: teaser.mandate_type === 'fundraising' ? '#5B21B6' : C.navy,
                  padding: '0.22rem 0.6rem', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700,
                }}>
                  {teaser.mandate_type === 'fundraising' ? 'Fundraising' : 'M&A'}
                </span>
                {(teaser.stage || teaser.deal_type) && (
                  <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.22rem 0.6rem', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700 }}>
                    {teaser.stage || teaser.deal_type}
                  </span>
                )}
                {teaser.industry && (
                  <span style={{ background: C.bg, color: C.muted, padding: '0.22rem 0.6rem', borderRadius: 6, fontSize: '0.68rem', fontWeight: 600, border: `1px solid ${C.border}` }}>
                    <Building2 size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />{teaser.industry}
                  </span>
                )}
                {(teaser.location_city || teaser.region) && (
                  <span style={{ background: C.bg, color: C.muted, padding: '0.22rem 0.6rem', borderRadius: 6, fontSize: '0.68rem', fontWeight: 600, border: `1px solid ${C.border}` }}>
                    <MapPin size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />{teaser.location_city || teaser.region}
                  </span>
                )}
                {teaser.status === 'active' && (
                  <span style={{ background: '#d1fae5', color: '#065f46', padding: '0.22rem 0.6rem', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700 }}>
                    Aktiv
                  </span>
                )}
              </div>

              {/* Titel */}
              <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: C.text, marginBottom: '1.25rem', lineHeight: 1.2 }}>
                {teaser.codename}
              </h1>

              {/* KPI-Reihe */}
              {isStartup ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {[
                    { label: 'RUNDE', value: teaser.investment_needed, icon: Euro },
                    { label: 'STAKE',  value: teaser.equity_stake,      icon: Percent },
                    { label: 'POST-MONEY', value: teaser.post_money_valuation, icon: TrendingUp },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} style={{ background: C.bg, borderRadius: 6, padding: '0.85rem', border: `1px solid ${C.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.2rem' }}>
                        <Icon size={10} color={C.muted} />
                        <span style={{ fontSize: '0.63rem', color: C.muted, letterSpacing: '0.08em', fontWeight: 600 }}>{label}</span>
                      </div>
                      <div style={{ fontWeight: 700, color: C.text, fontSize: '1rem' }}>{value || '—'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {[['Umsatz', teaser.revenue_band], ['EBITDA', teaser.ebitda_band]].map(([label, value]) => (
                    <div key={label} style={{ background: C.bg, borderRadius: 6, padding: '1rem', border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: '0.7rem', color: C.muted, letterSpacing: '0.07em', marginBottom: '0.3rem' }}>{label.toUpperCase()}</div>
                      <div style={{ fontWeight: 700, color: C.text, fontSize: '1.1rem' }}>{value || '—'}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Kurzbeschreibung */}
              <p style={{ color: '#555', lineHeight: 1.75, marginBottom: teaser.highlights?.length ? '1.5rem' : 0, fontSize: '0.9rem' }}>
                {teaser.short_description}
              </p>

              {/* Investment Highlights */}
              {teaser.highlights?.length > 0 && (
                <div>
                  <h3 style={{ fontWeight: 700, color: C.text, marginBottom: '0.75rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle size={14} color={C.steel} /> Investment Highlights
                  </h3>
                  {teaser.highlights.map((h, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.steel, marginTop: 8, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.875rem', color: '#444', lineHeight: 1.6 }}>{h}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Detail-Tabs */}
            <div style={{ background: C.card, borderRadius: 6, border: `1px solid ${C.border}` }}>
              {/* Tab-Leiste */}
              <div style={{
                display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}`,
                overflowX: 'auto',
              }}>
                {ALL_TABS.map(([key, label]) => {
                  const isPublic = PUBLIC_TABS.includes(key);
                  const accessible = isPublic || approved;
                  const isActive = activeTab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleTabClick(key)}
                      style={{
                        padding: '0.75rem 1.1rem', border: 'none', background: 'transparent',
                        cursor: 'pointer',
                        fontWeight: isActive ? 700 : 400,
                        fontSize: '0.83rem',
                        color: isActive ? C.navy : C.muted,
                        borderBottom: isActive ? `2px solid ${C.navy}` : '2px solid transparent',
                        marginBottom: -1,
                        whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        transition: 'color 0.15s',
                      }}
                    >
                      {!accessible && <Lock size={9} style={{ opacity: 0.5 }} />}
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Tab-Inhalt */}
              <div style={{ padding: '1.75rem' }}>
                {renderTabContent()}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ position: 'sticky', top: 80 }}>
            {/* Zugang-Box */}
            <div style={{ background: C.card, borderRadius: 6, padding: '1.5rem', border: `1px solid ${C.border}`, marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: 700, color: C.text, marginBottom: '1rem', fontSize: '0.95rem' }}>Ihr Zugang</h3>

              {!user ? (
                <>
                  <p style={{ color: C.muted, fontSize: '0.83rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                    Registrieren Sie sich kostenlos, um eine NDA anzufordern und Detailinformationen zu erhalten.
                  </p>
                  <Link to="/registrieren" style={{ display: 'block', background: C.navy, color: '#fff', padding: '0.75rem', borderRadius: 6, textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem', textAlign: 'center', marginBottom: '0.65rem' }}>
                    Jetzt registrieren
                  </Link>
                  <Link to="/login" style={{ display: 'block', border: `1px solid ${C.navy}`, color: C.navy, padding: '0.65rem', borderRadius: 6, textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem', textAlign: 'center' }}>
                    Anmelden
                  </Link>
                </>
              ) : ndaStatus === 'admin' ? (
                <div style={{ background: '#d1fae5', borderRadius: 6, padding: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Shield size={15} color="#065f46" />
                  <span style={{ fontSize: '0.82rem', color: '#065f46', fontWeight: 600 }}>Admin-Vollzugriff</span>
                </div>
              ) : ndaStatus ? (
                <>
                  {(() => {
                    const s = statusMap[ndaStatus] || statusMap.requested;
                    const Icon = s.icon;
                    return (
                      <div style={{ background: s.bg, borderRadius: 6, padding: '0.9rem', display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '1rem' }}>
                        <Icon size={15} color={s.color} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontSize: '0.82rem', color: '#333', fontWeight: 500, lineHeight: 1.5 }}>{s.label}</span>
                      </div>
                    );
                  })()}
                  {(ndaStatus === 'sent' || ndaStatus === 'requested') && (
                    <button onClick={() => setShowNDAModal(true)} style={{
                      width: '100%', background: ndaStatus === 'sent' ? '#3b82f6' : '#f59e0b',
                      color: '#fff', border: 'none', padding: '0.75rem', borderRadius: 6,
                      fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', marginBottom: '0.75rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    }}>
                      <PenLine size={14} />
                      {ndaStatus === 'sent' ? 'NDA jetzt unterzeichnen' : 'NDA vorab ansehen & unterzeichnen'}
                    </button>
                  )}
                  {ndaStatus === 'signed' && (
                    <button onClick={async () => {
                      try {
                        const token = localStorage.getItem('phalanx_token');
                        const res = await fetch(`/api/ndas/${id}/download`, { headers: { Authorization: `Bearer ${token}` } });
                        if (res.ok) {
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a'); a.href = url; a.download = `NDA_${teaser.codename}.pdf`; a.click();
                          URL.revokeObjectURL(url);
                        }
                      } catch { /* ignore */ }
                    }} style={{ width: '100%', background: 'transparent', border: `1px solid ${C.navy}`, color: C.navy, padding: '0.6rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                      <Download size={13} /> Unterzeichnetes NDA herunterladen
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p style={{ color: C.muted, fontSize: '0.83rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                    {isStartup
                      ? 'Fordern Sie eine NDA an, um das vollständige CIM, Teamdetails und Finanzplan zu erhalten.'
                      : 'Fordern Sie eine Vertraulichkeitsvereinbarung (NDA) an, um Zugang zu erhalten.'}
                  </p>
                  <button onClick={requestNDA} disabled={requesting} style={{
                    width: '100%', background: C.navy, color: '#fff', border: 'none',
                    padding: '0.75rem', borderRadius: 6, fontWeight: 600, fontSize: '0.875rem',
                    cursor: requesting ? 'not-allowed' : 'pointer', opacity: requesting ? 0.7 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  }}>
                    <FileText size={14} /> {requesting ? 'Wird angefordert...' : 'NDA anfordern'}
                  </button>
                </>
              )}

              <div style={{ marginTop: '1.25rem', padding: '0.9rem', background: C.bg, borderRadius: 6, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '0.75rem', color: '#555', lineHeight: 1.7 }}>
                  <strong style={{ color: C.text, display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem' }}>Ansprechpartner</strong>
                  <div style={{ fontWeight: 600, color: C.text, marginBottom: '0.2rem', fontSize: '0.82rem' }}>Christian Neusser</div>
                  <a href="mailto:neusser@phalanx.de" style={{ color: C.navy, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                    <Mail size={11} /> neusser@phalanx.de
                  </a>
                  <a href="tel:+4991319206075" style={{ color: C.navy, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Phone size={11} /> +49 9131 9 20 60 75
                  </a>
                </div>
              </div>
            </div>

            <Link to="/projekte" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center', color: C.muted, textDecoration: 'none', fontSize: '0.82rem', padding: '0.5rem' }}>
              Zuruck zum Marktplatz
            </Link>
          </div>
        </div>
      </div>

      {showNDAModal && (
        <NDASignModal
          projectId={id}
          projectName={teaser.codename}
          onClose={() => setShowNDAModal(false)}
          onSigned={() => { setNdaStatus('signed'); setShowNDAModal(false); }}
        />
      )}
    </div>
  );
}
