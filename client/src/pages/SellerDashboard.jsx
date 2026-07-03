import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Plus, Building2, Clock, CheckCircle, X } from 'lucide-react';
import CapitalMatchLogo from '../components/CapitalMatchLogo';
import GroupedSelect from '../components/GroupedSelect';
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
    setMsg(text);
    setTimeout(() => setMsg(''), 4000);
  }

  const statusLabel = (s) => s === 'active' ? 'Aktiv' : s === 'draft' ? 'In Prüfung' : 'Geschlossen';
  const statusStyle = (s) => ({
    background: s === 'active' ? '#d1fae5' : s === 'draft' ? '#fef3c7' : '#f1f5f9',
    color: s === 'active' ? '#065f46' : s === 'draft' ? '#92400e' : '#64748b',
    padding: '0.2rem 0.6rem',
    borderRadius: 6,
    fontSize: '0.72rem',
    fontWeight: 700,
  });

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
        <button
          onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: C.navy, color: '#fff', border: 'none', padding: '0.7rem 1.25rem', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem' }}
        >
          <Plus size={16} /> Unternehmen einreichen
        </button>
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
            onClick={() => setShowForm(true)}
            style={{ background: C.navy, color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}
          >
            Jetzt einreichen
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
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {p.status === 'draft' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#92400e', background: '#fef3c7', padding: '0.4rem 0.75rem', borderRadius: 6 }}>
                    <Clock size={13} /> Wartet auf Freigabe
                  </div>
                )}
                {p.status === 'active' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#065f46', background: '#d1fae5', padding: '0.4rem 0.75rem', borderRadius: 6 }}>
                    <CheckCircle size={13} /> Veröffentlicht
                  </div>
                )}
                <div style={{ fontSize: '0.72rem', color: '#aaa' }}>
                  {new Date(p.created_at).toLocaleDateString('de-DE')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Project Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: 700, color: C.navy, fontSize: '1.1rem' }}>Unternehmen einreichen</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
            </div>

            <p style={{ fontSize: '0.82rem', color: C.gray, marginBottom: '1.25rem', lineHeight: 1.6 }}>
              Füllen Sie die Grunddaten aus. Nach der Freigabe durch unser Team können Sie weitere Details und Dokumente hinzufügen.
            </p>

            <form onSubmit={handleSubmit}>
              {/* Mandate type */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.4rem' }}>Art des Mandats *</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[['ma', 'M&A / Unternehmensverkauf'], ['fundraising', 'Startup-Finanzierung']].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setForm(p => ({ ...p, mandate_type: v }))} style={{
                      flex: 1, padding: '0.5rem', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
                      background: form.mandate_type === v ? C.navy : '#f5f5f5',
                      color: form.mandate_type === v ? '#fff' : '#555',
                      border: `1.5px solid ${form.mandate_type === v ? C.navy : '#ddd'}`,
                    }}>{l}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.3rem' }}>Unternehmensname / Codename *</label>
                <input value={form.codename} onChange={set('codename')} placeholder="z.B. Müller GmbH oder Projekt Alpha" required style={INPUT} />
              </div>
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.3rem' }}>Branche (NACE) *</label>
                <GroupedSelect value={form.industry} onChange={set('industry')} groups={NACE_INDUSTRIES} required style={INPUT} />
              </div>
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.3rem' }}>Region *</label>
                <GroupedSelect value={form.region} onChange={set('region')} groups={BUNDESLAENDER} required style={INPUT} />
              </div>

              {form.mandate_type === 'ma' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.9rem' }}>
                  {[
                    ['Umsatz (ca.)', 'revenue_band', '5–10 Mio. €'],
                    ['EBITDA (ca.)', 'ebitda_band', '1–2 Mio. €'],
                  ].map(([label, key, ph]) => (
                    <div key={key}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#555', marginBottom: '0.25rem' }}>{label}</label>
                      <input value={form[key]} onChange={set(key)} placeholder={ph} style={{ ...INPUT, fontSize: '0.82rem' }} />
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.3rem' }}>Deal-Typ</label>
                <GroupedSelect
                  value={form.deal_type}
                  onChange={set('deal_type')}
                  groups={form.mandate_type === 'ma' ? DEAL_TYPES_MA : DEAL_TYPES_FUNDRAISING}
                  required
                  style={{ ...INPUT, background: C.xLight }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.3rem' }}>Kurzbeschreibung *</label>
                <textarea
                  value={form.short_description}
                  onChange={set('short_description')}
                  required
                  rows={4}
                  placeholder="Beschreiben Sie Ihr Unternehmen kurz: Tätigkeit, Alleinstellungsmerkmale, was Sie suchen…"
                  style={{ ...INPUT, resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.75rem', border: `1px solid ${C.border}`, borderRadius: 7, background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
                  Abbrechen
                </button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: '0.75rem', background: C.navy, color: '#fff', border: 'none', borderRadius: 7, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.875rem', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Wird eingereicht…' : 'Einreichen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
