import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FileText, Clock, CheckCircle, AlertCircle, Building2, MapPin, ChevronRight, User, Award, Lock, FileCheck, Database, MessageSquare, ArrowRight } from 'lucide-react';

const C = { navy: '#14314F', steel: '#A5C8E4', bg: '#F3F7FB', lightBg: '#EDF4FA', gray: '#878787' };

// Die vier Prozessstufen aus Käufersicht, in Reihenfolge
const DEAL_STEPS = [
  { key: 'interest', label: 'Interesse' },
  { key: 'nda', label: 'NDA' },
  { key: 'documents', label: 'Unterlagen' },
  { key: 'dataroom', label: 'Datenraum' },
];
// Interest-Stage → wie weit ist die Kette erfüllt (0..4)
function stepReached(stage) {
  if (stage === 'dataroom_granted' || stage === 'loi') return 4;
  if (stage === 'im_granted' || stage === 'nda_signed') return 3;
  if (stage === 'nda_pending' || stage === 'requested') return 1;
  return 1;
}

// Eine Prozesskarte je Deal des Käufers
function DealCard({ d }) {
  const reached = stepReached(d.stage);
  const isFund = d.mandate_type === 'fundraising';
  const resources = [
    { key: 'teaser', label: 'Kurzprofil', icon: FileText, on: d.unlocked.teaser },
    { key: 'expose', label: 'Exposé', icon: FileCheck, on: d.unlocked.expose },
    { key: 'documents', label: 'Unterlagen', icon: FileText, on: d.unlocked.documents },
    { key: 'dataroom', label: 'Datenraum', icon: Database, on: d.unlocked.dataroom },
    { key: 'qa', label: 'Q&A', icon: MessageSquare, on: d.unlocked.qa },
  ];
  return (
    <div style={{ background: '#fff', border: '1px solid #dce8f2', borderRadius: 12, padding: '1.1rem 1.2rem', display: 'flex', flexDirection: 'column' }}>
      {/* Kopf */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <Link to={`/projekte/${d.id}`} style={{ fontWeight: 800, color: C.navy, fontSize: '1rem', textDecoration: 'none' }}>{d.codename}</Link>
          <div style={{ fontSize: '0.74rem', color: '#888', display: 'flex', gap: '0.6rem', marginTop: 2, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Building2 size={11} />{d.industry}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={11} />{d.region}</span>
          </div>
        </div>
        <span style={{ background: isFund ? '#ede9fe' : '#EDF4FA', color: isFund ? '#5b21b6' : C.navy, padding: '0.15rem 0.55rem', borderRadius: 10, fontSize: '0.66rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
          {isFund ? 'Startup' : 'M&A'}
        </span>
      </div>

      {/* Stufen-Timeline */}
      <div style={{ display: 'flex', alignItems: 'center', margin: '0.9rem 0 0.2rem' }}>
        {DEAL_STEPS.map((s, i) => {
          const done = reached > i;
          const current = reached === i + 1;
          return (
            <React.Fragment key={s.key}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? '#10b981' : current ? C.navy : '#e2e8f0', color: done || current ? '#fff' : '#94a3b8',
                  fontSize: '0.62rem', fontWeight: 800,
                }}>{done ? <CheckCircle size={13} /> : i + 1}</div>
                <div style={{ fontSize: '0.58rem', color: current ? C.navy : '#94a3b8', fontWeight: current ? 800 : 600, marginTop: 3 }}>{s.label}</div>
              </div>
              {i < DEAL_STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, background: reached > i + 1 ? '#10b981' : '#e2e8f0', margin: '0 4px', marginBottom: 14 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Für Sie freigegeben */}
      <div style={{ background: C.bg, borderRadius: 8, padding: '0.6rem 0.7rem', margin: '0.7rem 0' }}>
        <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>Für Sie freigegeben</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {resources.map(r => (
            <span key={r.key} title={r.on ? 'freigegeben' : 'noch gesperrt'}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 600,
                background: r.on ? '#d1fae5' : '#f1f5f9', color: r.on ? '#065f46' : '#94a3b8',
                padding: '0.15rem 0.5rem', borderRadius: 20 }}>
              {r.on ? <r.icon size={11} /> : <Lock size={10} />} {r.label}
            </span>
          ))}
        </div>
      </div>

      {/* Nächster Schritt */}
      <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5, marginBottom: '0.7rem' }}>
        <span style={{ fontWeight: 700, color: C.navy }}>{d.phase}: </span>{d.next}
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', gap: 6 }}>
        <Link to={d.next_action ? d.next_action.path : `/projekte/${d.id}`}
          style={{ flex: 1, textAlign: 'center', background: C.navy, color: '#fff', padding: '0.55rem 0.9rem', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {d.next_action ? d.next_action.label : 'Zum Deal'} <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

const statusMap = {
  requested: { label: 'Angefordert', color: '#f59e0b', bg: '#fef3c7' },
  sent: { label: 'Versendet', color: '#3b82f6', bg: '#dbeafe' },
  signed: { label: 'Unterschrieben', color: '#8b5cf6', bg: '#ede9fe' },
  approved: { label: 'Freigegeben', color: '#10b981', bg: '#d1fae5' },
  rejected: { label: 'Abgelehnt', color: '#ef4444', bg: '#fee2e2' },
};

export default function Dashboard() {
  const { user, isSeller } = useAuth();
  const navigate = useNavigate();
  const [ndas, setNdas] = useState([]);
  const [projects, setProjects] = useState([]);
  const [xp, setXp] = useState(null);
  const [platformNda, setPlatformNda] = useState(null); // { signed_at } | null
  const [myDeals, setMyDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Verkäufer haben einen eigenen, fokussierten Bereich (nur eigene Mandate + Funnel).
  useEffect(() => {
    if (isSeller) navigate('/verkaeuferdashboard', { replace: true });
  }, [isSeller, navigate]);

  useEffect(() => {
    if (isSeller) return;
    Promise.all([
      api.get('/ndas'),
      api.get('/projects'),
    ]).then(([ndasData, projectsData]) => {
      setNdas(ndasData);
      setProjects(projectsData.projects.slice(0, 3));
    }).catch(console.error).finally(() => setLoading(false));
    api.get('/gamification/me').then(setXp).catch(() => {});
    api.get('/auth/platform-nda').then(setPlatformNda).catch(() => {});
    api.get('/projects/my-deals').then(d => setMyDeals(d || [])).catch(() => {});
  }, []);

  async function signPlatformNda() {
    try { const r = await api.post('/auth/platform-nda', {}); setPlatformNda(r); }
    catch (e) { console.error(e); }
  }

  const approved = ndas.filter(n => n.status === 'approved').length;
  const pending = ndas.filter(n => ['requested', 'sent', 'signed'].includes(n.status)).length;

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>Wird geladen...</div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      {/* Welcome */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 700, color: C.navy }}>Willkommen, {user?.first_name}</h1>
        <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.25rem' }}>Ihr persönlicher M&A-Bereich</p>
      </div>

      {/* Plattform-NDA: Gütesiegel (Stufe C) */}
      {platformNda && (
        <div style={{ background: platformNda.signed_at ? '#ede9fe' : C.lightBg, border: `1px solid ${platformNda.signed_at ? '#c4b5fd' : C.steel}`, borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Award size={22} color={platformNda.signed_at ? '#5b21b6' : C.navy} />
            <div>
              <div style={{ fontWeight: 800, color: platformNda.signed_at ? '#5b21b6' : C.navy, fontSize: '0.92rem' }}>
                {platformNda.signed_at ? 'Plattform-NDA gezeichnet' : 'Plattform-NDA zeichnen'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#555', lineHeight: 1.5, maxWidth: 620 }}>
                {platformNda.signed_at
                  ? 'Ihr Gütesiegel ist aktiv. Verkäufer sehen, dass Sie Diskretion zusichern.'
                  : 'Ein einmaliges, plattformweites Vertraulichkeitsversprechen. Es signalisiert Ernsthaftigkeit und verbessert Ihre Chancen, das richtige Unternehmen zu finden.'}
              </div>
            </div>
          </div>
          {!platformNda.signed_at && (
            <button onClick={signPlatformNda} style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem 1.2rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
              Jetzt zeichnen
            </button>
          )}
        </div>
      )}

      {/* Sprint 17: XP / Level */}
      {xp && (
        <div style={{ background: `linear-gradient(135deg, ${C.navy}, #1d4e89)`, color: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ width: 52, height: 52, background: 'rgba(255,255,255,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Award size={26} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800 }}>{xp.total} XP</span>
              <span style={{ fontSize: '0.85rem', background: 'rgba(255,255,255,0.18)', padding: '0.15rem 0.6rem', borderRadius: 20, fontWeight: 600 }}>Level {xp.level} · {xp.name}</span>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ height: 7, background: 'rgba(255,255,255,0.2)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ width: `${xp.progress_pct}%`, height: '100%', background: '#29ABE2', borderRadius: 5 }} />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
                {xp.next ? `Noch ${xp.to_next} XP bis „${xp.next}"` : 'Höchstes Level erreicht 🎉'}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', maxWidth: 200, lineHeight: 1.5 }}>
            Punkte sammeln Sie für echte Schritte: NDA, Datenraum, Due Diligence, und den Abschluss über die Plattform.
          </div>
        </div>
      )}

      {/* KPIs: prozessorientiert, aus den eigenen Deals abgeleitet */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Aktive Deals', value: myDeals.length, icon: FileText, color: C.navy },
          { label: 'Unterlagen freigegeben', value: myDeals.filter(d => d.unlocked.expose || d.unlocked.documents).length, icon: CheckCircle, color: '#10b981' },
          { label: 'Datenraum offen', value: myDeals.filter(d => d.unlocked.dataroom).length, icon: Lock, color: '#7c3aed' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #dce8f2', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 44, height: 44, background: `${color}15`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: C.navy }}>{value}</div>
              <div style={{ fontSize: '0.78rem', color: '#888' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Meine Deals: je Deal eine Prozesskarte mit Stufe, Freigaben und nächstem Schritt */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
          <h2 style={{ fontWeight: 700, color: C.navy, fontSize: '1.05rem' }}>Meine Deals</h2>
          <Link to="/projekte" style={{ fontSize: '0.82rem', color: C.navy, fontWeight: 600, textDecoration: 'none' }}>Weitere Unternehmen entdecken →</Link>
        </div>

        {myDeals.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #dce8f2', borderRadius: 12, padding: '2.5rem', textAlign: 'center' }}>
            <FileText size={34} color="#c7d7e6" style={{ marginBottom: '0.8rem' }} />
            <div style={{ fontWeight: 700, color: C.navy, marginBottom: '0.3rem' }}>Noch kein Deal begonnen</div>
            <p style={{ color: '#777', fontSize: '0.86rem', marginBottom: '1.1rem', lineHeight: 1.6 }}>
              Sobald Sie bei einem Unternehmen Interesse bekunden, erscheint es hier mit Ihrem Prozessstand und den für Sie freigegebenen Unterlagen.
            </p>
            <Link to="/projekte" style={{ background: C.navy, color: '#fff', padding: '0.6rem 1.4rem', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem' }}>
              Marktplatz ansehen
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
            {myDeals.map(d => <DealCard key={d.id} d={d} />)}
          </div>
        )}
      </div>

      {/* Profile hint */}
      <div style={{ background: `${C.navy}08`, border: `1px solid ${C.navy}20`, borderRadius: 12, padding: '1.25rem 1.5rem', marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <User size={18} color={C.navy} />
          <div>
            <div style={{ fontWeight: 600, color: C.navy, fontSize: '0.9rem' }}>Käuferprofil vervollständigen</div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>Definieren Sie Ihre Suchkriterien für automatisches Matching</div>
          </div>
        </div>
        <Link to="/profil" style={{ background: C.navy, color: '#fff', padding: '0.55rem 1.25rem', borderRadius: 7, textDecoration: 'none', fontWeight: 600, fontSize: '0.825rem' }}>
          Profil bearbeiten
        </Link>
      </div>
    </div>
  );
}
