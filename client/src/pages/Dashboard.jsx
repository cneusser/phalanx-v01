import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FileText, Clock, CheckCircle, AlertCircle, Building2, MapPin, ChevronRight, User, Award } from 'lucide-react';

const C = { navy: '#14314F', steel: '#A5C8E4', bg: '#F3F7FB', lightBg: '#EDF4FA', gray: '#878787' };

const statusMap = {
  requested: { label: 'Angefordert', color: '#f59e0b', bg: '#fef3c7' },
  sent: { label: 'Versendet', color: '#3b82f6', bg: '#dbeafe' },
  signed: { label: 'Unterschrieben', color: '#8b5cf6', bg: '#ede9fe' },
  approved: { label: 'Freigegeben', color: '#10b981', bg: '#d1fae5' },
  rejected: { label: 'Abgelehnt', color: '#ef4444', bg: '#fee2e2' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [ndas, setNdas] = useState([]);
  const [projects, setProjects] = useState([]);
  const [xp, setXp] = useState(null);
  const [platformNda, setPlatformNda] = useState(null); // { signed_at } | null
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/ndas'),
      api.get('/projects'),
    ]).then(([ndasData, projectsData]) => {
      setNdas(ndasData);
      setProjects(projectsData.projects.slice(0, 3));
    }).catch(console.error).finally(() => setLoading(false));
    api.get('/gamification/me').then(setXp).catch(() => {});
    api.get('/auth/platform-nda').then(setPlatformNda).catch(() => {});
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

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'NDA-Anfragen', value: ndas.length, icon: FileText, color: C.navy },
          { label: 'Freigeschaltet', value: approved, icon: CheckCircle, color: '#10b981' },
          { label: 'In Bearbeitung', value: pending, icon: Clock, color: '#f59e0b' },
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* NDA Status */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #dce8f2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontWeight: 600, color: C.navy, fontSize: '1rem' }}>Meine NDA-Anfragen</h2>
            <Link to="/projekte" style={{ fontSize: '0.8rem', color: C.navy, textDecoration: 'none' }}>+ Neue Anfrage</Link>
          </div>
          {ndas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#999', fontSize: '0.875rem' }}>
              Noch keine NDA-Anfragen.<br />
              <Link to="/projekte" style={{ color: C.navy, fontWeight: 600 }}>Projekte ansehen →</Link>
            </div>
          ) : (
            ndas.map(nda => {
              const s = statusMap[nda.status] || statusMap.requested;
              return (
                <div key={nda.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: C.bg, borderRadius: 8, marginBottom: '0.6rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: C.navy }}>{nda.codename}</div>
                    <div style={{ fontSize: '0.75rem', color: '#888', display: 'flex', gap: '0.5rem', marginTop: '0.15rem' }}>
                      <span>{nda.industry}</span>·<span>{nda.region}</span>
                    </div>
                  </div>
                  <span style={{ background: s.bg, color: s.color, padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {s.label}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Matching Projects */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #dce8f2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontWeight: 600, color: C.navy, fontSize: '1rem' }}>Aktuelle Mandate</h2>
            <Link to="/projekte" style={{ fontSize: '0.8rem', color: C.navy, textDecoration: 'none' }}>Alle ansehen →</Link>
          </div>
          {projects.map(p => (
            <div key={p.id} style={{ padding: '0.75rem', background: C.bg, borderRadius: 8, marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: C.navy }}>{p.codename}</div>
                <span style={{ background: '#fef3e2', color: '#92400e', padding: '0.15rem 0.5rem', borderRadius: 10, fontSize: '0.7rem' }}>{p.deal_type}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888', display: 'flex', gap: '0.75rem', marginTop: '0.3rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Building2 size={10} />{p.industry}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><MapPin size={10} />{p.region}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <Link to={`/projekte/${p.id}`} style={{ fontSize: '0.78rem', color: C.navy, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  Details <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
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
