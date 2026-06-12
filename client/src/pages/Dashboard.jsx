import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FileText, Clock, CheckCircle, AlertCircle, Building2, MapPin, ChevronRight, User } from 'lucide-react';

const C = { navy: '#1B3A5C', gold: '#C8A97E', bg: '#F5F3EF' };

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/ndas'),
      api.get('/projects'),
    ]).then(([ndasData, projectsData]) => {
      setNdas(ndasData);
      setProjects(projectsData.projects.slice(0, 3));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

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

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'NDA-Anfragen', value: ndas.length, icon: FileText, color: C.navy },
          { label: 'Freigeschaltet', value: approved, icon: CheckCircle, color: '#10b981' },
          { label: 'In Bearbeitung', value: pending, icon: Clock, color: '#f59e0b' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e4dc', display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
        <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e4dc' }}>
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
        <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e4dc' }}>
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
