import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Plus, Building2, Clock, CheckCircle, X } from 'lucide-react';
import CapitalMatchLogo from '../components/CapitalMatchLogo';
import GroupedSelect from '../components/GroupedSelect';
import SellerFunnel from '../components/SellerFunnel';
import ListingWizard from '../components/ListingWizard';
import { NACE_INDUSTRIES, BUNDESLAENDER, DEAL_TYPES_MA, DEAL_TYPES_FUNDRAISING } from '../constants/projectOptions';

const C = {
  navy:    '#1A4D8A',
  steel:   '#29ABE2',
  lightBg: '#EBF7FC',
  xLight:  '#F3F8FC',
  gray:    '#64748B',
  border:  '#C8E4F4',
  bg:      '#F8FAFC',
  card:    '#FFFFFF',
};

const INPUT = {
  width: '100%',
  padding: '0.65rem 0.9rem',
  border: `1px solid ${C.border}`,
  borderRadius: 7,
  fontSize: '0.875rem',
  outline: 'none',
  background: C.xLight,
  boxSizing: 'border-box',
};

export default function SellerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myProjects, setMyProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [wizardEditId, setWizardEditId] = useState(undefined); // undefined = zu, null = neu, id = bearbeiten
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    codename: '',
    industry: '',
    region: '',
    revenue_band: '',
    ebitda_band: '',
    deal_type: 'Nachfolge',
    short_description: '',
    mandate_type: 'ma',
  });

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  // Prozessstand (reduzierter Funnel) für ein eigenes Mandat
  const [preview, setPreview] = useState(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  async function openPreview(pid) {
    setPreviewBusy(true);
    try { setPreview(await api.get(`/projects/${pid}/funnel-preview`)); }
    catch (e) { setMsg('Prozessstand nicht verfügbar: ' + e.message); }
    finally { setPreviewBusy(false); }
  }

  useEffect(() => {
    if (user && !['seller', 'super_admin', 'advisor'].includes(user.role)) {
      navigate('/dashboard');
    }
    loadMyProjects();
  }, [user]);

  async function loadMyProjects() {
    try {
      const data = await api.get('/projects/my-projects');
      setMyProjects(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/projects/my-project', { ...form, highlights: [] });
      showMsg('Projekt eingereicht! Es wird nach Prüfung durch den Admin sichtbar.');
      setShowForm(false);
      setForm({ codename: '', industry: '', region: '', revenue_band: '', ebitda_band: '', deal_type: 'Nachfolge', short_description: '', mandate_type: 'ma' });
      loadMyProjects();
    } catch (err) {
      showMsg('Fehler: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function showMsg(text) {
    if (!text) return;
    setMsg(text);
    setTimeout(() => setMsg(''), 4000);
  }

  // Lebenszyklus eines eigenen Inserats steuern (pausieren, reaktivieren, schließen)
  async function lifecycle(pid, status, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      await api.post(`/projects/${pid}/lifecycle`, { status });
      showMsg(status === 'paused' ? 'Inserat pausiert.' : status === 'active' ? 'Inserat wieder aktiv.' : status === 'closed' ? 'Inserat geschlossen.' : 'Status geändert.');
      loadMyProjects();
    } catch (e) { showMsg('Fehler: ' + e.message); }
  }
  function closeWizard(text) { setWizardEditId(undefined); showMsg(text); loadMyProjects(); }

  const STATUS_META = {
    draft: { label: 'Entwurf', bg: '#f1f5f9', color: '#64748b' },
    in_review: { label: 'In Prüfung', bg: '#fef3c7', color: '#92400e' },
    active: { label: 'Aktiv', bg: '#d1fae5', color: '#065f46' },
    paused: { label: 'Pausiert', bg: '#e0f2fe', color: '#0369a1' },
    closed: { label: 'Geschlossen', bg: '#f1f5f9', color: '#64748b' },
  };
  const statusLabel = (s) => (STATUS_META[s] || STATUS_META.closed).label;
  const statusStyle = (s) => {
    const m = STATUS_META[s] || STATUS_META.closed;
    return { background: m.bg, color: m.color, padding: '0.2rem 0.6rem', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 };
  };
  const smallBtn = { fontSize: '0.75rem', fontWeight: 700, borderRadius: 6, padding: '0.35rem 0.7rem', cursor: 'pointer', border: `1px solid ${C.border}`, background: '#fff', color: C.navy };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 700, color: C.navy, marginBottom: '0.3rem' }}>
            Verkäufer-Dashboard
          </h1>
          <p style={{ color: C.gray, fontSize: '0.875rem' }}>
            Verwalten Sie Ihre Unternehmenspräsentationen auf CapitalMatch
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/projekte')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', color: C.navy, border: `1px solid ${C.navy}`, padding: '0.7rem 1.1rem', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem' }}
          >
            <Building2 size={16} /> Marktplatz & Kaufmandate
          </button>
          <button
            onClick={() => setWizardEditId(null)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: C.navy, color: '#fff', border: 'none', padding: '0.7rem 1.25rem', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem' }}
          >
            <Plus size={16} /> Inserat erstellen
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#065f46' }}>
          {msg}
        </div>
      )}

      {/* Info-Box */}
      <div style={{ background: C.lightBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '2rem', fontSize: '0.85rem', color: C.gray, lineHeight: 1.7 }}>
        <strong style={{ color: C.navy }}>So funktioniert's:</strong> Reichen Sie Ihr Unternehmen zur Präsentation ein → Unser Team prüft und gibt es frei → Es wird für qualifizierte Investoren sichtbar → Sie erhalten Anfragen über CapitalMatch.
      </div>

      {/* Projects list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: C.gray }}>Wird geladen…</div>
      ) : myProjects.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '3rem', textAlign: 'center' }}>
          <Building2 size={40} color={C.border} style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: C.navy, marginBottom: '0.5rem' }}>Noch kein Unternehmen eingereicht</h3>
          <p style={{ color: C.gray, fontSize: '0.875rem', marginBottom: '1.5rem' }}>Klicken Sie auf „Unternehmen einreichen", um anzufangen.</p>
          <button
            onClick={() => setWizardEditId(null)}
            style={{ background: C.navy, color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}
          >
            Inserat erstellen
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {myProjects.map(p => (
            <div key={p.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, color: C.navy, fontSize: '1rem' }}>{p.codename}</span>
                  <span style={statusStyle(p.status)}>{statusLabel(p.status)}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: C.gray }}>{p.industry} · {p.region}</div>
                {p.short_description && (
                  <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.35rem', maxWidth: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.short_description}
                  </div>
                )}
                {p.status === 'draft' && p.review_note && (
                  <div style={{ fontSize: '0.78rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '0.4rem 0.6rem', marginTop: '0.5rem', maxWidth: 500 }}>
                    Zurückgewiesen: {p.review_note}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {p.status === 'in_review' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#92400e', background: '#fef3c7', padding: '0.4rem 0.75rem', borderRadius: 6 }}>
                    <Clock size={13} /> Wartet auf Freigabe
                  </div>
                )}
                {p.status === 'active' && (
                  <button onClick={() => openPreview(p.id)} disabled={previewBusy} style={smallBtn}>Prozessstand</button>
                )}
                {['draft', 'in_review'].includes(p.status) && (
                  <button onClick={() => setWizardEditId(p.id)} style={smallBtn}>Bearbeiten</button>
                )}
                {p.status === 'active' && (
                  <button onClick={() => lifecycle(p.id, 'paused')} style={smallBtn}>Pausieren</button>
                )}
                {p.status === 'paused' && (
                  <button onClick={() => lifecycle(p.id, 'active')} style={{ ...smallBtn, borderColor: '#065f46', color: '#065f46' }}>Reaktivieren</button>
                )}
                {['active', 'paused'].includes(p.status) && (
                  <button onClick={() => lifecycle(p.id, 'closed', 'Inserat wirklich schließen? Es ist danach nicht mehr sichtbar.')} style={{ ...smallBtn, borderColor: '#fecaca', color: '#b91c1c' }}>Schließen</button>
                )}
                {p.status === 'closed' && (
                  <button onClick={() => lifecycle(p.id, 'active')} style={{ ...smallBtn, borderColor: '#065f46', color: '#065f46' }}>Reaktivieren</button>
                )}
                <div style={{ fontSize: '0.72rem', color: '#aaa', width: '100%', textAlign: 'right' }}>
                  {new Date(p.created_at).toLocaleDateString('de-DE')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mehr-Projekt-Funnel (nur lesen, ohne Kontaktdaten) */}
      <SellerFunnel projects={myProjects} show={showMsg} />

      {/* Prozessstand (reduzierter Funnel für den Mandanten) */}
      {preview && (() => {
        const d = preview;
        const active = d.stages.filter(s => (d.counts[s.key] || 0) > 0);
        const total = d.parties.length;
        return (
          <div onClick={() => setPreview(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: 'min(640px, 96vw)', maxHeight: '88vh', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.1rem 1.4rem', borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <h2 style={{ fontWeight: 800, color: C.navy, fontSize: '1.05rem' }}>Prozessstand · {d.project.codename}</h2>
                  <div style={{ fontSize: '0.75rem', color: C.gray }}>{total} Interessent(en) im Prozess</div>
                </div>
                <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
              </div>
              <div style={{ padding: '1.1rem 1.4rem' }}>
                <p style={{ fontSize: '0.78rem', color: C.gray, marginBottom: '1rem', lineHeight: 1.5 }}>
                  Sie sehen die interessierten Parteien und wie weit sie im Prozess sind. Aus Vertraulichkeitsgründen zeigen wir keine Kontaktdaten.
                </p>
                {!active.length && <div style={{ color: C.gray, fontSize: '0.85rem' }}>Noch keine Interessenten im Prozess.</div>}
                {active.map(s => (
                  <div key={s.key} style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 800, color: C.navy, fontSize: '0.9rem' }}>{s.label}</span>
                      <span style={{ background: C.lightBg, color: C.navy, borderRadius: 10, padding: '0 0.5rem', fontSize: '0.72rem', fontWeight: 700 }}>{d.counts[s.key]}</span>
                    </div>
                    {d.parties.filter(p => p.funnel_stage === s.key).map((p, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.28rem 0', borderTop: '1px solid #F1F5F9', fontSize: '0.85rem', color: '#334155' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.active ? '#10b981' : '#cbd5e1', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                        {p.company && <span style={{ color: C.gray }}>· {p.company}</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Inserat-Wizard (neu anlegen oder Entwurf bearbeiten) */}
      {wizardEditId !== undefined && (
        <ListingWizard
          existingId={wizardEditId}
          onClose={() => setWizardEditId(undefined)}
          onDone={closeWizard}
        />
      )}
    </div>
  );
}
