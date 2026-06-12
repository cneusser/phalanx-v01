import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { BarChart3, Users, FileText, CheckCircle, Clock, Plus, Eye, X, Building2 } from 'lucide-react';

const C = { navy: '#1B3A5C', gold: '#C8A97E', bg: '#F5F3EF' };

const KPICard = ({ label, value, sub, icon: Icon, color = C.navy }) => (
  <div style={{ background: '#fff', borderRadius: 12, padding: '1.4rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e4dc' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: '2rem', fontWeight: 700, color }}>{value}</div>
        <div style={{ fontSize: '0.82rem', color: '#666', marginTop: '0.15rem' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: '0.1rem' }}>{sub}</div>}
      </div>
      <div style={{ width: 40, height: 40, background: `${color}12`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={color} />
      </div>
    </div>
  </div>
);

const statusMap = {
  requested: { label: 'Angefordert', color: '#f59e0b', bg: '#fef3c7' },
  sent: { label: 'Versendet', color: '#3b82f6', bg: '#dbeafe' },
  signed: { label: 'Unterschrieben', color: '#8b5cf6', bg: '#ede9fe' },
  approved: { label: 'Freigegeben', color: '#10b981', bg: '#d1fae5' },
  rejected: { label: 'Abgelehnt', color: '#ef4444', bg: '#fee2e2' },
};

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [ndas, setNdas] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProject, setNewProject] = useState({ codename: '', industry: '', region: '', revenue_band: '', ebitda_band: '', deal_type: '', short_description: '', status: 'draft' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [s, p, n, u] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/projects'),
        api.get('/admin/ndas'),
        api.get('/admin/users'),
      ]);
      setStats(s); setProjects(p); setNdas(n); setUsers(u);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function approveNDA(id) {
    try {
      await api.put(`/admin/ndas/${id}/approve`, {});
      setMsg('NDA freigegeben ✓');
      loadAll();
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setMsg('Fehler: ' + e.message); }
  }

  async function rejectNDA(id) {
    if (!confirm('NDA wirklich ablehnen?')) return;
    try {
      await api.put(`/admin/ndas/${id}/reject`, {});
      setMsg('NDA abgelehnt');
      loadAll();
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setMsg('Fehler: ' + e.message); }
  }

  async function createProject(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/projects', { ...newProject, highlights: [] });
      setMsg('Projekt erstellt ✓');
      setShowNewProject(false);
      setNewProject({ codename: '', industry: '', region: '', revenue_band: '', ebitda_band: '', deal_type: '', short_description: '', status: 'draft' });
      loadAll();
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setMsg('Fehler: ' + e.message); }
    finally { setSaving(false); }
  }

  const set = k => e => setNewProject(p => ({ ...p, [k]: e.target.value }));

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>Wird geladen...</div>;

  const tabs = ['overview', 'projects', 'ndas', 'users'];
  const tabLabels = { overview: 'Übersicht', projects: 'Projekte', ndas: 'NDA-Anfragen', users: 'Käufer' };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 700, color: C.navy }}>Admin-Dashboard</h1>
          <p style={{ color: '#666', fontSize: '0.875rem' }}>Plattformverwaltung & Transaktionscontrolling</p>
        </div>
        <button onClick={() => setShowNewProject(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: C.navy, color: '#fff', border: 'none', padding: '0.65rem 1.25rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
          <Plus size={16} /> Neues Projekt
        </button>
      </div>

      {msg && <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#065f46' }}>{msg}</div>}

      {/* KPIs */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <KPICard label="Aktive Projekte" value={stats.projects.active} sub={`${stats.projects.total} gesamt`} icon={Building2} />
          <KPICard label="Registrierte Käufer" value={stats.users.total} sub={`+${stats.users.this_week} diese Woche`} icon={Users} color="#8b5cf6" />
          <KPICard label="NDA-Anfragen" value={stats.ndas.total} sub={`${stats.ndas.requested} offen`} icon={FileText} color="#f59e0b" />
          <KPICard label="Freigaben" value={stats.ndas.approved} sub={`${stats.ndas.signed} unterschrieben`} icon={CheckCircle} color="#10b981" />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid #e0ddd6', marginBottom: '1.5rem' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '0.6rem 1.25rem', border: 'none', background: 'transparent', cursor: 'pointer',
            fontWeight: activeTab === tab ? 600 : 400, fontSize: '0.875rem',
            color: activeTab === tab ? C.navy : '#888',
            borderBottom: activeTab === tab ? `2px solid ${C.navy}` : '2px solid transparent',
          }}>
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e4dc' }}>
            <h3 style={{ fontWeight: 600, color: C.navy, marginBottom: '1rem', fontSize: '0.95rem' }}>Projekt-Pipeline</h3>
            {projects.slice(0, 5).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid #f0ede7' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: C.navy }}>{p.codename}</div>
                  <div style={{ fontSize: '0.72rem', color: '#888' }}>{p.industry} · {p.nda_count} NDAs</div>
                </div>
                <span style={{ background: p.status === 'active' ? '#d1fae5' : '#f0f0f0', color: p.status === 'active' ? '#065f46' : '#666', padding: '0.2rem 0.55rem', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600 }}>
                  {p.status === 'active' ? 'Aktiv' : p.status === 'draft' ? 'Entwurf' : 'Geschlossen'}
                </span>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e4dc' }}>
            <h3 style={{ fontWeight: 600, color: C.navy, marginBottom: '1rem', fontSize: '0.95rem' }}>Offene NDA-Anfragen</h3>
            {ndas.filter(n => ['requested', 'signed'].includes(n.status)).slice(0, 6).map(n => (
              <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid #f0ede7' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', color: C.navy }}>{n.user_name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#888' }}>{n.project_codename}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button onClick={() => approveNDA(n.id)} style={{ background: '#d1fae5', color: '#065f46', border: 'none', padding: '0.25rem 0.6rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
                    Freigeben
                  </button>
                  <button onClick={() => rejectNDA(n.id)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '0.25rem 0.6rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
                    Ablehnen
                  </button>
                </div>
              </div>
            ))}
            {ndas.filter(n => ['requested', 'signed'].includes(n.status)).length === 0 && (
              <p style={{ color: '#999', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem 0' }}>Keine offenen Anfragen</p>
            )}
          </div>
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e8e4dc' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['Codename', 'Branche', 'Region', 'Deal-Typ', 'Status', 'NDAs', 'Freigaben'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: C.navy, fontSize: '0.78rem', letterSpacing: '0.04em' }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f0ede7' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: C.navy }}>{p.codename}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#555' }}>{p.industry}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#555' }}>{p.region}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#555' }}>{p.deal_type}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ background: p.status === 'active' ? '#d1fae5' : p.status === 'draft' ? '#fef3c7' : '#f0f0f0', color: p.status === 'active' ? '#065f46' : '#555', padding: '0.2rem 0.55rem', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600 }}>
                      {p.status === 'active' ? 'Aktiv' : p.status === 'draft' ? 'Entwurf' : 'Geschlossen'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#555', textAlign: 'center' }}>{p.nda_count}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#555', textAlign: 'center' }}>{p.approved_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* NDAs Tab */}
      {activeTab === 'ndas' && (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e8e4dc' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['Käufer', 'Unternehmen', 'Projekt', 'Status', 'Datum', 'Aktion'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: C.navy, fontSize: '0.78rem' }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ndas.map(n => {
                const s = statusMap[n.status] || statusMap.requested;
                return (
                  <tr key={n.id} style={{ borderBottom: '1px solid #f0ede7' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: C.navy, fontSize: '0.82rem' }}>{n.user_name}</div>
                      <div style={{ color: '#888', fontSize: '0.72rem' }}>{n.user_email}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#555', fontSize: '0.82rem' }}>{n.user_company || '–'}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: C.navy, fontSize: '0.82rem' }}>{n.project_codename}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ background: s.bg, color: s.color, padding: '0.2rem 0.55rem', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600 }}>{s.label}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#888', fontSize: '0.78rem' }}>{new Date(n.requested_at).toLocaleDateString('de-DE')}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {!['approved', 'rejected'].includes(n.status) && (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={() => approveNDA(n.id)} style={{ background: '#d1fae5', color: '#065f46', border: 'none', padding: '0.25rem 0.6rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>Freigeben</button>
                          <button onClick={() => rejectNDA(n.id)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '0.25rem 0.6rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>Ablehnen</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e8e4dc' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['Name', 'Unternehmen', 'Käufertyp', 'NDAs', 'Freigaben', 'Registriert'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: C.navy, fontSize: '0.78rem' }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f0ede7' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 600, color: C.navy, fontSize: '0.85rem' }}>{u.first_name} {u.last_name}</div>
                    <div style={{ color: '#888', fontSize: '0.72rem' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#555', fontSize: '0.82rem' }}>{u.company || '–'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ background: '#e8f0f8', color: C.navy, padding: '0.2rem 0.55rem', borderRadius: 20, fontSize: '0.7rem' }}>
                      {u.buyer_type === 'strategic' ? 'Strategisch' : u.buyer_type === 'financial' ? 'Finanziell' : u.buyer_type || '–'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#555', textAlign: 'center' }}>{u.nda_count}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#555', textAlign: 'center' }}>{u.approved_count}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#888', fontSize: '0.78rem' }}>{new Date(u.created_at).toLocaleDateString('de-DE')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Project Modal */}
      {showNewProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: 700, color: C.navy }}>Neues Projekt anlegen</h2>
              <button onClick={() => setShowNewProject(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
            </div>
            <form onSubmit={createProject}>
              {[
                ['Codename', 'codename', 'Projekt Saturn', true],
                ['Branche', 'industry', 'Maschinenbau', true],
                ['Region', 'region', 'Bayern', true],
                ['Umsatzband', 'revenue_band', '5–10 Mio. €', true],
                ['EBITDA-Band', 'ebitda_band', '1–2 Mio. €', true],
                ['Deal-Typ', 'deal_type', 'Nachfolge', true],
              ].map(([label, key, ph, req]) => (
                <div key={key} style={{ marginBottom: '0.9rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#333', marginBottom: '0.3rem' }}>{label}{req ? ' *' : ''}</label>
                  <input value={newProject[key]} onChange={set(key)} placeholder={ph} required={req} style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.875rem', outline: 'none' }} />
                </div>
              ))}
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#333', marginBottom: '0.3rem' }}>Kurzbeschreibung *</label>
                <textarea value={newProject.short_description} onChange={set('short_description')} required rows={3} style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.875rem', outline: 'none', resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#333', marginBottom: '0.3rem' }}>Status</label>
                <select value={newProject.status} onChange={set('status')} style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.875rem', background: '#fff' }}>
                  <option value="draft">Entwurf</option>
                  <option value="active">Aktiv (veröffentlichen)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowNewProject(false)} style={{ flex: 1, padding: '0.7rem', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Abbrechen</button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: '0.7rem', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Wird gespeichert...' : 'Projekt erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
