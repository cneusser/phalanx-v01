import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import {
  BarChart3, Users, FileText, CheckCircle, Plus, Eye, X, Building2,
  Edit2, Activity, Send, Download, Upload, Trash2, Lock, Globe, Shield,
  ClipboardList, ChevronLeft, ChevronRight,
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

const KPICard = ({ label, value, sub, icon: Icon, color = C.navy }) => (
  <div style={{ background: C.card, borderRadius: 6, padding: '1.4rem', border: `1px solid ${C.border}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: '2rem', fontWeight: 700, color }}>{value}</div>
        <div style={{ fontSize: '0.82rem', color: C.muted, marginTop: '0.15rem' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: '0.1rem' }}>{sub}</div>}
      </div>
      <div style={{ width: 40, height: 40, background: `${color}12`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={color} />
      </div>
    </div>
  </div>
);

const statusMap = {
  requested: { label: 'Angefordert', color: '#f59e0b', bg: '#fef3c7' },
  sent:      { label: 'Versendet',   color: '#3b82f6', bg: '#dbeafe' },
  signed:    { label: 'Unterschrieben', color: '#8b5cf6', bg: '#ede9fe' },
  approved:  { label: 'Freigegeben', color: '#10b981', bg: '#d1fae5' },
  rejected:  { label: 'Abgelehnt',   color: '#ef4444', bg: '#fee2e2' },
};

// Audit-Trail Action Badge
const auditActionStyle = (action) => {
  if (!action) return { bg: '#f1f5f9', color: '#334155' };
  const a = action.toUpperCase();
  if (a.includes('UPLOAD') || a.includes('CREATE')) return { bg: '#dbeafe', color: '#1e40af' };
  if (a.includes('DOWNLOAD')) return { bg: '#dcfce7', color: '#166534' };
  if (a.includes('DELETE')) return { bg: '#fee2e2', color: '#991b1b' };
  if (a.includes('APPROVED') || a.includes('APPROVE')) return { bg: '#d1fae5', color: '#065f46' };
  if (a.includes('REJECTED') || a.includes('REJECT')) return { bg: '#fee2e2', color: '#991b1b' };
  if (a.includes('SIGNED') || a.includes('SIGN')) return { bg: '#ede9fe', color: '#5b21b6' };
  if (a.includes('UPDATE')) return { bg: '#fef3c7', color: '#92400e' };
  return { bg: '#f1f5f9', color: '#334155' };
};

const INPUT_STYLE = {
  width: '100%', padding: '0.6rem 0.8rem',
  border: `1px solid ${C.border}`, borderRadius: 6,
  fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
  background: '#fff',
};

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [ndas, setNdas] = useState([]);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Audit-Trail state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPages, setAuditPages] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState('');

  // New project modal
  const [showNewProject, setShowNewProject] = useState(false);
  const emptyProject = {
    codename: '', industry: '', region: '', revenue_band: '', ebitda_band: '',
    deal_type: '', short_description: '', status: 'draft', mandate_type: 'ma',
    stage: '', investment_needed: '', equity_stake: '', post_money_valuation: '',
    tam_band: '', sector_emoji: '', location_city: '',
  };
  const [newProject, setNewProject] = useState(emptyProject);
  const [saving, setSaving] = useState(false);

  // Edit project modal
  const [editProject, setEditProject] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const [msg, setMsg] = useState({ text: '', type: 'success' });

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

  async function loadActivity() {
    try {
      const data = await api.get('/admin/activity');
      setActivity(data || []);
    } catch (e) { console.error(e); }
  }

  async function loadAuditLogs(page = 1) {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams({ page });
      if (auditActionFilter) params.set('action', auditActionFilter);
      const data = await api.get(`/admin/audit-logs?${params.toString()}`);
      setAuditLogs(data.logs || []);
      setAuditTotal(data.total || 0);
      setAuditPage(data.page || 1);
      setAuditPages(data.pages || 1);
    } catch (e) { console.error(e); }
    finally { setAuditLoading(false); }
  }

  useEffect(() => {
    if (activeTab === 'activity') loadActivity();
    if (activeTab === 'audit') loadAuditLogs(1);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'audit') loadAuditLogs(auditPage);
  }, [auditPage, auditActionFilter]);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: 'success' }), 3500);
  };

  async function approveUser(id) {
    try {
      await api.put(`/admin/users/${id}/approve`, {});
      showMsg('Nutzer freigegeben ✓');
      loadAll();
    } catch (e) { showMsg('Fehler: ' + e.message, 'error'); }
  }

  async function deactivateUser(id) {
    if (!confirm('Nutzer wirklich deaktivieren?')) return;
    try {
      await api.put(`/admin/users/${id}/deactivate`, {});
      showMsg('Nutzer deaktiviert');
      loadAll();
    } catch (e) { showMsg('Fehler: ' + e.message, 'error'); }
  }

  async function publishProject(id) {
    try {
      await api.put(`/admin/projects/${id}/publish`, {});
      showMsg('Projekt veröffentlicht ✓');
      loadAll();
    } catch (e) { showMsg('Fehler: ' + e.message, 'error'); }
  }

  async function unpublishProject(id) {
    if (!confirm('Projekt zurückziehen (Entwurf)?')) return;
    try {
      await api.put(`/admin/projects/${id}/unpublish`, {});
      showMsg('Projekt zurückgezogen');
      loadAll();
    } catch (e) { showMsg('Fehler: ' + e.message, 'error'); }
  }

  async function approveNDA(id) {
    try {
      await api.put(`/admin/ndas/${id}/approve`, {});
      showMsg('NDA freigegeben');
      loadAll();
    } catch (e) { showMsg('Fehler: ' + e.message, 'error'); }
  }

  async function rejectNDA(id) {
    if (!confirm('NDA wirklich ablehnen?')) return;
    try {
      await api.put(`/admin/ndas/${id}/reject`, {});
      showMsg('NDA abgelehnt');
      loadAll();
    } catch (e) { showMsg('Fehler: ' + e.message, 'error'); }
  }

  async function sendNDA(nda) {
    if (!confirm(`NDA für ${nda.user_name} (${nda.project_codename}) als "Versendet" markieren?`)) return;
    try {
      await api.put(`/ndas/${nda.project_id}/send`, { user_id: nda.user_id });
      showMsg('NDA als "Versendet" markiert');
      loadAll();
    } catch (e) { showMsg('Fehler: ' + e.message, 'error'); }
  }

  async function createProject(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/projects', { ...newProject, highlights: [] });
      showMsg('Projekt erstellt');
      setShowNewProject(false);
      setNewProject(emptyProject);
      loadAll();
    } catch (e) { showMsg('Fehler: ' + e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function saveEditProject(e) {
    e.preventDefault();
    setEditSaving(true);
    try {
      await api.put(`/admin/projects/${editProject.id}`, editProject);
      showMsg('Projekt aktualisiert');
      setEditProject(null);
      loadAll();
    } catch (e) { showMsg('Fehler: ' + e.message, 'error'); }
    finally { setEditSaving(false); }
  }

  const setNew = k => e => setNewProject(p => ({ ...p, [k]: e.target.value }));
  const setEdit = k => e => setEditProject(p => ({ ...p, [k]: e.target.value }));

  // Dokument-Upload
  const [uploadProject, setUploadProject] = useState(null);
  const [uploadState, setUploadState] = useState({
    file: null, description: '', access_level: 'nda',
    uploading: false, done: [], error: '',
  });
  const fileInputRef = useRef(null);

  function openUpload(project) {
    setUploadProject(project);
    setUploadState({ file: null, description: '', access_level: 'nda', uploading: false, done: [], error: '' });
  }

  async function doUpload(e) {
    e.preventDefault();
    if (!uploadState.file) return;
    setUploadState(s => ({ ...s, uploading: true, error: '' }));
    try {
      const fd = new FormData();
      fd.append('file', uploadState.file);
      fd.append('description', uploadState.description);
      fd.append('access_level', uploadState.access_level);
      const result = await api.upload(`/documents/${uploadProject.id}`, fd);
      setUploadState(s => ({
        ...s, uploading: false, file: null, description: '',
        done: [...s.done, result.filename],
      }));
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setUploadState(s => ({ ...s, uploading: false, error: err.message }));
    }
  }

  async function deleteDocument(projectId, docId, filename) {
    if (!confirm(`Dokument "${filename}" wirklich löschen?`)) return;
    try {
      await api.delete(`/documents/${projectId}/${docId}`);
      showMsg('Dokument gelöscht');
      if (uploadProject?.id === projectId) {
        const docs = await api.get(`/documents/${projectId}`);
        setUploadState(s => ({ ...s, existingDocs: docs }));
      }
    } catch (err) {
      showMsg('Fehler: ' + err.message, 'error');
    }
  }

  async function loadProjectDocs(projectId) {
    try {
      const docs = await api.get(`/documents/${projectId}`);
      setUploadState(s => ({ ...s, existingDocs: docs }));
    } catch { /* ignore */ }
  }

  if (loading) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: C.muted }}>
      <div style={{ width: 32, height: 32, margin: '0 auto 1rem', border: `3px solid ${C.border}`, borderTop: `3px solid ${C.navy}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      Wird geladen...
    </div>
  );

  const tabs = ['overview', 'projects', 'ndas', 'users', 'activity', 'audit'];
  const tabLabels = {
    overview: 'Übersicht',
    projects: 'Projekte',
    ndas:     'NDA-Anfragen',
    users:    'Nutzer',
    activity: 'Aktivitätslog',
    audit:    'Audit-Trail',
  };
  const tabIcons = {
    activity: Activity,
    audit:    ClipboardList,
  };

  const projectFields = [
    ['Codename', 'codename', 'Projekt Saturn', true],
    ['Branche', 'industry', 'Maschinenbau', true],
    ['Region', 'region', 'Bayern', true],
    ['Umsatzband', 'revenue_band', '5–10 Mio. €', true],
    ['EBITDA-Band', 'ebitda_band', '1–2 Mio. €', true],
    ['Deal-Typ', 'deal_type', 'Nachfolge', true],
  ];

  const AUDIT_ACTIONS = [
    '', 'CREATE_PROJECT', 'UPDATE_PROJECT', 'UPLOAD_DOCUMENT', 'DOWNLOAD_DOCUMENT',
    'DELETE_DOCUMENT', 'NDA_APPROVED', 'NDA_REJECTED', 'NDA_SIGNED',
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2.5rem 1.5rem', background: C.bg, minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 700, color: C.text }}>Admin-Dashboard</h1>
          <p style={{ color: C.muted, fontSize: '0.875rem' }}>Plattformverwaltung & Transaktionscontrolling</p>
        </div>
        <button onClick={() => setShowNewProject(true)} style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: C.navy, color: '#fff', border: 'none',
          padding: '0.65rem 1.25rem', borderRadius: 6, cursor: 'pointer',
          fontWeight: 600, fontSize: '0.875rem',
        }}>
          <Plus size={16} /> Neues Projekt
        </button>
      </div>

      {msg.text && (
        <div style={{
          background: msg.type === 'error' ? '#fee2e2' : '#d1fae5',
          border: `1px solid ${msg.type === 'error' ? '#fca5a5' : '#6ee7b7'}`,
          borderRadius: 6, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem',
          color: msg.type === 'error' ? '#991b1b' : '#065f46',
        }}>
          {msg.text}
        </div>
      )}

      {/* KPIs */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <KPICard label="Aktive Projekte" value={stats.projects.active} sub={`${stats.projects.total} gesamt · ${stats.projects.draft} Entwurf`} icon={Building2} />
          <KPICard label="Registrierte Nutzer" value={stats.users.total} sub={stats.users.pending > 0 ? `⚠️ ${stats.users.pending} ausstehend` : `+${stats.users.this_week} diese Woche`} icon={Users} color={stats.users.pending > 0 ? '#f59e0b' : '#8b5cf6'} />
          <KPICard label="NDA-Anfragen" value={stats.ndas.total} sub={`${stats.ndas.requested} offen`} icon={FileText} color="#f59e0b" />
          <KPICard label="Freigaben" value={stats.ndas.approved} sub={`${stats.ndas.signed} unterschrieben`} icon={CheckCircle} color="#10b981" />
        </div>
      )}

      {/* Pending Users Alert */}
      {stats && stats.users.pending > 0 && (
        <div
          onClick={() => setActiveTab('users')}
          style={{
            background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6,
            padding: '0.75rem 1rem', marginBottom: '1.25rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>⏳</span>
          <span style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: 600 }}>
            {stats.users.pending} neue Registrierung{stats.users.pending > 1 ? 'en warten' : ' wartet'} auf Freigabe — jetzt prüfen →
          </span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.15rem', borderBottom: `1px solid ${C.border}`, marginBottom: '1.5rem', overflowX: 'auto' }}>
        {tabs.map(tab => {
          const Icon = tabIcons[tab];
          return (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '0.6rem 1.1rem', border: 'none', background: 'transparent', cursor: 'pointer',
              fontWeight: activeTab === tab ? 600 : 400, fontSize: '0.875rem',
              color: activeTab === tab ? C.navy : C.muted,
              borderBottom: activeTab === tab ? `2px solid ${C.navy}` : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              whiteSpace: 'nowrap',
            }}>
              {Icon && <Icon size={14} />}
              {tabLabels[tab]}
            </button>
          );
        })}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ background: C.card, borderRadius: 6, padding: '1.5rem', border: `1px solid ${C.border}` }}>
            <h3 style={{ fontWeight: 600, color: C.text, marginBottom: '1rem', fontSize: '0.95rem' }}>Projekt-Pipeline</h3>
            {projects.slice(0, 5).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: C.text }}>{p.codename}</div>
                  <div style={{ fontSize: '0.72rem', color: C.muted }}>{p.industry} · {p.nda_count} NDAs</div>
                </div>
                <span style={{ background: p.status === 'active' ? '#d1fae5' : '#f0f0f0', color: p.status === 'active' ? '#065f46' : '#666', padding: '0.2rem 0.55rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600 }}>
                  {p.status === 'active' ? 'Aktiv' : p.status === 'draft' ? 'Entwurf' : 'Geschlossen'}
                </span>
              </div>
            ))}
          </div>
          <div style={{ background: C.card, borderRadius: 6, padding: '1.5rem', border: `1px solid ${C.border}` }}>
            <h3 style={{ fontWeight: 600, color: C.text, marginBottom: '1rem', fontSize: '0.95rem' }}>Offene NDA-Anfragen</h3>
            {ndas.filter(n => ['requested', 'signed'].includes(n.status)).slice(0, 6).map(n => (
              <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', color: C.text }}>{n.user_name}</div>
                  <div style={{ fontSize: '0.72rem', color: C.muted }}>{n.project_codename}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {n.status === 'requested' && (
                    <button onClick={() => sendNDA(n)} style={{ background: '#dbeafe', color: '#1d4ed8', border: 'none', padding: '0.25rem 0.6rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
                      Versenden
                    </button>
                  )}
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

        {/* Pending User Approvals */}
        {users.filter(u => !u.is_approved).length > 0 && (
          <div style={{ background: C.card, borderRadius: 6, padding: '1.5rem', border: `1px solid #fcd34d`, marginTop: '1.5rem' }}>
            <h3 style={{ fontWeight: 600, color: '#92400e', marginBottom: '1rem', fontSize: '0.95rem' }}>
              ⏳ Ausstehende Registrierungen ({users.filter(u => !u.is_approved).length})
            </h3>
            {users.filter(u => !u.is_approved).map(u => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: C.text }}>{u.first_name} {u.last_name}</div>
                  <div style={{ fontSize: '0.72rem', color: C.muted }}>{u.email} · {u.role === 'seller' ? 'Verkäufer' : 'Käufer'} · {new Date(u.created_at).toLocaleDateString('de-DE')}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button onClick={() => approveUser(u.id)} style={{ background: '#d1fae5', color: '#065f46', border: 'none', padding: '0.3rem 0.65rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>
                    ✓ Freigeben
                  </button>
                  <button onClick={() => deactivateUser(u.id)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '0.3rem 0.65rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
                    Ablehnen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </>
      )}

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div style={{ background: C.card, borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['Typ', 'Name / Codename', 'Branche', 'Deal-Typ', 'Status', 'NDAs', 'Aktionen'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: C.navy, fontSize: '0.75rem', letterSpacing: '0.04em' }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ background: p.mandate_type === 'fundraising' ? '#ede9fe' : C.bg, color: p.mandate_type === 'fundraising' ? '#5b21b6' : C.navy, padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700 }}>
                      {p.mandate_type === 'fundraising' ? 'Startup' : 'M&A'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 600, color: C.text, fontSize: '0.85rem' }}>{p.codename}</div>
                    {p.mandate_type === 'fundraising' && p.stage && (
                      <div style={{ fontSize: '0.7rem', color: C.muted }}>{p.stage} · {p.investment_needed || '—'}</div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#555', fontSize: '0.82rem' }}>{p.industry}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#555', fontSize: '0.82rem' }}>{p.deal_type}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ background: p.status === 'active' ? '#d1fae5' : p.status === 'draft' ? '#fef3c7' : '#f0f0f0', color: p.status === 'active' ? '#065f46' : '#555', padding: '0.2rem 0.55rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600 }}>
                      {p.status === 'active' ? 'Aktiv' : p.status === 'draft' ? 'Entwurf' : 'Geschlossen'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#555', textAlign: 'center', fontSize: '0.82rem' }}>{p.nda_count}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {p.status !== 'active' ? (
                        <button onClick={() => publishProject(p.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#d1fae5', color: '#065f46', border: 'none', padding: '0.3rem 0.6rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
                          ✓ Veröffentlichen
                        </button>
                      ) : (
                        <button onClick={() => unpublishProject(p.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#fef3c7', color: '#92400e', border: 'none', padding: '0.3rem 0.6rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
                          ↩ Entwurf
                        </button>
                      )}
                      <Link to={`/projekte/${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: C.bg, color: C.navy, padding: '0.3rem 0.6rem', borderRadius: 5, fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none', border: `1px solid ${C.border}` }}>
                        <Eye size={11} /> Ansehen
                      </Link>
                      <button onClick={() => setEditProject({ ...p })} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#e0e7ff', color: '#3730a3', border: 'none', padding: '0.3rem 0.6rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
                        <Edit2 size={11} /> Bearbeiten
                      </button>
                      <button onClick={() => { openUpload(p); loadProjectDocs(p.id); }} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#dcfce7', color: '#166534', border: 'none', padding: '0.3rem 0.6rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
                        <Upload size={11} /> Dokumente
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* NDAs Tab */}
      {activeTab === 'ndas' && (
        <div style={{ background: C.card, borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['Käufer', 'Unternehmen', 'Projekt', 'Status', 'Datum', 'Online §10', 'Aktion'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: C.navy, fontSize: '0.75rem' }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ndas.map(n => {
                const s = statusMap[n.status] || statusMap.requested;
                return (
                  <tr key={n.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: C.text, fontSize: '0.82rem' }}>{n.user_name}</div>
                      <div style={{ color: C.muted, fontSize: '0.72rem' }}>{n.user_email}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#555', fontSize: '0.82rem' }}>{n.user_company || '–'}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: C.text, fontSize: '0.82rem' }}>{n.project_codename}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ background: s.bg, color: s.color, padding: '0.2rem 0.55rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600 }}>{s.label}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: C.muted, fontSize: '0.78rem' }}>{new Date(n.requested_at).toLocaleDateString('de-DE')}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {n.online_consent_at ? (
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>Online §10</div>
                          <div style={{ fontSize: '0.68rem', color: C.muted }}>{n.consent_name}</div>
                          <div style={{ fontSize: '0.68rem', color: '#aaa' }}>{new Date(n.online_consent_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                          {n.signed_pdf_path && (
                            <button onClick={async () => {
                              const token = localStorage.getItem('phalanx_token');
                              const res = await fetch(`/api/ndas/${n.project_id}/download?user_id=${n.user_id}`, { headers: { Authorization: `Bearer ${token}` } });
                              if (res.ok) { const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = n.signed_pdf_path; a.click(); }
                            }} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', background: '#e0f2fe', color: '#0369a1', border: 'none', padding: '0.2rem 0.5rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600, marginTop: '0.2rem' }}>
                              <Download size={9} /> PDF
                            </button>
                          )}
                        </div>
                      ) : <span style={{ fontSize: '0.72rem', color: '#ccc' }}>–</span>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {n.status === 'requested' && (
                          <button onClick={() => sendNDA(n)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#dbeafe', color: '#1d4ed8', border: 'none', padding: '0.25rem 0.6rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
                            <Send size={10} /> Versenden
                          </button>
                        )}
                        {!['approved', 'rejected'].includes(n.status) && (
                          <>
                            <button onClick={() => approveNDA(n.id)} style={{ background: '#d1fae5', color: '#065f46', border: 'none', padding: '0.25rem 0.6rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>Freigeben</button>
                            <button onClick={() => rejectNDA(n.id)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '0.25rem 0.6rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>Ablehnen</button>
                          </>
                        )}
                      </div>
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
        <div style={{ background: C.card, borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['Name', 'Rolle', 'Status', 'NDAs', 'Registriert', 'Aktionen'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: C.navy, fontSize: '0.75rem' }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}`, background: u.is_approved ? 'transparent' : '#fffbeb' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 600, color: C.text, fontSize: '0.85rem' }}>{u.first_name} {u.last_name}</div>
                    <div style={{ color: C.muted, fontSize: '0.72rem' }}>{u.email}</div>
                    {u.company && <div style={{ color: C.muted, fontSize: '0.7rem' }}>{u.company}</div>}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ background: u.role === 'seller' ? '#ede9fe' : C.bg, color: u.role === 'seller' ? '#5b21b6' : C.navy, padding: '0.2rem 0.55rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, border: `1px solid ${u.role === 'seller' ? '#ddd6fe' : C.border}` }}>
                      {u.role === 'seller' ? 'Verkäufer' : u.role === 'buyer' ? 'Käufer' : u.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {u.is_approved ? (
                      <span style={{ background: '#d1fae5', color: '#065f46', padding: '0.2rem 0.55rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600 }}>✓ Freigegeben</span>
                    ) : (
                      <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.55rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600 }}>⏳ Ausstehend</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#555', textAlign: 'center' }}>{u.nda_count}</td>
                  <td style={{ padding: '0.75rem 1rem', color: C.muted, fontSize: '0.78rem' }}>{new Date(u.created_at).toLocaleDateString('de-DE')}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {!u.is_approved && (
                        <button onClick={() => approveUser(u.id)} style={{ background: '#d1fae5', color: '#065f46', border: 'none', padding: '0.3rem 0.65rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>
                          ✓ Freigeben
                        </button>
                      )}
                      {u.is_active ? (
                        <button onClick={() => deactivateUser(u.id)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '0.3rem 0.65rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
                          Deaktivieren
                        </button>
                      ) : (
                        <button onClick={() => approveUser(u.id)} style={{ background: '#dbeafe', color: '#1d4ed8', border: 'none', padding: '0.3rem 0.65rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
                          Aktivieren
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Activity Log Tab */}
      {activeTab === 'activity' && (
        <div style={{ background: C.card, borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          {activity.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: C.muted }}>Keine Aktivitäten gefunden.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {['Zeitpunkt', 'Benutzer', 'Aktion', 'Entität', 'Details'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: C.navy, fontSize: '0.75rem' }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activity.map((a, i) => {
                  const badge = auditActionStyle(a.action);
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '0.65rem 1rem', color: C.muted, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {new Date(a.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '0.65rem 1rem', color: C.text, fontSize: '0.8rem', fontWeight: 500 }}>{a.user_email || `User #${a.user_id}`}</td>
                      <td style={{ padding: '0.65rem 1rem' }}>
                        <span style={{ background: badge.bg, color: badge.color, padding: '0.2rem 0.55rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600 }}>
                          {a.action}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 1rem', color: '#555', fontSize: '0.78rem' }}>{a.entity_type} {a.entity_id ? `#${a.entity_id}` : ''}</td>
                      <td style={{ padding: '0.65rem 1rem', color: '#777', fontSize: '0.78rem' }}>{a.details || '–'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Audit-Trail Tab */}
      {activeTab === 'audit' && (
        <div>
          {/* Filter-Leiste */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.82rem', color: C.muted, fontWeight: 600 }}>Filter:</div>
            <select
              value={auditActionFilter}
              onChange={e => { setAuditActionFilter(e.target.value); setAuditPage(1); }}
              style={{ ...INPUT_STYLE, width: 'auto', minWidth: 200, fontSize: '0.82rem' }}
            >
              <option value="">Alle Aktionen</option>
              {AUDIT_ACTIONS.filter(a => a).map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <div style={{ fontSize: '0.78rem', color: C.muted, marginLeft: 'auto' }}>
              {auditTotal} Einträge gesamt
            </div>
          </div>

          <div style={{ background: C.card, borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
            {auditLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: C.muted }}>
                <div style={{ width: 28, height: 28, margin: '0 auto 0.75rem', border: `2px solid ${C.border}`, borderTop: `2px solid ${C.navy}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Lade Audit-Log...
              </div>
            ) : auditLogs.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: C.muted }}>Keine Einträge gefunden.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {['Datum / Uhrzeit', 'Benutzer', 'Aktion', 'Ressource', 'Details', 'IP'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: C.navy, fontSize: '0.73rem', letterSpacing: '0.04em', borderBottom: `1px solid ${C.border}` }}>
                        {h.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, i) => {
                    const badge = auditActionStyle(log.action);
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '0.7rem 1rem', color: C.muted, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {new Date(log.created_at).toLocaleString('de-DE', {
                            day: '2-digit', month: '2-digit', year: '2-digit',
                            hour: '2-digit', minute: '2-digit', second: '2-digit',
                          })}
                        </td>
                        <td style={{ padding: '0.7rem 1rem' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.8rem', color: C.text }}>
                            {log.first_name && log.last_name ? `${log.first_name} ${log.last_name}` : log.email || `User #${log.user_id}`}
                          </div>
                          {log.email && (
                            <div style={{ fontSize: '0.7rem', color: C.muted }}>{log.email}</div>
                          )}
                        </td>
                        <td style={{ padding: '0.7rem 1rem' }}>
                          <span style={{ background: badge.bg, color: badge.color, padding: '0.22rem 0.55rem', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '0.7rem 1rem', color: '#555', fontSize: '0.78rem' }}>
                          {log.entity_type ? `${log.entity_type}${log.entity_id ? ` #${log.entity_id}` : ''}` : '–'}
                        </td>
                        <td style={{ padding: '0.7rem 1rem', color: '#666', fontSize: '0.78rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.details || '–'}
                        </td>
                        <td style={{ padding: '0.7rem 1rem', color: C.muted, fontSize: '0.73rem', fontFamily: 'monospace' }}>
                          {log.ip_address || '–'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {auditPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                disabled={auditPage <= 1}
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.45rem 0.85rem', border: `1px solid ${C.border}`, borderRadius: 6, background: C.card, cursor: auditPage <= 1 ? 'not-allowed' : 'pointer', opacity: auditPage <= 1 ? 0.4 : 1, fontSize: '0.82rem', fontWeight: 600, color: C.text }}
              >
                <ChevronLeft size={14} /> Zurück
              </button>
              <span style={{ fontSize: '0.82rem', color: C.muted }}>
                Seite {auditPage} von {auditPages}
              </span>
              <button
                onClick={() => setAuditPage(p => Math.min(auditPages, p + 1))}
                disabled={auditPage >= auditPages}
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.45rem 0.85rem', border: `1px solid ${C.border}`, borderRadius: 6, background: C.card, cursor: auditPage >= auditPages ? 'not-allowed' : 'pointer', opacity: auditPage >= auditPages ? 0.4 : 1, fontSize: '0.82rem', fontWeight: 600, color: C.text }}
              >
                Weiter <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* New Project Modal */}
      {showNewProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: '2rem', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: 700, color: C.text }}>Neues Projekt anlegen</h2>
              <button onClick={() => setShowNewProject(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
            </div>
            <form onSubmit={createProject}>
              <div style={{ marginBottom: '1rem', background: C.bg, borderRadius: 6, padding: '0.75rem', border: `1px solid ${C.border}` }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.text, marginBottom: '0.5rem' }}>Mandat-Typ *</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[['ma', 'M&A-Transaktion'], ['fundraising', 'Startup-Finanzierung']].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setNewProject(p => ({ ...p, mandate_type: v }))} style={{
                      flex: 1, padding: '0.5rem', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                      background: newProject.mandate_type === v ? C.navy : '#fff',
                      color: newProject.mandate_type === v ? '#fff' : '#555',
                      border: `1.5px solid ${newProject.mandate_type === v ? C.navy : '#ddd'}`,
                    }}>{l}</button>
                  ))}
                </div>
              </div>

              {[['Name / Codename', 'codename', 'z. B. Projekt Alpha', true], ['Branche', 'industry', 'Food & Nutrition', true], ['Region', 'region', 'Bayern', true]].map(([label, key, ph, req]) => (
                <div key={key} style={{ marginBottom: '0.9rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#333', marginBottom: '0.3rem' }}>{label}{req ? ' *' : ''}</label>
                  <input value={newProject[key]} onChange={setNew(key)} placeholder={ph} required={req} style={INPUT_STYLE} />
                </div>
              ))}

              {newProject.mandate_type === 'fundraising' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.9rem' }}>
                    {[['Stage', 'stage', 'Seed'], ['Deal-Typ', 'deal_type', 'Seed-Finanzierung'], ['Runden-Volumen', 'investment_needed', '€ 1,1 Mio.'], ['Investor-Stake', 'equity_stake', '~26 %'], ['Post-Money', 'post_money_valuation', '€ 3,5 Mio.'], ['TAM', 'tam_band', '€ 9,3 Mrd.']].map(([label, key, ph]) => (
                      <div key={key}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: '#555', marginBottom: '0.25rem' }}>{label}</label>
                        <input value={newProject[key] || ''} onChange={setNew(key)} placeholder={ph} style={{ ...INPUT_STYLE, fontSize: '0.82rem' }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: '0.9rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: '#555', marginBottom: '0.25rem' }}>Stadt</label>
                    <input value={newProject.location_city || ''} onChange={setNew('location_city')} placeholder="München" style={INPUT_STYLE} />
                  </div>
                </>
              )}

              {newProject.mandate_type === 'ma' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.9rem' }}>
                  {[['Umsatzband', 'revenue_band', '5–10 Mio. €'], ['EBITDA-Band', 'ebitda_band', '1–2 Mio. €'], ['Deal-Typ', 'deal_type', 'Nachfolge']].map(([label, key, ph]) => (
                    <div key={key}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: '#555', marginBottom: '0.25rem' }}>{label}</label>
                      <input value={newProject[key] || ''} onChange={setNew(key)} placeholder={ph} style={INPUT_STYLE} />
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#333', marginBottom: '0.3rem' }}>Kurzbeschreibung *</label>
                <textarea value={newProject.short_description} onChange={setNew('short_description')} required rows={3} style={{ ...INPUT_STYLE, resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#333', marginBottom: '0.3rem' }}>Status</label>
                <select value={newProject.status} onChange={setNew('status')} style={{ ...INPUT_STYLE, background: '#fff' }}>
                  <option value="draft">Entwurf</option>
                  <option value="active">Aktiv (veröffentlichen)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowNewProject(false)} style={{ flex: 1, padding: '0.7rem', border: `1px solid ${C.border}`, borderRadius: 6, background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Abbrechen</button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: '0.7rem', background: C.navy, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Wird gespeichert...' : 'Projekt erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: '2rem', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: 700, color: C.text }}>Projekt bearbeiten: {editProject.codename}</h2>
              <button onClick={() => setEditProject(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
            </div>
            <form onSubmit={saveEditProject}>
              {projectFields.map(([label, key, ph, req]) => (
                <div key={key} style={{ marginBottom: '0.9rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#333', marginBottom: '0.3rem' }}>{label}{req ? ' *' : ''}</label>
                  <input value={editProject[key] || ''} onChange={setEdit(key)} placeholder={ph} required={req} style={INPUT_STYLE} />
                </div>
              ))}
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#333', marginBottom: '0.3rem' }}>Kurzbeschreibung *</label>
                <textarea value={editProject.short_description || ''} onChange={setEdit('short_description')} required rows={3} style={{ ...INPUT_STYLE, resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#333', marginBottom: '0.3rem' }}>Status</label>
                <select value={editProject.status || 'draft'} onChange={setEdit('status')} style={{ ...INPUT_STYLE, background: '#fff' }}>
                  <option value="draft">Entwurf</option>
                  <option value="active">Aktiv</option>
                  <option value="closed">Geschlossen</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => setEditProject(null)} style={{ flex: 1, padding: '0.7rem', border: `1px solid ${C.border}`, borderRadius: 6, background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Abbrechen</button>
                <button type="submit" disabled={editSaving} style={{ flex: 2, padding: '0.7rem', background: C.navy, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, opacity: editSaving ? 0.7 : 1 }}>
                  {editSaving ? 'Wird gespeichert...' : 'Änderungen speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dokument-Upload Modal */}
      {uploadProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: '2rem', width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontWeight: 700, color: C.text, fontSize: '1.1rem', margin: 0 }}>Dokumente hochladen</h2>
                <div style={{ fontSize: '0.8rem', color: C.muted, marginTop: '0.2rem' }}>{uploadProject.codename}</div>
              </div>
              <button onClick={() => setUploadProject(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
            </div>

            <form onSubmit={doUpload} style={{ marginBottom: '1.5rem' }}>
              <div
                style={{ border: `2px dashed ${C.border}`, borderRadius: 8, padding: '1.5rem', textAlign: 'center', marginBottom: '1rem', background: C.bg, cursor: 'pointer' }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setUploadState(s => ({ ...s, file: f })); }}
              >
                <Upload size={24} color={C.steel} style={{ marginBottom: '0.5rem' }} />
                {uploadState.file ? (
                  <div>
                    <div style={{ fontWeight: 600, color: C.text, fontSize: '0.9rem' }}>{uploadState.file.name}</div>
                    <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: '0.2rem' }}>{(uploadState.file.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ color: '#555', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Datei hierher ziehen oder klicken</div>
                    <div style={{ fontSize: '0.72rem', color: '#aaa' }}>PDF, PPTX, DOCX, XLSX · max. 50 MB</div>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) setUploadState(s => ({ ...s, file: f })); }} />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#444', marginBottom: '0.3rem' }}>Bezeichnung (optional)</label>
                <input value={uploadState.description} onChange={e => setUploadState(s => ({ ...s, description: e.target.value }))} placeholder="z.B. Investment Teaser · Mai 2026" style={INPUT_STYLE} />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#444', marginBottom: '0.4rem' }}>Zugangslevel</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[
                    ['public',   'Öffentlich',   'Ohne Login sichtbar'],
                    ['nda',      'NDA',           'Nach NDA-Unterzeichnung'],
                    ['approved', 'Freigegeben',   'Nur nach Freigabe'],
                  ].map(([v, label, hint]) => (
                    <button key={v} type="button" onClick={() => setUploadState(s => ({ ...s, access_level: v }))} style={{
                      flex: 1, padding: '0.45rem 0.3rem', borderRadius: 6, cursor: 'pointer',
                      textAlign: 'center', fontSize: '0.73rem', fontWeight: 600,
                      background: uploadState.access_level === v ? C.navy : '#f5f5f5',
                      color:      uploadState.access_level === v ? '#fff'  : '#555',
                      border:     uploadState.access_level === v ? `1.5px solid ${C.navy}` : `1.5px solid ${C.border}`,
                    }}>
                      <div>{label}</div>
                      <div style={{ fontSize: '0.62rem', opacity: 0.75, marginTop: '0.1rem' }}>{hint}</div>
                    </button>
                  ))}
                </div>
              </div>

              {uploadState.error && (
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.6rem 0.85rem', borderRadius: 6, fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                  {uploadState.error}
                </div>
              )}

              <button type="submit" disabled={!uploadState.file || uploadState.uploading} style={{ width: '100%', padding: '0.75rem', background: C.navy, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', opacity: (!uploadState.file || uploadState.uploading) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                <Upload size={15} />
                {uploadState.uploading ? 'Wird hochgeladen...' : 'Hochladen'}
              </button>
            </form>

            {uploadState.done.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                {uploadState.done.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#dcfce7', borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: '0.35rem', fontSize: '0.8rem', color: '#166534' }}>
                    <CheckCircle size={13} /> {f} hochgeladen
                  </div>
                ))}
              </div>
            )}

            {uploadState.existingDocs?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.73rem', color: C.muted, fontWeight: 700, letterSpacing: '0.07em', marginBottom: '0.5rem' }}>VORHANDENE DOKUMENTE</div>
                {uploadState.existingDocs.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', background: C.bg, borderRadius: 6, marginBottom: '0.35rem', border: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      <FileText size={13} color={C.navy} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.8rem', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</div>
                        <div style={{ fontSize: '0.68rem', color: C.muted }}>
                          {doc.access_level === 'public' ? 'Öffentlich' : doc.access_level === 'nda' ? 'NDA' : 'Freigegeben'}
                          {doc.description ? ` · ${doc.description}` : ''}
                          {doc.file_size ? ` · ${(doc.file_size / 1024 / 1024).toFixed(1)} MB` : ''}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => deleteDocument(uploadProject.id, doc.id, doc.filename)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '0.3rem 0.5rem', borderRadius: 5, cursor: 'pointer', flexShrink: 0 }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {uploadState.existingDocs?.length === 0 && (
              <div style={{ fontSize: '0.8rem', color: '#aaa', textAlign: 'center', padding: '0.75rem 0' }}>
                Noch keine Dokumente für dieses Mandat.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
