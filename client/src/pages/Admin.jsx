import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3, Users, FileText, CheckCircle, Plus, Eye, X, Building2,
  Edit2, Activity, Send, Download, Upload, Trash2, Lock, Globe, Shield,
  ClipboardList, ChevronLeft, ChevronRight,
} from 'lucide-react';
import GroupedSelect from '../components/GroupedSelect';
import { NACE_INDUSTRIES, BUNDESLAENDER, DEAL_TYPES_MA, DEAL_TYPES_FUNDRAISING, FUNDRAISING_STAGES } from '../constants/projectOptions';
import DealCrmModal, { DEAL_STATUS_LABELS, DEAL_TRANSITIONS } from '../components/DealCrmModal';
import ContactDrawer from '../components/ContactDrawer';
import TemplateAdmin from '../components/TemplateAdmin';
import TaskBoard from '../components/TaskBoard';
import MailOutbox from '../components/MailOutbox';
import RoleMatrix from '../components/RoleMatrix';

// Auswahllisten je Formularfeld (statt Freitext), abhängig vom Mandatstyp
const fieldOptions = (key, mandateType) => {
  if (key === 'industry') return NACE_INDUSTRIES;
  if (key === 'region') return BUNDESLAENDER;
  if (key === 'deal_type') return mandateType === 'fundraising' ? DEAL_TYPES_FUNDRAISING : DEAL_TYPES_MA;
  if (key === 'stage') return FUNDRAISING_STAGES;
  return null;
};

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

const KPICard = ({ label, value, sub, icon: Icon, color = C.navy, onClick }) => (
  <div onClick={onClick} style={{ background: C.card, borderRadius: 6, padding: '1.4rem', border: `1px solid ${C.border}`, cursor: onClick ? 'pointer' : 'default', transition: 'box-shadow 0.15s' }}
    onMouseEnter={onClick ? (e) => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(13,27,54,0.10)'; } : undefined}
    onMouseLeave={onClick ? (e) => { e.currentTarget.style.boxShadow = 'none'; } : undefined}>
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

// Sprint 16: leichtgewichtige Inline-SVG-Sparkline (keine Chart-Abhängigkeit)
const Sparkline = ({ data = [], color = C.accent, w = 240, h = 40 }) => {
  const vals = data.map(d => d.v);
  const max = Math.max(1, ...vals);
  const n = vals.length;
  if (!n) return <svg width={w} height={h} />;
  const step = n > 1 ? w / (n - 1) : w;
  const pts = vals.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 4) - 2).toFixed(1)}`);
  const area = `0,${h} ${pts.join(' ')} ${w},${h}`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <polygon points={area} fill={`${color}18`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

const sum = (arr = []) => arr.reduce((a, b) => a + (b.v || 0), 0);

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
  const { startBirdview, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [ndas, setNdas] = useState([]);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  // CRM-Kontakte im Dashboard (360°-Ansicht: Stammdaten, Mandate, Aktivitäten)
  const [crmContacts, setCrmContacts] = useState([]);
  const [editDoc, setEditDoc] = useState(null);   // Dokument, dessen Bezeichnung gerade bearbeitet wird
  const [roleList, setRoleList] = useState([]);   // Rollen aus der Rollen-Tabelle (für das Dropdown)
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [qaOpts, setQaOpts] = useState({});   // je Frage: { notify, is_public }
  const [contactSearch, setContactSearch] = useState('');
  const [drawerContact, setDrawerContact] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  // Sprint 16: Analytics-Cockpit
  const [analytics, setAnalytics] = useState(null);
  const [range, setRange] = useState('30d');

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

  // Nutzerverwaltung: Suche + Detail-Modal (Pitchbook-Ansicht)
  const [userSearch, setUserSearch] = useState('');
  const [userDetail, setUserDetail] = useState(null);

  // Sprint 4: Deal-CRM (Kanban-Pipeline)
  const [dealCrm, setDealCrm] = useState(null);
  // Sprint 6: Bewertungs-Leads
  const [valLeads, setValLeads] = useState([]);
  // Sprint 6.1: Multiples-Pflege (Branche × Größenklasse)
  const [valMultiples, setValMultiples] = useState([]);
  const [multEdits, setMultEdits] = useState({});   // { id: { feld: wert } }
  const [multSaving, setMultSaving] = useState(null); // id, das gerade speichert
  const [multMsg, setMultMsg] = useState('');
  // Changelog + Feedback (Community)
  const [changelog, setChangelog] = useState([]);
  const [clForm, setClForm] = useState({ version: '', title: '', items: '' });
  const [clMsg, setClMsg] = useState('');
  const [feedbackList, setFeedbackList] = useState([]);
  // Sprint 7: Ausführliche Bewertungen (Review)
  const [detVals, setDetVals] = useState([]);
  const [detOpen, setDetOpen] = useState(null);       // aufgeklappte Bewertung (Detail)
  const [detReview, setDetReview] = useState({});     // { comment, project_id }
  const [detMsg, setDetMsg] = useState('');
  // Drag & Drop der Pipeline-Karten
  const [dragDeal, setDragDeal] = useState(null);       // { id, deal_status }
  const [dragOverCol, setDragOverCol] = useState(null); // Ziel-Spalte (Hover)

  async function moveDeal(project, toStatus) {
    const from = project.deal_status || 'teaser_live';
    if (from === toStatus) return;
    if (!(DEAL_TRANSITIONS[from] || []).includes(toStatus)) {
      showMsg(`Übergang ${DEAL_STATUS_LABELS[from]} → ${DEAL_STATUS_LABELS[toStatus]} ist nicht erlaubt`, 'error');
      return;
    }
    try {
      await api.put(`/admin/projects/${project.id}/deal-status`, { deal_status: toStatus });
      showMsg(`${project.codename}: ${DEAL_STATUS_LABELS[toStatus]} ✓`);
      loadAll();
    } catch (e) { showMsg(e.message, 'error'); }
  }

  const [msg, setMsg] = useState({ text: '', type: 'success' });

  async function openUserDetail(id) {
    try {
      const d = await api.get(`/admin/users/${id}`);
      setUserDetail(d);
    } catch (e) { showMsg(e.message, 'error'); }
  }

  // Birdview: Plattform aus Sicht eines Nutzers ansehen (schreibgeschützt, protokolliert)
  async function birdview(u) {
    const name = `${u.first_name} ${u.last_name}`.trim();
    if (!window.confirm(
      `Plattform als „${name}" (${u.email}) ansehen?\n\n` +
      `• Die Ansicht ist SCHREIBGESCHÜTZT, Sie können nichts verändern.\n` +
      `• Admin- und CRM-Bereich sind währenddessen gesperrt.\n` +
      `• Der Vorgang wird revisionssicher protokolliert.\n\n` +
      `Sie können jederzeit über das Banner oben zurückkehren.`)) return;
    try { await startBirdview(u.id); }
    catch (e) { showMsg(e.message, 'error'); }
  }

  function exportUserAudit(id) {
    const token = localStorage.getItem('phalanx_token');
    fetch(`/api/admin/users/${id}/audit-export`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.blob() : Promise.reject(new Error('Export fehlgeschlagen')))
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `AuditTrail_User${id}.csv`; a.click();
        URL.revokeObjectURL(url);
      })
      .catch(e => showMsg(e.message, 'error'));
  }

  // Killswitch: Projekt endgültig löschen (doppelte Bestätigung)
  async function killProject(p) {
    if (!confirm(`Mandat "${p.codename}" ENDGÜLTIG löschen?\n\nAlle Interessenten-Zuordnungen, NDAs (inkl. signierter PDFs), Dokumente, Q&A und Aufgaben dieses Mandats werden unwiderruflich entfernt.`)) return;
    const typed = prompt(`Zur Bestätigung bitte den Codenamen eintippen:\n${p.codename}`);
    if (typed !== p.codename) { showMsg('Abgebrochen, Codename stimmte nicht überein.', 'error'); return; }
    try {
      const r = await api.delete(`/admin/projects/${p.id}`);
      showMsg(r.message || 'Mandat endgültig gelöscht ✓');
      loadAll();
    } catch (e) { showMsg(e.message, 'error'); }
  }

  async function gdprDeleteUser(id, email) {
    if (!confirm(`DSGVO-Löschung für ${email}?\n\nAlle personenbezogenen Daten, Interessen, NDA-Anfragen und signierten NDA-PDFs werden endgültig gelöscht. Vorgänge in den Protokollen werden pseudonymisiert.\n\nDies kann NICHT rückgängig gemacht werden.`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      showMsg('Nutzer DSGVO-konform gelöscht ✓');
      setUserDetail(null);
      loadAll();
    } catch (e) { showMsg(e.message, 'error'); }
  }

  useEffect(() => { loadAll(); }, []);
  // Herkunft der Kontakte (Plattform-Leads) für die Übersicht
  const [leadSources, setLeadSources] = useState([]);
  useEffect(() => { api.get('/crm/leads/sources').then(d => setLeadSources(d.sources || [])).catch(() => {}); }, []);
  // Sprint 16: Analytics beim Wechsel des Zeitraums nachladen
  const loadAnalytics = React.useCallback(async (r) => {
    try { setAnalytics(await api.get(`/admin/analytics?range=${r || range}`)); } catch (e) { console.error(e); }
  }, [range]);
  useEffect(() => { loadAnalytics(range); }, [range, loadAnalytics]);

  async function loadAll() {
    try {
      const [s, p, n, u, rq] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/projects'),
        api.get('/admin/ndas'),
        api.get('/admin/users'),
        api.get('/admin/projects/review-queue').catch(() => []),
      ]);
      setStats(s); setProjects(p); setNdas(n); setUsers(u); setReviewQueue(rq || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  // Stufe B: eingereichtes Inserat freigeben oder mit Notiz zurückweisen
  async function moderateListing(id, action) {
    let note = null;
    if (action === 'reject') {
      note = window.prompt('Grund der Zurückweisung (wird dem Verkäufer angezeigt):', '');
      if (note === null) return;
    }
    try {
      await api.post(`/admin/projects/${id}/moderate`, { action, note });
      showMsg(action === 'approve' ? 'Inserat freigegeben ✓' : 'Inserat zurückgewiesen');
      loadAll();
    } catch (e) { showMsg('Fehler: ' + e.message, 'error'); }
  }

  // Sprint 16: Kennzahlen als CSV exportieren (Funnel + Mandats-Ranking)
  function exportAnalyticsCSV() {
    if (!analytics) return;
    const rows = [['Bereich', 'Kennzahl', 'Wert']];
    (analytics.funnel || []).forEach(f => rows.push(['Funnel', f.label, f.value]));
    rows.push(['', '', '']);
    rows.push(['Mandat', 'Interessenten / NDAs / signiert / Alter(Tage) / idle(Tage) / Status', '']);
    (analytics.mandates || []).forEach(m => rows.push([m.codename, `${m.interested} / ${m.ndas} / ${m.signed} / ${m.age_days} / ${m.idle_days} / ${m.deal_status}`, '']));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url; a.download = `CapitalMatch_Analytics_${range}_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function loadActivity() {
    try {
      const data = await api.get('/admin/activity');
      setActivity(data || []);
    } catch (e) { console.error(e); }
  }

  async function loadValLeads() {
    try { setValLeads(await api.get('/admin/valuation-leads') || []); } catch (e) { console.error(e); }
  }

  async function loadValMultiples() {
    try { setValMultiples(await api.get('/admin/valuation-multiples') || []); setMultEdits({}); } catch (e) { console.error(e); }
  }

  async function loadDetVals() {
    try { setDetVals(await api.get('/detailed-valuations') || []); } catch (e) { console.error(e); }
  }
  async function loadChangelog() {
    try { setChangelog(await api.get('/community/changelog') || []); } catch (e) { console.error(e); }
  }
  async function addChangelog() {
    if (!clForm.version || !clForm.title) { setClMsg('Version und Titel erforderlich.'); return; }
    setClMsg('');
    try {
      await api.post('/community/changelog', { version: clForm.version, title: clForm.title, items: clForm.items });
      setClForm({ version: '', title: '', items: '' }); setClMsg('Eintrag hinzugefügt.'); loadChangelog();
    } catch (e) { setClMsg('Fehler: ' + e.message); }
  }
  async function loadFeedback() {
    try { setFeedbackList(await api.get('/community/feedback') || []); } catch (e) { console.error(e); }
  }
  async function setFeedbackStatus(id, status) {
    try { await api.put(`/community/feedback/${id}/status`, { status }); setFeedbackList(l => l.map(f => f.id === id ? { ...f, status } : f)); } catch (e) { console.error(e); }
  }
  async function openDetVal(row) {
    if (detOpen === row.id) { setDetOpen(null); return; }
    setDetMsg('');
    try {
      const d = await api.get(`/detailed-valuations/${row.id}`);
      setDetOpen(row.id);
      setDetReview({ comment: d.reviewer_comment || '', project_id: d.project_id || '', full: d });
    } catch (e) { setDetMsg('Fehler: ' + e.message); }
  }
  async function saveDetReview(rowId, markReviewed) {
    setDetMsg('');
    try {
      await api.put(`/detailed-valuations/${rowId}/review`, {
        reviewer_comment: detReview.comment || null,
        project_id: detReview.project_id === '' ? null : Number(detReview.project_id),
        status: markReviewed ? 'reviewed' : undefined,
      });
      setDetMsg('Review gespeichert.');
      loadDetVals();
      if (markReviewed) setDetOpen(null);
    } catch (e) { setDetMsg('Fehler: ' + e.message); }
  }
  async function downloadDetPdf(rowId) {
    try {
      const res = await fetch(`/api/detailed-valuations/${rowId}/report`, { headers: { Authorization: `Bearer ${localStorage.getItem('phalanx_token')}` } });
      if (!res.ok) throw new Error('Fehler');
      const blob = await res.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Bewertung_${rowId}.pdf`; a.click(); URL.revokeObjectURL(url);
    } catch (e) { setDetMsg('PDF-Fehler: ' + e.message); }
  }

  const MULT_FIELDS = ['micro_ebit_min', 'micro_ebit_max', 'small_ebit_min', 'small_ebit_max', 'mid_ebit_min', 'mid_ebit_max', 'revenue_multiple_min', 'revenue_multiple_max'];

  function editMult(id, field, value) {
    setMultEdits(s => ({ ...s, [id]: { ...(s[id] || {}), [field]: value } }));
  }

  async function saveMult(row) {
    const changes = multEdits[row.id];
    if (!changes || !Object.keys(changes).length) return;
    setMultSaving(row.id); setMultMsg('');
    try {
      const body = {};
      for (const f of MULT_FIELDS) if (changes[f] !== undefined) body[f] = parseFloat(String(changes[f]).replace(',', '.'));
      await api.put(`/admin/valuation-multiples/${row.id}`, body);
      setMultMsg(`„${row.label}" gespeichert.`);
      await loadValMultiples();
    } catch (e) { setMultMsg('Fehler: ' + e.message); }
    finally { setMultSaving(null); }
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

  // Nutzer → CRM-Kontakt: 360°-Ansicht öffnen (Kontakt wird bei Bedarf angelegt)
  async function changeRole(u, role) {
    if (role === u.role) return;
    if (!confirm(`Rolle von ${u.first_name} ${u.last_name} ändern?\n\nDie Rechte je Rolle sehen Sie im Tab „Rollen & Rechte".`)) return;
    try { await api.put(`/admin/users/${u.id}/role`, { role }); showMsg('Rolle geändert ✓'); loadAll(); }
    catch (e) { showMsg('Fehler: ' + e.message, 'error'); }
  }

  async function openContactForUser(u) {
    try {
      const r = await api.post(`/crm/contacts/from-user/${u.id}`, {});
      setDrawerContact(r.contact_id);
    } catch (e) { showMsg('Fehler: ' + e.message, 'error'); }
  }

  async function deleteFeedback(id) {
    if (!confirm('Feedback-Eintrag löschen?')) return;
    try { await api.delete(`/community/feedback/${id}`); showMsg('Feedback gelöscht'); loadFeedback(); loadAll(); }
    catch (e) { showMsg('Fehler: ' + e.message, 'error'); }
  }

  async function loadQuestions() {
    try { const d = await api.get('/admin/questions'); setQuestions(d.questions || []); }
    catch (e) { showMsg('Fehler: ' + e.message, 'error'); }
  }
  const qaOpt = (id) => qaOpts[id] || { notify: true, is_public: false };
  const setQaOpt = (id, patch) => setQaOpts(o => ({ ...o, [id]: { ...qaOpt(id), ...patch } }));

  async function answerQuestion(id) {
    const answer = (answers[id] || '').trim();
    if (!answer) return;
    const o = qaOpt(id);
    try {
      await api.put(`/admin/questions/${id}/answer`, { answer, notify: o.notify, is_public: o.is_public });
      setAnswers(a => ({ ...a, [id]: '' }));
      showMsg(o.notify ? 'Antwort gespeichert und per E-Mail versendet ✓' : 'Antwort gespeichert ✓');
      loadQuestions(); loadAll();
    } catch (e) { showMsg('Fehler: ' + e.message, 'error'); }
  }

  async function toggleQaPublic(id, isPublic) {
    try {
      await api.put(`/admin/questions/${id}/visibility`, { is_public: isPublic });
      showMsg(isPublic ? 'Frage ist jetzt im Mandat für alle Interessenten sichtbar ✓' : 'Frage wieder privat');
      loadQuestions();
    } catch (e) { showMsg('Fehler: ' + e.message, 'error'); }
  }

  async function deleteQuestion(id) {
    if (!confirm('Frage endgültig löschen? Die Antwort wird ebenfalls entfernt.')) return;
    try { await api.delete(`/admin/questions/${id}`); showMsg('Frage gelöscht'); loadQuestions(); loadAll(); }
    catch (e) { showMsg('Fehler: ' + e.message, 'error'); }
  }

  async function loadCrmContacts() {
    try {
      const d = await api.get(`/crm/contacts/search?q=${encodeURIComponent(contactSearch)}`);
      setCrmContacts(d.contacts || []);
    } catch { /* CRM ggf. leer */ }
  }

  useEffect(() => {
    if (activeTab === 'activity') loadActivity();
    if (activeTab === 'audit') loadAuditLogs(1);
    if (activeTab === 'leads') loadValLeads();
    if (activeTab === 'multiples') loadValMultiples();
    if (activeTab === 'detvals') loadDetVals();
    if (activeTab === 'changelog') loadChangelog();
    if (activeTab === 'feedback') loadFeedback();
    if (activeTab === 'contacts') loadCrmContacts();
    if (activeTab === 'qa') loadQuestions();
    if (activeTab === 'users') api.get('/admin/roles').then(d => setRoleList(d.roles || [])).catch(() => {});
  }, [activeTab]);

  // Suche im Kontakte-Tab (entprellt)
  useEffect(() => {
    if (activeTab !== 'contacts') return;
    const t = setTimeout(loadCrmContacts, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactSearch]);

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

  // Bezeichnung und Beschreibung eines Dokuments nachträglich ändern.
  // Der Anzeigename ist unabhängig vom hochgeladenen Dateinamen, die Endung
  // ergänzt der Server, damit die Datei beim Empfänger korrekt öffnet.
  async function saveDocMeta(projectId, docId, patch) {
    try {
      await api.patch(`/documents/${projectId}/${docId}`, patch);
      showMsg('Dokument aktualisiert ✓');
      const docs = await api.get(`/documents/${projectId}`);
      setUploadState(s => ({ ...s, existingDocs: docs }));
      setEditDoc(null);
    } catch (err) {
      showMsg('Fehler: ' + err.message, 'error');
    }
  }

  // Zugangslevel (Einordnung) eines vorhandenen Dokuments ändern
  async function changeDocLevel(projectId, docId, access_level) {
    try {
      await api.patch(`/documents/${projectId}/${docId}`, { access_level });
      showMsg('Einordnung geändert ✓');
      const docs = await api.get(`/documents/${projectId}`);
      setUploadState(s => ({ ...s, existingDocs: docs }));
    } catch (err) {
      showMsg('Fehler: ' + err.message, 'error');
    }
  }

  // Datei an ein BESTEHENDES Dokument hängen (z. B. vorbereitete Teaser-/IM-Einträge)
  async function attachDocFile(projectId, docId, file) {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.upload(`/documents/${projectId}/${docId}/file`, fd);
      showMsg('Datei hinterlegt ✓');
      const docs = await api.get(`/documents/${projectId}`);
      setUploadState(s => ({ ...s, existingDocs: docs }));
    } catch (err) {
      showMsg('Fehler: ' + err.message, 'error');
    }
  }

  if (loading) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: C.muted }}>
      <div style={{ width: 32, height: 32, margin: '0 auto 1rem', border: `3px solid ${C.border}`, borderTop: `3px solid ${C.navy}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      Wird geladen...
    </div>
  );

  const tabs = ['overview', 'pipeline', 'projects', 'ndas', 'users', 'roles', 'contacts', 'tasks', 'qa', 'templates', 'mails', 'leads', 'detvals', 'multiples', 'feedback', 'changelog', 'activity', 'audit'];
  const tabLabels = {
    overview: 'Übersicht',
    pipeline: 'Pipeline (CRM)',
    projects: 'Projekte',
    ndas:     'NDA-Anfragen',
    users:    'Nutzer',
    roles: 'Rollen & Rechte',
    contacts: 'Kontakte',
    tasks: 'Wiedervorlagen',
    qa: 'Q&A',
    templates: 'Mailvorlagen',
    mails: 'Mail-Ausgang',
    leads:    'Bewertungs-Leads',
    detvals:  'Ausf. Bewertungen',
    multiples: 'Multiples',
    feedback: 'Feedback',
    changelog: 'Changelog',
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
          <KPICard label="Aktive Projekte" value={stats.projects.active} sub={`${stats.projects.total} gesamt · ${stats.projects.draft} Entwurf`} icon={Building2} onClick={() => setActiveTab('projects')} />
          <KPICard label="Registrierte Nutzer" value={stats.users.total} sub={stats.users.pending > 0 ? `⚠️ ${stats.users.pending} ausstehend` : `+${stats.users.this_week} diese Woche`} icon={Users} color={stats.users.pending > 0 ? '#f59e0b' : '#8b5cf6'} onClick={() => setActiveTab('users')} />
          <KPICard label="NDA-Anfragen" value={stats.ndas.total} sub={`${stats.ndas.requested} offen`} icon={FileText} color="#f59e0b" onClick={() => setActiveTab('ndas')} />
          <KPICard label="NDA-Freigaben" value={stats.ndas.approved} sub={`${stats.ndas.signed} unterschrieben`} icon={CheckCircle} color="#10b981" onClick={() => setActiveTab('ndas')} />
        </div>
      )}
      {/* Sprint 4: Datenraum-/CRM-KPIs */}
      {stats && stats.dataroom && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <KPICard label="Datenraum-Zugriffe (7 Tage)" value={stats.dataroom.accesses_7d} sub="Ansichten & Downloads" icon={Eye} color="#0ea5e9" onClick={() => setActiveTab('activity')} />
          <KPICard label="Offene Wiedervorlagen" value={stats.tasks.open} sub={stats.tasks.due > 0 ? `⚠️ ${stats.tasks.due} überfällig` : 'nichts überfällig'} icon={ClipboardList} color={stats.tasks.due > 0 ? '#ef4444' : '#8b5cf6'} onClick={() => setActiveTab('tasks')} />
          <KPICard label="Offene Q&A-Fragen" value={stats.qa.open} sub="warten auf Antwort" icon={FileText} color={stats.qa.open > 0 ? '#f59e0b' : '#10b981'} onClick={() => setActiveTab('qa')} />
          <KPICard label="Pipeline" value={stats.projects.active} sub="Deals im Prozess, Tab Pipeline" icon={Activity} color="#1D4E89" onClick={() => setActiveTab('pipeline')} />
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
            {stats.users.pending} neue Registrierung{stats.users.pending > 1 ? 'en warten' : ' wartet'} auf Freigabe, jetzt prüfen →
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
        {/* Sprint 16: Cockpit-Toolbar: Zeitraum + Export */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.3rem', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.25rem' }}>
            {[['7d', '7 Tage'], ['30d', '30 Tage'], ['90d', '90 Tage'], ['ytd', 'YTD']].map(([k, lbl]) => (
              <button key={k} onClick={() => setRange(k)} style={{
                border: 'none', cursor: 'pointer', borderRadius: 6, padding: '0.35rem 0.8rem', fontSize: '0.8rem', fontWeight: 600,
                background: range === k ? C.navy : 'transparent', color: range === k ? '#fff' : C.muted,
              }}>{lbl}</button>
            ))}
          </div>
          <button onClick={exportAnalyticsCSV} disabled={!analytics} style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: C.card, color: C.navy,
            border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.4rem 0.9rem', fontSize: '0.8rem', fontWeight: 600,
            cursor: analytics ? 'pointer' : 'default',
          }}><Download size={14} /> Kennzahlen exportieren (CSV)</button>
        </div>

        {/* Datengetragene Schnellzugriff-Kacheln (Live-Kennzahl statt statischer Links) */}
        {(() => {
          const B = (analytics && analytics.badges) || {};
          const tiles = [
            ['pipeline', 'Pipeline (CRM)', B.pipeline, 'in Prozess', C.accent],
            ['ndas', 'NDA-Anfragen', B.ndas, 'offen', '#f59e0b'],
            ['users', 'Nutzer', B.users, 'z. Freigabe', '#8b5cf6'],
            ['feedback', 'Feedback', B.feedback, 'neu', '#0ea5e9'],
            ['detvals', 'Ausf. Bewertungen', B.detvals, 'eingereicht', '#10b981'],
            ['leads', 'Bewertungs-Leads', B.leads, 'gesamt', C.accent],
            ['projects', 'Projekte', B.projects, 'aktiv', C.navy],
            ['activity', 'Aktivität heute', B.activity_today, 'Ereignisse', C.muted],
          ];
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem', marginBottom: '1.5rem' }}>
              {tiles.map(([key, label, val, suffix, color]) => (
                <button key={key} onClick={() => setActiveTab(key)} style={{
                  textAlign: 'left', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.85rem 1rem',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.15rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: (val > 0 ? color : C.muted) }}>{val ?? '–'}</span>
                    <span style={{ fontSize: '0.7rem', color: C.muted }}>{suffix}</span>
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: C.navy }}>{label} →</span>
                </button>
              ))}
            </div>
          );
        })()}

        {/* Herkunft der Kontakte: von welcher Plattform kamen die Leads? */}
        {leadSources.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontWeight: 700, color: C.text, marginBottom: '0.9rem', fontSize: '0.95rem' }}>
              Herkunft der Kontakte <span style={{ fontWeight: 400, color: C.muted, fontSize: '0.8rem' }}>· woher unsere Leads kamen</span>
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.7rem' }}>
              {leadSources.map(s => (
                <div key={s.source} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.7rem 0.9rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.source}</div>
                    <div style={{ fontSize: '0.7rem', color: C.muted }}>zuletzt {s.last_at ? new Date(s.last_at).toLocaleDateString('de-DE') : '–'}</div>
                  </div>
                  <span style={{ fontSize: '1.3rem', fontWeight: 800, color: C.accent }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deal-Funnel + Conversion */}
        {analytics && analytics.funnel && analytics.funnel.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontWeight: 700, color: C.text, marginBottom: '1rem', fontSize: '0.95rem' }}>Deal-Funnel <span style={{ fontWeight: 400, color: C.muted, fontSize: '0.8rem' }}>· gesamter Bestand</span></h3>
            {(() => {
              const f = analytics.funnel;
              const max = Math.max(1, ...f.map(x => x.value));
              return f.map((s, i) => {
                const prev = i > 0 ? f[i - 1].value : null;
                const conv = prev ? Math.round((s.value / Math.max(prev, 1)) * 100) : null;
                const colors = ['#1D4E89', '#2563eb', '#8b5cf6', '#0ea5e9', '#f59e0b', '#10b981'];
                return (
                  <div key={s.key} style={{ marginBottom: '0.6rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 3 }}>
                      <span style={{ color: C.text, fontWeight: 600 }}>{s.label}</span>
                      <span style={{ color: C.muted }}>{s.value}{conv !== null && <span style={{ marginLeft: 8, color: conv >= 50 ? '#059669' : conv >= 25 ? '#d97706' : '#dc2626' }}>({conv}%)</span>}</span>
                    </div>
                    <div style={{ background: C.bg, borderRadius: 5, height: 12, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.max(2, (s.value / max) * 100)}%`, height: '100%', background: colors[i % colors.length], borderRadius: 5 }} />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* Zeitreihen (Sparklines) im gewählten Zeitraum */}
        {analytics && analytics.timeseries && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              ['new_users', 'Neue Nutzer', '#8b5cf6'],
              ['ndas', 'NDA-Anfragen', '#f59e0b'],
              ['dataroom', 'Datenraum-Zugriffe', '#0ea5e9'],
              ['messages', 'Nachrichten', '#10b981'],
            ].map(([key, label, color]) => {
              const series = (analytics.timeseries[key] || []).slice(range === 'ytd' ? -90 : 0);
              return (
                <div key={key} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.9rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.8rem', color: C.muted, fontWeight: 600 }}>{label}</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color }}>{sum(series)}</span>
                  </div>
                  <Sparkline data={series} color={color} />
                </div>
              );
            })}
          </div>
        )}

        {/* Mandats-Ranking */}
        {analytics && analytics.mandates && analytics.mandates.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
            <h3 style={{ fontWeight: 700, color: C.text, marginBottom: '0.9rem', fontSize: '0.95rem' }}>Mandats-Ranking <span style={{ fontWeight: 400, color: C.muted, fontSize: '0.8rem' }}>· nach Interessenten</span></h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ color: C.muted, textAlign: 'left' }}>
                  <th style={{ padding: '0.3rem 0.5rem' }}>Mandat</th>
                  <th style={{ padding: '0.3rem 0.5rem', textAlign: 'right' }}>Interess.</th>
                  <th style={{ padding: '0.3rem 0.5rem', textAlign: 'right' }}>NDAs</th>
                  <th style={{ padding: '0.3rem 0.5rem', textAlign: 'right' }}>signiert</th>
                  <th style={{ padding: '0.3rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.3rem 0.5rem', textAlign: 'right' }}>Alter</th>
                  <th style={{ padding: '0.3rem 0.5rem' }}>Aktivität</th>
                </tr>
              </thead>
              <tbody>
                {analytics.mandates.map(m => (
                  <tr key={m.id} onClick={() => setActiveTab('pipeline')} style={{ borderTop: `1px solid ${C.border}`, cursor: 'pointer' }}>
                    <td style={{ padding: '0.45rem 0.5rem' }}><span style={{ fontWeight: 700, color: C.navy }}>{m.codename}</span><div style={{ fontSize: '0.68rem', color: C.muted }}>{m.industry}</div></td>
                    <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', fontWeight: 700 }}>{m.interested}</td>
                    <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right' }}>{m.ndas}</td>
                    <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right' }}>{m.signed}</td>
                    <td style={{ padding: '0.45rem 0.5rem' }}><span style={{ fontSize: '0.7rem', fontWeight: 600, color: C.accent }}>{DEAL_STATUS_LABELS[m.deal_status] || m.deal_status}</span></td>
                    <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', color: C.muted }}>{m.age_days} T</td>
                    <td style={{ padding: '0.45rem 0.5rem' }}>
                      {m.stagnating
                        ? <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.1rem 0.5rem', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700 }}>⚠ stagniert · {m.idle_days} T</span>
                        : <span style={{ color: '#059669', fontSize: '0.72rem' }}>aktiv · vor {m.idle_days} T</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Aktivitäts-Feed */}
        {analytics && analytics.recent && analytics.recent.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontWeight: 700, color: C.text, marginBottom: '0.8rem', fontSize: '0.95rem' }}>Letzte Aktivitäten</h3>
            {analytics.recent.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0', borderTop: i ? `1px solid ${C.border}` : 'none', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: C.text, flex: 1, minWidth: 260 }}>
                  {/* Wer: Klick öffnet den Kontakt (wird bei Bedarf aus dem Konto angelegt) */}
                  {a.actor_id ? (
                    <span
                      onClick={() => openContactForUser({ id: a.actor_id })}
                      title="Kontakt öffnen"
                      style={{ color: C.accent, fontWeight: 700, cursor: 'pointer' }}>
                      {a.actor}
                    </span>
                  ) : <strong>{a.actor}</strong>}
                  {' '}
                  <span style={{ color: '#475569' }}>{a.text || a.action}</span>
                  {/* Wo: Klick öffnet das Mandat */}
                  {a.project && (
                    <>
                      {' · '}
                      <Link to={`/projekte/${a.project.id}`} style={{ color: C.navy, fontWeight: 700, textDecoration: 'none' }}>
                        {a.project.codename}
                      </Link>
                    </>
                  )}
                  {/* Firma des Kontakts */}
                  {a.company && (
                    <span style={{ color: C.muted, fontSize: '0.75rem' }}> · {a.company.name}</span>
                  )}
                </span>
                <span style={{ fontSize: '0.7rem', color: C.muted, whiteSpace: 'nowrap' }}>
                  {new Date(a.ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}

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
        <>
        {/* Prüf-Queue: vom Verkäufer eingereichte Inserate (Stufe B) */}
        {reviewQueue.length > 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
              Zur Prüfung eingereicht ({reviewQueue.length})
            </div>
            {reviewQueue.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '0.6rem 0', borderTop: '1px solid #fde68a' }}>
                <div>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: '0.85rem' }}>{r.codename} <span style={{ fontWeight: 500, color: C.muted, fontSize: '0.75rem' }}>· {r.mandate_type === 'fundraising' ? 'Startup' : 'M&A'} · {[r.industry, r.region].filter(Boolean).join(' · ')}</span></div>
                  <div style={{ fontSize: '0.74rem', color: C.muted }}>
                    von {[r.first_name, r.last_name].filter(Boolean).join(' ') || r.email || 'unbekannt'}{r.submitted_at ? ` · eingereicht ${new Date(r.submitted_at).toLocaleDateString('de-DE')}` : ''}
                  </div>
                  {r.short_description && <div style={{ fontSize: '0.78rem', color: '#555', marginTop: 3, maxWidth: 620 }}>{r.short_description}</div>}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button onClick={() => moderateListing(r.id, 'approve')} style={{ background: '#d1fae5', color: '#065f46', border: 'none', padding: '0.4rem 0.9rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>Freigeben</button>
                  <button onClick={() => moderateListing(r.id, 'reject')} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '0.4rem 0.9rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>Zurückweisen</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ background: C.card, borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['Typ', 'Name / Codename', 'Branche', 'Deal-Typ', 'Pflege', 'Status', 'NDAs', 'Aktionen'].map(h => (
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
                      <div style={{ fontSize: '0.7rem', color: C.muted }}>{p.stage} · {p.investment_needed || 'k. A.'}</div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#555', fontSize: '0.82rem' }}>{p.industry}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#555', fontSize: '0.82rem' }}>{p.deal_type}</td>
                  {/* Wer darf pflegen? Klick öffnet den Kontakt im CRM (dort Bearbeiten und Birdview) */}
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem' }}>
                    {(p.managers || []).length === 0 && <span style={{ color: C.muted }}>k. A.</span>}
                    {(p.managers || []).map(m => (
                      <div key={`${m.user_id}-${m.via}`} style={{ marginBottom: 2 }}>
                        {m.contact_id ? (
                          <button
                            onClick={() => navigate(`/crm?contact=${m.contact_id}`)}
                            title="Im CRM öffnen (bearbeiten, Birdview)"
                            style={{ background: 'none', border: 'none', padding: 0, color: '#1D4E89', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}>
                            {m.name}
                          </button>
                        ) : (
                          <span style={{ fontWeight: 600, color: C.text }}>{m.name}</span>
                        )}
                        <span style={{ color: C.muted, marginLeft: 4 }}>· {m.via}</span>
                      </div>
                    ))}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {(() => {
                      const M = { active: ['#d1fae5', '#065f46', 'Aktiv'], in_review: ['#fef3c7', '#92400e', 'In Prüfung'], draft: ['#f1f5f9', '#64748b', 'Entwurf'], paused: ['#e0f2fe', '#0369a1', 'Pausiert'], closed: ['#f0f0f0', '#555', 'Geschlossen'] };
                      const [bg, color, label] = M[p.status] || M.closed;
                      return <span style={{ background: bg, color, padding: '0.2rem 0.55rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600 }}>{label}</span>;
                    })()}
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
                      <Link to={`/mandat/${p.id}/safe`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#0D1B36', color: '#fff', padding: '0.3rem 0.6rem', borderRadius: 5, fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none' }}>
                        🔒 Safe
                      </Link>
                      <Link to={`/mandat/${p.id}/expose`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#1D4E89', color: '#fff', padding: '0.3rem 0.6rem', borderRadius: 5, fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none' }}>
                        📄 Exposé
                      </Link>
                      <button onClick={() => killProject(p)} title="Endgültig löschen (Killswitch)" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '0.3rem 0.6rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>
                        <Trash2 size={11} /> Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
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
                          {n.online_consent_at && (
                            <button onClick={async () => {
                              try {
                                const token = localStorage.getItem('phalanx_token');
                                const res = await fetch(`/api/ndas/${n.project_id}/download?user_id=${n.user_id}`, { headers: { Authorization: `Bearer ${token}` } });
                                if (res.ok) {
                                  const blob = await res.blob();
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url; a.download = n.signed_pdf_path || `NDA_${n.project_codename || n.project_id}.pdf`; a.click();
                                  URL.revokeObjectURL(url);
                                } else {
                                  let msg = 'Download nicht möglich.';
                                  try { const d = await res.json(); if (d.error) msg = d.error; } catch { /* ignore */ }
                                  showMsg(msg, 'error');
                                }
                              } catch (e) { showMsg('Download fehlgeschlagen: ' + e.message, 'error'); }
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

      {/* Sprint 4: Pipeline (Kanban-CRM): Status aus dem Zustandsautomaten, per Drag & Drop verschiebbar */}
      {activeTab === 'pipeline' && (
        <>
          <div style={{ fontSize: '0.78rem', color: C.muted, marginBottom: '0.75rem' }}>
            Karten per Drag & Drop zwischen den Spalten ziehen, um den Deal-Status zu ändern (nur erlaubte Übergänge). Klick öffnet das Deal-CRM.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem', alignItems: 'start' }}>
            {['draft', 'teaser_live', 'outreach', 'in_diligence', 'loi', 'closed', 'withdrawn'].map(status => {
              const deals = projects.filter(p => (p.deal_status || 'teaser_live') === status);
              const isValidTarget = dragDeal && (DEAL_TRANSITIONS[dragDeal.deal_status] || []).includes(status);
              const isOver = dragOverCol === status;
              return (
                <div
                  key={status}
                  onDragOver={(e) => { if (isValidTarget) { e.preventDefault(); setDragOverCol(status); } }}
                  onDragLeave={() => setDragOverCol(prev => prev === status ? null : prev)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragDeal && isValidTarget) {
                      const proj = projects.find(p => p.id === dragDeal.id);
                      if (proj) moveDeal(proj, status);
                    }
                    setDragDeal(null); setDragOverCol(null);
                  }}
                  style={{
                    background: isOver ? '#eef6ff' : C.bg,
                    border: `1px ${dragDeal ? (isValidTarget ? 'dashed' : 'solid') : 'solid'} ${isOver ? C.accent : isValidTarget ? '#93c5fd' : C.border}`,
                    borderRadius: 6, padding: '0.6rem', minHeight: 80, transition: 'background 0.12s, border-color 0.12s',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.7rem', color: C.navy, letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{DEAL_STATUS_LABELS[status].toUpperCase()}</span>
                    <span style={{ color: C.muted }}>{deals.length}</span>
                  </div>
                  {deals.map(p => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={() => setDragDeal({ id: p.id, deal_status: p.deal_status || 'teaser_live' })}
                      onDragEnd={() => { setDragDeal(null); setDragOverCol(null); }}
                      onClick={() => setDealCrm(p)}
                      style={{
                        background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6,
                        padding: '0.6rem', marginBottom: '0.5rem', cursor: 'grab',
                        boxShadow: '0 1px 2px rgba(13,27,54,0.05)',
                        opacity: dragDeal && dragDeal.id === p.id ? 0.5 : 1,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: C.text, marginBottom: '0.2rem' }}>{p.codename}</div>
                      <div style={{ fontSize: '0.68rem', color: C.muted }}>
                        {p.mandate_type === 'fundraising' ? 'Fundraising' : 'M&A'} · {p.nda_count} Interessent{p.nda_count !== 1 ? 'en' : ''} · {p.approved_count} freigegeben
                      </div>
                    </div>
                  ))}
                  {deals.length === 0 && <div style={{ fontSize: '0.7rem', color: '#bbb', textAlign: 'center', padding: '0.5rem 0' }}>k. A.</div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Users Tab */}
      {activeTab === 'roles' && <RoleMatrix show={showMsg} />}

      {activeTab === 'tasks' && <TaskBoard show={showMsg} />}

      {activeTab === 'qa' && (
        <div>
          {!questions.length && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: '2.5rem', textAlign: 'center', color: C.muted }}>
              Keine Fragen von Interessenten.
            </div>
          )}
          {questions.map(q => (
            <div key={q.id} style={{
              background: C.card, border: `1px solid ${q.status === 'open' ? '#fcd34d' : C.border}`,
              borderRadius: 8, padding: '1rem', marginBottom: '0.8rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: C.muted }}>
                  <strong style={{ color: C.navy }}>{q.codename || 'Mandat'}</strong>
                  {' · '}{[q.first_name, q.last_name].filter(Boolean).join(' ')}
                  {q.company ? ` (${q.company})` : ''}
                  {' · '}{q.asked_at ? new Date(q.asked_at).toLocaleDateString('de-DE') : ''}
                </div>
                <span style={{
                  background: q.status === 'open' ? '#fef3c7' : '#d1fae5',
                  color: q.status === 'open' ? '#92400e' : '#065f46',
                  padding: '0.1rem 0.5rem', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700,
                }}>{q.status === 'open' ? 'offen' : 'beantwortet'}</span>
              </div>
              <div style={{ fontSize: '0.9rem', color: C.navy, fontWeight: 600, marginBottom: '0.6rem' }}>{q.question}</div>
              {q.status === 'open' ? (
                <>
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    rows={3}
                    placeholder="Antwort an den Interessenten…"
                    style={{ width: '100%', padding: '0.6rem', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: '0.85rem', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', margin: '0.6rem 0 0.2rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: C.text, cursor: 'pointer' }}>
                      <input type="checkbox" checked={qaOpt(q.id).notify} onChange={e => setQaOpt(q.id, { notify: e.target.checked })} />
                      Antwort per E-Mail zustellen
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: C.text, cursor: 'pointer' }}>
                      <input type="checkbox" checked={qaOpt(q.id).is_public} onChange={e => setQaOpt(q.id, { is_public: e.target.checked })} />
                      Im Mandat für alle Interessenten anzeigen (FAQ, Fragesteller bleibt anonym)
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button onClick={() => answerQuestion(q.id)} disabled={!(answers[q.id] || '').trim()} style={{
                      background: (answers[q.id] || '').trim() ? C.navy : '#cbd5e1', color: '#fff',
                      border: 'none', borderRadius: 6, padding: '0.5rem 1.1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                    }}>{qaOpt(q.id).notify ? 'Antwort senden' : 'Antwort speichern'}</button>
                    <button onClick={() => deleteQuestion(q.id)} style={{
                      background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6,
                      padding: '0.5rem 0.9rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                    }}>Löschen</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ background: C.bg, borderRadius: 6, padding: '0.7rem 0.9rem', fontSize: '0.85rem', color: C.text }}>
                    {q.answer}
                  </div>
                  <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.6rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: C.text, cursor: 'pointer' }}>
                      <input type="checkbox" checked={q.is_public === 1} onChange={e => toggleQaPublic(q.id, e.target.checked)} />
                      Im Mandat für alle Interessenten sichtbar
                    </label>
                    {q.is_public === 1 && (
                      <span style={{ background: '#dbeafe', color: '#1e40af', padding: '0.1rem 0.5rem', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700 }}>FAQ</span>
                    )}
                    <button onClick={() => deleteQuestion(q.id)} style={{
                      background: 'none', border: 'none', color: '#dc2626', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: 0,
                    }}>Löschen</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'templates' && <TemplateAdmin show={showMsg} />}

      {activeTab === 'mails' && <MailOutbox show={showMsg} />}

      {activeTab === 'contacts' && (
        <div style={{ background: C.card, borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          <div style={{ padding: '0.9rem 1rem', borderBottom: `1px solid ${C.border}`, background: C.bg, display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={contactSearch}
              onChange={e => setContactSearch(e.target.value)}
              placeholder="Kontakt suchen (Name, E-Mail, Unternehmen)…"
              style={{ flex: 1, minWidth: 240, maxWidth: 420, padding: '0.5rem 0.75rem', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box' }}
            />
            <span style={{ fontSize: '0.78rem', color: C.muted }}>{crmContacts.length} Kontakt(e) · Klick öffnet die 360°-Ansicht</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ background: C.bg, textAlign: 'left', color: C.muted, fontSize: '0.7rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.6rem 1rem' }}>Name</th>
                  <th style={{ padding: '0.6rem' }}>Unternehmen</th>
                  <th style={{ padding: '0.6rem' }}>Einwilligung</th>
                  <th style={{ padding: '0.6rem' }}>Mandate</th>
                  <th style={{ padding: '0.6rem' }}>Letzte Ansprache</th>
                  <th style={{ padding: '0.6rem' }}>Konto</th>
                </tr>
              </thead>
              <tbody>
                {crmContacts.map(k => {
                  const blocked = k.consent_status === 'opt_out' || k.contact_status === 'do_not_contact';
                  return (
                    <tr key={k.id} onClick={() => setDrawerContact(k.id)}
                        style={{ borderTop: `1px solid ${C.border}`, cursor: 'pointer' }}>
                      <td style={{ padding: '0.6rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: C.navy }}>
                          {k.is_decision_maker === 1 ? '★ ' : ''}{[k.title, k.first_name, k.last_name].filter(Boolean).join(' ')}
                        </div>
                        <div style={{ color: C.muted, fontSize: '0.75rem' }}>{k.email || 'k. A.'}</div>
                      </td>
                      <td style={{ padding: '0.6rem', color: C.muted }}>{k.companies || 'k. A.'}</td>
                      <td style={{ padding: '0.6rem' }}>
                        {blocked
                          ? <span style={{ background: '#fee2e2', color: '#991b1b', padding: '0.1rem 0.45rem', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700 }}>Widerspruch</span>
                          : k.consent_status === 'opt_in'
                            ? <span style={{ background: '#d1fae5', color: '#065f46', padding: '0.1rem 0.45rem', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700 }}>erteilt</span>
                            : <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.1rem 0.45rem', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700 }}>offen</span>}
                      </td>
                      <td style={{ padding: '0.6rem', color: C.muted }}>{k.deals || 0}</td>
                      <td style={{ padding: '0.6rem', color: C.muted }}>{k.last_mail ? new Date(k.last_mail).toLocaleDateString('de-DE') : 'k. A.'}</td>
                      <td style={{ padding: '0.6rem', color: k.user_id ? '#059669' : C.muted, fontWeight: k.user_id ? 700 : 400 }}>{k.user_id ? 'aktiv' : 'k. A.'}</td>
                    </tr>
                  );
                })}
                {!crmContacts.length && (
                  <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: C.muted }}>Keine Kontakte gefunden.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {drawerContact && (
        <ContactDrawer
          contactId={drawerContact}
          onClose={() => setDrawerContact(null)}
          onChanged={loadCrmContacts}
          show={showMsg}
        />
      )}

      {activeTab === 'users' && (
        <div style={{ background: C.card, borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          {/* Nutzer-Suche */}
          <div style={{ padding: '0.9rem 1rem', borderBottom: `1px solid ${C.border}`, background: C.bg }}>
            <input
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Suchen nach Name, E-Mail, Firma oder Rolle…"
              style={{ width: '100%', maxWidth: 380, padding: '0.5rem 0.75rem', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['Name', 'Rolle', 'Status', 'NDAs', 'Registriert', 'Aktionen'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: C.navy, fontSize: '0.75rem' }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.filter(u => {
                if (!userSearch.trim()) return true;
                const q = userSearch.toLowerCase();
                return [u.first_name, u.last_name, u.email, u.company, u.role].filter(Boolean).some(v => String(v).toLowerCase().includes(q));
              }).map(u => (
                <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}`, background: u.is_approved ? 'transparent' : '#fffbeb' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div
                      onClick={() => openContactForUser(u)}
                      title="Kontakt öffnen (Stammdaten, Mandate, Aktivitäten)"
                      style={{ fontWeight: 700, color: C.accent, fontSize: '0.85rem', cursor: 'pointer' }}>
                      {u.first_name} {u.last_name}
                    </div>
                    <div style={{ color: C.muted, fontSize: '0.72rem' }}>{u.email}</div>
                    {u.company && <div style={{ color: C.muted, fontSize: '0.7rem' }}>{u.company}</div>}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <select
                      value={u.role}
                      onChange={e => changeRole(u, e.target.value)}
                      disabled={u.id === user?.id}
                      title={u.id === user?.id ? 'Die eigene Rolle kann nicht geändert werden.' : 'Rolle ändern'}
                      style={{
                        background: '#fff', color: C.navy, border: `1px solid ${C.border}`, borderRadius: 6,
                        padding: '0.25rem 0.4rem', fontSize: '0.75rem', fontWeight: 700,
                        cursor: u.id === user?.id ? 'default' : 'pointer',
                      }}>
                      {(roleList.length
                        ? roleList.map(r => [r.key, r.label])
                        : [['super_admin', 'Administrator'], ['tenant_owner', 'Mandanten-Eigentümer'], ['advisor', 'Berater'],
                           ['assistant', 'Assistenz'], ['analyst', 'Analyst (nur lesen)'], ['buyer', 'Käufer'], ['seller', 'Verkäufer']]
                      ).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
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
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button onClick={() => openUserDetail(u.id)} style={{ background: C.bg, color: C.navy, border: `1px solid ${C.border}`, padding: '0.3rem 0.65rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
                        Details
                      </button>
                      <a href={`mailto:${u.email}`} title="E-Mail schreiben"
                        style={{ background: '#fff', color: C.navy, border: `1px solid ${C.border}`, padding: '0.3rem 0.65rem', borderRadius: 5, fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none' }}>
                        ✉ Mail
                      </a>
                      <button
                        onClick={() => navigate('/nachrichten', { state: { openPartner: u.id } })}
                        title="Chat auf der Plattform öffnen"
                        style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '0.3rem 0.65rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>
                        💬 Chat
                      </button>
                      {/* Birdview: Plattform mit den Augen dieses Nutzers sehen (schreibgeschützt) */}
                      {u.is_active === 1 && u.role !== 'super_admin' && (
                        <button
                          onClick={() => birdview(u)}
                          title="Ansicht als dieser Nutzer (schreibgeschützt, wird protokolliert)"
                          style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', padding: '0.3rem 0.65rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>
                          👁 Birdview
                        </button>
                      )}
                      {!u.is_approved && (
                        <button onClick={() => approveUser(u.id)} style={{ background: '#d1fae5', color: '#065f46', border: 'none', padding: '0.3rem 0.65rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>
                          ✓ Freigeben
                        </button>
                      )}
                      {u.is_active ? (
                        <button onClick={() => deactivateUser(u.id)} style={{ background: '#fef3c7', color: '#92400e', border: 'none', padding: '0.3rem 0.65rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
                          Deaktivieren
                        </button>
                      ) : (
                        <button onClick={() => approveUser(u.id)} style={{ background: '#dbeafe', color: '#1d4ed8', border: 'none', padding: '0.3rem 0.65rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
                          Aktivieren
                        </button>
                      )}
                      <button onClick={() => gdprDeleteUser(u.id, u.email)} title="DSGVO-Löschung (endgültig)" style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '0.3rem 0.65rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>
                        🗑 Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sprint 6: Bewertungs-Leads Tab */}
      {activeTab === 'leads' && (
        <div style={{ background: C.card, borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          {valLeads.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: C.muted }}>Noch keine Bewertungs-Leads. Sie entstehen, wenn Besucher über den öffentlichen Rechner (<code>/unternehmenswert</code>) einen PDF-Report anfordern.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {['Name', 'E-Mail', 'Branche', 'Wert (Basis)', 'Datum'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: C.navy, fontSize: '0.75rem' }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {valLeads.map(l => (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: C.text }}>{l.lead_name || 'k. A.'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}><a href={`mailto:${l.lead_email}`} style={{ color: C.navy }}>{l.lead_email}</a></td>
                    <td style={{ padding: '0.75rem 1rem', color: '#555', fontSize: '0.82rem' }}>{l.industry || l.nace_section}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: C.text }}>{l.positive && l.corridor_base != null ? Math.round(l.corridor_base).toLocaleString('de-DE') + ' €' : 'n. b.'}</td>
                    <td style={{ padding: '0.75rem 1rem', color: C.muted, fontSize: '0.78rem' }}>{new Date(l.created_at).toLocaleString('de-DE')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Sprint 7: Ausführliche Bewertungen: Review */}
      {activeTab === 'detvals' && (
        <div>
          {detMsg && <div style={{ background: detMsg.includes('Fehler') ? '#fee2e2' : '#d1fae5', borderRadius: 6, padding: '0.55rem 0.9rem', marginBottom: '0.85rem', fontSize: '0.82rem', color: detMsg.includes('Fehler') ? '#991b1b' : '#065f46' }}>{detMsg}</div>}
          {detVals.length === 0 ? (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: '3rem', textAlign: 'center', color: C.muted }}>Noch keine ausführlichen Bewertungen. Sie entstehen, wenn registrierte Nutzer unter <code>/bewertung</code> eine Bewertung berechnen.</div>
          ) : (
            <div style={{ background: C.card, borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead><tr style={{ background: C.bg }}>
                  {['Titel', 'Eigentümer', 'Status', 'Wert (Basis)', 'Mandat', ''].map(h => <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontWeight: 600, color: C.navy, fontSize: '0.72rem' }}>{h.toUpperCase()}</th>)}
                </tr></thead>
                <tbody>
                  {detVals.map(r => (
                    <React.Fragment key={r.id}>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '0.7rem 1rem', fontWeight: 600, color: C.text }}>{r.title || '(ohne Titel)'}</td>
                        <td style={{ padding: '0.7rem 1rem', color: '#555' }}>{r.owner}<div style={{ fontSize: '0.72rem', color: C.muted }}>{r.owner_email}</div></td>
                        <td style={{ padding: '0.7rem 1rem' }}><span style={{ background: (r.status === 'reviewed' ? '#166534' : r.status === 'submitted' ? '#1D4E89' : '#64748B') + '18', color: r.status === 'reviewed' ? '#166534' : r.status === 'submitted' ? '#1D4E89' : '#64748B', fontWeight: 600, fontSize: '0.72rem', padding: '0.15rem 0.55rem', borderRadius: 20 }}>{r.status === 'reviewed' ? 'Geprüft' : r.status === 'submitted' ? 'Berechnet' : 'Entwurf'}</span></td>
                        <td style={{ padding: '0.7rem 1rem', fontWeight: 600 }}>{r.positive && r.corridor_base != null ? Math.round(r.corridor_base).toLocaleString('de-DE') + ' €' : (r.status === 'draft' ? 'k. A.' : 'n. b.')}</td>
                        <td style={{ padding: '0.7rem 1rem', color: '#555' }}>{r.codename || 'k. A.'}</td>
                        <td style={{ padding: '0.7rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {r.status !== 'draft' && <button onClick={() => downloadDetPdf(r.id)} style={{ background: C.bg, color: C.navy, border: `1px solid ${C.border}`, borderRadius: 6, padding: '0.35rem 0.7rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', marginRight: 6 }}>PDF</button>}
                          <button onClick={() => openDetVal(r)} style={{ background: detOpen === r.id ? C.navy : '#fff', color: detOpen === r.id ? '#fff' : C.navy, border: `1px solid ${C.navy}`, borderRadius: 6, padding: '0.35rem 0.7rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>{detOpen === r.id ? 'Schließen' : 'Prüfen'}</button>
                        </td>
                      </tr>
                      {detOpen === r.id && detReview.full && (
                        <tr><td colSpan={6} style={{ padding: '1rem 1.25rem', background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                          {detReview.full.results && detReview.full.results.corridor ? (
                            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#334155', marginBottom: '0.9rem' }}>
                              <span><strong>Korridor:</strong> {['conservative','base','optimistic'].map(k => Math.round(detReview.full.results.corridor[k]).toLocaleString('de-DE')).join(' / ')} €</span>
                              <span><strong>Multiple:</strong> {String(detReview.full.results.methods.multiple.chosenMultiple).replace('.', ',')}×</span>
                              <span><strong>Kapitaldienst:</strong> {detReview.full.results.affordability.verdict}</span>
                              <span><strong>bereinigtes EBIT:</strong> {Math.round(detReview.full.results.inputsSummary.adjustedEbit).toLocaleString('de-DE')} €</span>
                            </div>
                          ) : <div style={{ fontSize: '0.8rem', color: C.muted, marginBottom: '0.9rem' }}>Noch nicht berechnet (Entwurf).</div>}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'end' }}>
                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>Mandat zuordnen (optional)</label>
                              <select value={detReview.project_id} onChange={e => setDetReview(s => ({ ...s, project_id: e.target.value }))} style={{ width: '100%', padding: '0.5rem', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: '0.82rem' }}>
                                <option value="">, kein Mandat, </option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.codename}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>Kommentar (Review)</label>
                              <input value={detReview.comment} onChange={e => setDetReview(s => ({ ...s, comment: e.target.value }))} placeholder="Anmerkung zur Bewertung" style={{ width: '100%', padding: '0.5rem', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: '0.82rem', boxSizing: 'border-box' }} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.9rem' }}>
                            <button onClick={() => saveDetReview(r.id, false)} style={{ padding: '0.5rem 1rem', border: `1px solid ${C.navy}`, background: '#fff', color: C.navy, borderRadius: 6, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Speichern</button>
                            {r.status !== 'reviewed' && <button onClick={() => saveDetReview(r.id, true)} style={{ padding: '0.5rem 1rem', border: 'none', background: '#166534', color: '#fff', borderRadius: 6, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>Als geprüft markieren</button>}
                          </div>
                        </td></tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sprint 6.1: Multiples-Pflege (Branche × Größenklasse) */}
      {activeTab === 'multiples' && (
        <div>
          <div style={{ background: '#EDF4FA', border: `1px solid ${C.border}`, borderRadius: 6, padding: '0.9rem 1.1rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>
            EBIT-Multiples je Branche und Größenklasse (Micro &lt; 5 Mio. €, Small 5–50 Mio. €, Mid &gt; 50 Mio. € Umsatz). Der Rechner wählt die Größenklasse automatisch anhand des Ø-Umsatzes. Werte als „von–bis". Quelle: <strong>DUB KMU-Multiples (Q2/2026)</strong>. Änderungen wirken sofort auf neue Bewertungen.
          </div>
          {multMsg && <div style={{ background: multMsg.startsWith('Fehler') ? '#fee2e2' : '#d1fae5', borderRadius: 6, padding: '0.55rem 0.9rem', marginBottom: '0.85rem', fontSize: '0.82rem', color: multMsg.startsWith('Fehler') ? '#991b1b' : '#065f46' }}>{multMsg}</div>}
          <div style={{ background: C.card, borderRadius: 6, overflowX: 'auto', border: `1px solid ${C.border}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: 820 }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', fontWeight: 600, color: C.navy, fontSize: '0.72rem' }}>BRANCHE</th>
                  {['MICRO', 'SMALL', 'MID'].map(h => (
                    <th key={h} colSpan={2} style={{ padding: '0.6rem 0.4rem', textAlign: 'center', fontWeight: 600, color: C.navy, fontSize: '0.72rem', borderLeft: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                  <th colSpan={2} style={{ padding: '0.6rem 0.4rem', textAlign: 'center', fontWeight: 600, color: C.navy, fontSize: '0.72rem', borderLeft: `1px solid ${C.border}` }}>UMSATZ-×</th>
                  <th style={{ padding: '0.6rem 0.4rem' }}></th>
                </tr>
                <tr style={{ background: C.bg }}>
                  <th style={{ padding: '0 0.8rem 0.5rem', textAlign: 'left', fontWeight: 400, color: C.muted, fontSize: '0.66rem' }}>EBIT-Multiple (von–bis)</th>
                  {['von', 'bis', 'von', 'bis', 'von', 'bis', 'von', 'bis'].map((h, i) => (
                    <th key={i} style={{ padding: '0 0.3rem 0.5rem', textAlign: 'center', fontWeight: 400, color: C.muted, fontSize: '0.66rem', borderLeft: i % 2 === 0 ? `1px solid ${C.border}` : 'none' }}>{h}</th>
                  ))}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {valMultiples.map(row => {
                  const ed = multEdits[row.id] || {};
                  const val = (f) => ed[f] !== undefined ? ed[f] : row[f];
                  const dirty = Object.keys(ed).length > 0;
                  const cell = (f, i) => (
                    <td style={{ padding: '0.3rem', textAlign: 'center', borderLeft: i % 2 === 0 ? `1px solid ${C.border}` : 'none' }}>
                      <input value={val(f)} onChange={e => editMult(row.id, f, e.target.value)} inputMode="decimal"
                        style={{ width: 46, padding: '0.3rem 0.2rem', textAlign: 'center', border: `1px solid ${ed[f] !== undefined ? C.steel : C.border}`, borderRadius: 5, fontSize: '0.78rem', outline: 'none' }} />
                    </td>
                  );
                  return (
                    <tr key={row.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '0.4rem 0.8rem', fontWeight: 600, color: C.text, fontSize: '0.78rem' }}>{row.label}</td>
                      {cell('micro_ebit_min', 0)}{cell('micro_ebit_max', 1)}
                      {cell('small_ebit_min', 2)}{cell('small_ebit_max', 3)}
                      {cell('mid_ebit_min', 4)}{cell('mid_ebit_max', 5)}
                      {cell('revenue_multiple_min', 6)}{cell('revenue_multiple_max', 7)}
                      <td style={{ padding: '0.3rem 0.6rem', textAlign: 'right' }}>
                        <button onClick={() => saveMult(row)} disabled={!dirty || multSaving === row.id}
                          style={{ padding: '0.35rem 0.8rem', background: dirty ? C.navy : C.border, color: dirty ? '#fff' : C.muted, border: 'none', borderRadius: 5, fontSize: '0.72rem', fontWeight: 600, cursor: dirty ? 'pointer' : 'default' }}>
                          {multSaving === row.id ? '…' : 'Speichern'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feedback-Tab */}
      {activeTab === 'feedback' && (
        <div style={{ background: C.card, borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          {feedbackList.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: C.muted }}>Noch kein Feedback. Käufer/Verkäufer können über die Seite <code>/feedback</code> Wünsche senden.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead><tr style={{ background: C.bg }}>
                {['Von', 'Kategorie', 'Nachricht', 'Status', 'Datum', ''].map(h => <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontWeight: 600, color: C.navy, fontSize: '0.72rem' }}>{h.toUpperCase()}</th>)}
              </tr></thead>
              <tbody>
                {feedbackList.map(f => (
                  <tr key={f.id} style={{ borderBottom: `1px solid ${C.border}`, verticalAlign: 'top' }}>
                    <td style={{ padding: '0.7rem 1rem' }}>{f.user_name || 'k. A.'}<div style={{ fontSize: '0.72rem', color: C.muted }}>{f.user_email} · {f.role === 'seller' ? 'Verkäufer' : f.role === 'buyer' ? 'Käufer' : f.role}</div></td>
                    <td style={{ padding: '0.7rem 1rem', color: '#555' }}>{{ idea: 'Idee', change: 'Änderung', bug: 'Fehler', other: 'Sonstiges' }[f.category] || f.category}</td>
                    <td style={{ padding: '0.7rem 1rem', color: C.text, maxWidth: 380 }}>{f.message}</td>
                    <td style={{ padding: '0.7rem 1rem' }}>
                      <select value={f.status} onChange={e => setFeedbackStatus(f.id, e.target.value)} style={{ padding: '0.3rem', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: '0.76rem' }}>
                        {[['open', 'Offen'], ['planned', 'Geplant'], ['done', 'Umgesetzt'], ['declined', 'Abgelehnt']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '0.7rem 1rem', color: C.muted, fontSize: '0.76rem', whiteSpace: 'nowrap' }}>{new Date(f.created_at).toLocaleDateString('de-DE')}</td>
                    <td style={{ padding: '0.7rem 1rem' }}>
                      <button onClick={() => deleteFeedback(f.id)} title="Feedback löschen" style={{
                        background: 'none', border: 'none', color: '#dc2626', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', padding: 0,
                      }}>Löschen</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Changelog-Tab */}
      {activeTab === 'changelog' && (
        <div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1.1rem 1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 700, color: C.navy, marginBottom: '0.75rem' }}>Neuen Changelog-Eintrag hinzufügen</div>
            {clMsg && <div style={{ background: clMsg.startsWith('Fehler') ? '#fee2e2' : '#d1fae5', borderRadius: 6, padding: '0.5rem 0.8rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: clMsg.startsWith('Fehler') ? '#991b1b' : '#065f46' }}>{clMsg}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
              <input value={clForm.version} onChange={e => setClForm(s => ({ ...s, version: e.target.value }))} placeholder="v0.235" style={{ padding: '0.5rem 0.7rem', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: '0.84rem' }} />
              <input value={clForm.title} onChange={e => setClForm(s => ({ ...s, title: e.target.value }))} placeholder="Titel des Releases" style={{ padding: '0.5rem 0.7rem', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: '0.84rem' }} />
            </div>
            <textarea value={clForm.items} onChange={e => setClForm(s => ({ ...s, items: e.target.value }))} rows={3} placeholder="Ein Punkt pro Zeile…" style={{ width: '100%', padding: '0.5rem 0.7rem', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: '0.84rem', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
            <button onClick={addChangelog} style={{ marginTop: '0.6rem', padding: '0.5rem 1.1rem', background: C.navy, color: '#fff', border: 'none', borderRadius: 7, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>Eintrag hinzufügen</button>
          </div>
          {changelog.map(c => (
            <div key={c.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 700, color: C.navy }}>{c.title} <span style={{ color: C.muted, fontWeight: 400, fontSize: '0.8rem' }}>· {c.version}{c.released_on ? ' · ' + new Date(c.released_on).toLocaleDateString('de-DE') : ''}</span></div>
              <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem', color: '#555', fontSize: '0.83rem', lineHeight: 1.6 }}>
                {(c.items || []).map((it, j) => <li key={j}>{it}</li>)}
              </ul>
            </div>
          ))}
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
                  {['Zeitpunkt', 'Wer', 'Was', 'Mandat', 'Unternehmen', 'Details'].map(h => (
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
                      <td style={{ padding: '0.65rem 1rem', fontSize: '0.8rem' }}>
                        {a.user_id ? (
                          <span onClick={() => openContactForUser({ id: a.user_id })} title="Kontakt öffnen"
                            style={{ color: C.accent, fontWeight: 700, cursor: 'pointer' }}>
                            {a.user_name || a.user_email}
                          </span>
                        ) : <span style={{ color: C.muted }}>System</span>}
                        <div style={{ fontSize: '0.7rem', color: C.muted }}>{a.user_email}</div>
                      </td>
                      <td style={{ padding: '0.65rem 1rem', fontSize: '0.8rem', color: C.text }}>
                        {a.text || a.action}
                        <div>
                          <span style={{ background: badge.bg, color: badge.color, padding: '0.05rem 0.4rem', borderRadius: 5, fontSize: '0.62rem', fontWeight: 700 }}>
                            {a.action}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem 1rem', fontSize: '0.8rem' }}>
                        {a.project
                          ? <Link to={`/projekte/${a.project.id}`} style={{ color: C.navy, fontWeight: 700, textDecoration: 'none' }}>{a.project.codename}</Link>
                          : <span style={{ color: C.muted }}>k. A.</span>}
                      </td>
                      <td style={{ padding: '0.65rem 1rem', fontSize: '0.78rem', color: '#555' }}>
                        {a.company ? a.company.name : 'k. A.'}
                      </td>
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

              {[['Name / Codename', 'codename', 'z. B. Projekt Alpha', true], ['Branche (NACE)', 'industry', '', true], ['Region', 'region', '', true]].map(([label, key, ph, req]) => (
                <div key={key} style={{ marginBottom: '0.9rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#333', marginBottom: '0.3rem' }}>{label}{req ? ' *' : ''}</label>
                  {fieldOptions(key, newProject.mandate_type)
                    ? <GroupedSelect value={newProject[key]} onChange={setNew(key)} groups={fieldOptions(key, newProject.mandate_type)} required={req} style={INPUT_STYLE} />
                    : <input value={newProject[key]} onChange={setNew(key)} placeholder={ph} required={req} style={INPUT_STYLE} />}
                </div>
              ))}

              {newProject.mandate_type === 'fundraising' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.9rem' }}>
                    {[['Stage', 'stage', 'Seed'], ['Deal-Typ', 'deal_type', 'Seed-Finanzierung'], ['Runden-Volumen', 'investment_needed', '€ 1,1 Mio.'], ['Investor-Stake', 'equity_stake', '~26 %'], ['Post-Money', 'post_money_valuation', '€ 3,5 Mio.'], ['TAM', 'tam_band', '€ 9,3 Mrd.']].map(([label, key, ph]) => (
                      <div key={key}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: '#555', marginBottom: '0.25rem' }}>{label}</label>
                        {fieldOptions(key, 'fundraising')
                          ? <GroupedSelect value={newProject[key]} onChange={setNew(key)} groups={fieldOptions(key, 'fundraising')} style={{ ...INPUT_STYLE, fontSize: '0.82rem' }} />
                          : <input value={newProject[key] || ''} onChange={setNew(key)} placeholder={ph} style={{ ...INPUT_STYLE, fontSize: '0.82rem' }} />}
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
                      {fieldOptions(key, 'ma')
                        ? <GroupedSelect value={newProject[key]} onChange={setNew(key)} groups={fieldOptions(key, 'ma')} style={INPUT_STYLE} />
                        : <input value={newProject[key] || ''} onChange={setNew(key)} placeholder={ph} style={INPUT_STYLE} />}
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
                  {fieldOptions(key, editProject.mandate_type)
                    ? <GroupedSelect value={editProject[key]} onChange={setEdit(key)} groups={fieldOptions(key, editProject.mandate_type)} required={req} style={INPUT_STYLE} />
                    : <input value={editProject[key] || ''} onChange={setEdit(key)} placeholder={ph} required={req} style={INPUT_STYLE} />}
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
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', background: C.bg, borderRadius: 6, marginBottom: '0.35rem', border: `1px solid ${C.border}`, gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                      <FileText size={13} color={C.navy} />
                      {editDoc?.id === doc.id ? (
                        /* Bearbeiten: Bezeichnung + Beschreibung */
                        <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <input
                            autoFocus
                            value={editDoc.filename}
                            onChange={(e) => setEditDoc(d => ({ ...d, filename: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveDocMeta(uploadProject.id, doc.id, { filename: editDoc.filename, description: editDoc.description });
                              if (e.key === 'Escape') setEditDoc(null);
                            }}
                            placeholder="Bezeichnung (wird Interessenten angezeigt)"
                            style={{ width: '100%', padding: '0.3rem 0.45rem', border: `1px solid ${C.navy}`, borderRadius: 5, fontSize: '0.8rem', fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
                          />
                          <input
                            value={editDoc.description}
                            onChange={(e) => setEditDoc(d => ({ ...d, description: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveDocMeta(uploadProject.id, doc.id, { filename: editDoc.filename, description: editDoc.description });
                              if (e.key === 'Escape') setEditDoc(null);
                            }}
                            placeholder="Kurzbeschreibung (optional)"
                            style={{ width: '100%', padding: '0.25rem 0.45rem', border: `1px solid ${C.border}`, borderRadius: 5, fontSize: '0.7rem', outline: 'none', boxSizing: 'border-box' }}
                          />
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button
                              onClick={() => saveDocMeta(uploadProject.id, doc.id, { filename: editDoc.filename, description: editDoc.description })}
                              disabled={!editDoc.filename.trim()}
                              style={{ background: editDoc.filename.trim() ? C.navy : '#cbd5e1', color: '#fff', border: 'none', borderRadius: 5, padding: '0.25rem 0.7rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
                              Speichern
                            </button>
                            <button onClick={() => setEditDoc(null)} style={{ background: 'none', border: 'none', color: C.muted, fontSize: '0.7rem', cursor: 'pointer' }}>
                              Abbrechen
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ minWidth: 0 }}>
                          <div
                            onClick={() => setEditDoc({ id: doc.id, filename: doc.filename, description: doc.description || '' })}
                            title="Bezeichnung und Beschreibung ändern"
                            style={{ fontWeight: 600, fontSize: '0.8rem', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                            {doc.filename}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: C.muted }}>
                            {doc.description ? `${doc.description} · ` : ''}
                            {doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(1)} MB` : ''}
                            {doc.has_file === 0 && (
                              <span style={{ marginLeft: 6, background: '#fef3c7', color: '#92400e', padding: '0.05rem 0.4rem', borderRadius: 20, fontWeight: 700, fontSize: '0.64rem' }}>
                                keine Datei
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Datei hinterlegen / ersetzen (füllt vorbereitete Einträge) */}
                    <label
                      title={doc.has_file === 0 ? 'Datei hinterlegen' : 'Datei ersetzen'}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0, cursor: 'pointer',
                        background: doc.has_file === 0 ? '#dbeafe' : '#f1f5f9',
                        color: doc.has_file === 0 ? '#1e40af' : C.muted,
                        border: 'none', padding: '0.3rem 0.55rem', borderRadius: 5, fontSize: '0.7rem', fontWeight: 600,
                      }}
                    >
                      <Upload size={12} /> {doc.has_file === 0 ? 'Datei' : 'Ersetzen'}
                      <input
                        type="file"
                        accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.jpg,.jpeg,.png,.webp"
                        style={{ display: 'none' }}
                        onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; attachDocFile(uploadProject.id, doc.id, f); }}
                      />
                    </label>
                    {/* Bezeichnung ändern */}
                    {editDoc?.id !== doc.id && (
                      <button
                        onClick={() => setEditDoc({ id: doc.id, filename: doc.filename, description: doc.description || '' })}
                        title="Bezeichnung und Beschreibung ändern"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0, cursor: 'pointer',
                          background: '#f1f5f9', color: C.muted, border: 'none',
                          padding: '0.3rem 0.55rem', borderRadius: 5, fontSize: '0.7rem', fontWeight: 600,
                        }}>
                        <Edit2 size={12} /> Umbenennen
                      </button>
                    )}
                    {/* Zugangslevel nachträglich änderbar */}
                    <select
                      value={doc.access_level}
                      onChange={(e) => changeDocLevel(uploadProject.id, doc.id, e.target.value)}
                      title="Einordnung ändern"
                      style={{ fontSize: '0.7rem', padding: '0.25rem 0.4rem', border: `1px solid ${C.border}`, borderRadius: 5, background: '#fff', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <option value="public">Öffentlich</option>
                      <option value="nda">NDA</option>
                      <option value="approved">Freigegeben</option>
                    </select>
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

      {/* Sprint 4: Deal-CRM-Modal */}
      {dealCrm && (
        <DealCrmModal
          project={dealCrm}
          onClose={() => setDealCrm(null)}
          onChanged={() => loadAll()}
        />
      )}

      {/* Nutzer-Detail-Modal (Pitchbook-Ansicht) */}
      {userDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: '2rem', width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontWeight: 700, color: C.text, margin: 0 }}>{userDetail.user.first_name} {userDetail.user.last_name}</h2>
                <div style={{ color: C.muted, fontSize: '0.82rem' }}>
                  {userDetail.user.role === 'seller' ? 'Verkäufer' : 'Investor'} · {userDetail.user.company || 'Ohne Firma'}{userDetail.user.position ? ` · ${userDetail.user.position}` : ''}
                </div>
              </div>
              <button onClick={() => setUserDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
            </div>

            {/* Kontaktdaten */}
            <div style={{ background: C.bg, borderRadius: 6, padding: '1rem', border: `1px solid ${C.border}`, marginBottom: '1rem', fontSize: '0.83rem' }}>
              <div style={{ fontWeight: 700, color: C.navy, fontSize: '0.75rem', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>KONTAKTDATEN</div>
              <div>E-Mail: <strong>{userDetail.user.email}</strong></div>
              <div>Telefon: <strong>{userDetail.user.phone || 'k. A.'}</strong></div>
              {userDetail.user.website && <div>Website: <a href={userDetail.user.website} target="_blank" rel="noreferrer" style={{ color: C.navy }}>{userDetail.user.website}</a></div>}
              {userDetail.user.linkedin_url && <div>LinkedIn: <a href={userDetail.user.linkedin_url} target="_blank" rel="noreferrer" style={{ color: C.navy }}>{userDetail.user.linkedin_url}</a></div>}
              <div style={{ marginTop: '0.4rem', color: C.muted, fontSize: '0.75rem' }}>
                DSGVO-Einwilligung: {userDetail.user.privacy_consent_at ? new Date(userDetail.user.privacy_consent_at).toLocaleString('de-DE') : 'k. A.'} · Registriert: {new Date(userDetail.user.created_at).toLocaleDateString('de-DE')}
              </div>
            </div>

            {/* Pitchbook-Selbstdarstellung */}
            {userDetail.user.about && (
              <div style={{ background: C.bg, borderRadius: 6, padding: '1rem', border: `1px solid ${C.border}`, marginBottom: '1rem', fontSize: '0.83rem' }}>
                <div style={{ fontWeight: 700, color: C.navy, fontSize: '0.75rem', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>PROFIL / SELBSTDARSTELLUNG</div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{userDetail.user.about}</div>
              </div>
            )}

            {/* Suchprofil (Investor) */}
            {userDetail.profile && (
              <div style={{ background: C.bg, borderRadius: 6, padding: '1rem', border: `1px solid ${C.border}`, marginBottom: '1rem', fontSize: '0.83rem' }}>
                <div style={{ fontWeight: 700, color: C.navy, fontSize: '0.75rem', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>INVESTMENT-SUCHPROFIL</div>
                <div>Branchen: {userDetail.profile.industries.length ? userDetail.profile.industries.join(', ') : 'k. A.'}</div>
                <div>Regionen: {userDetail.profile.regions.length ? userDetail.profile.regions.join(', ') : 'k. A.'}</div>
                <div>Deal-Typen: {userDetail.profile.deal_types.length ? userDetail.profile.deal_types.join(', ') : 'k. A.'}</div>
                {userDetail.profile.notes && <div style={{ marginTop: '0.3rem' }}>Notizen: {userDetail.profile.notes}</div>}
              </div>
            )}

            {/* Prozess-Stand */}
            <div style={{ background: C.bg, borderRadius: 6, padding: '1rem', border: `1px solid ${C.border}`, marginBottom: '1.25rem', fontSize: '0.83rem' }}>
              <div style={{ fontWeight: 700, color: C.navy, fontSize: '0.75rem', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>PROZESS-STAND</div>
              {userDetail.interests.length === 0 ? (
                <div style={{ color: C.muted }}>Noch keine Interessensbekundungen.</div>
              ) : userDetail.interests.map((i, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: idx < userDetail.interests.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <span>{i.codename}</span>
                  <span style={{ fontWeight: 600, color: C.navy }}>{i.stage}</span>
                </div>
              ))}
            </div>

            {/* Aktionen */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button onClick={() => exportUserAudit(userDetail.user.id)} style={{ flex: 1, minWidth: 180, padding: '0.65rem', border: `1px solid ${C.border}`, borderRadius: 6, background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', color: C.navy }}>
                ⬇ Audit-Trail (CSV)
              </button>
              <button onClick={() => gdprDeleteUser(userDetail.user.id, userDetail.user.email)} style={{ flex: 1, minWidth: 180, padding: '0.65rem', border: '1px solid #fca5a5', borderRadius: 6, background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}>
                🗑 DSGVO-Löschung
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
