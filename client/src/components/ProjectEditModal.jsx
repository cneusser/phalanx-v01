import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { X, Upload } from 'lucide-react';
import GroupedSelect from './GroupedSelect';
import { NACE_INDUSTRIES, BUNDESLAENDER, DEAL_TYPES_MA, DEAL_TYPES_FUNDRAISING, FUNDRAISING_STAGES } from '../constants/projectOptions';

const C = { navy: '#0D1B36', border: '#E2E8F0', bg: '#F8FAFC', muted: '#64748B', text: '#0F172A' };
const INPUT = { width: '100%', padding: '0.55rem 0.75rem', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' };
const LABEL = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#333', marginBottom: '0.3rem' };

/**
 * Mandats-Pflege über den Marktplatz: für Admin, Ersteller und zugeordnete
 * Projektmitglieder. Admin kann zusätzlich Status ändern und Nutzer zuordnen.
 */
export default function ProjectEditModal({ project, onClose, onSaved }) {
  const { user } = useAuth();
  const isAdmin = user && ['super_admin', 'advisor'].includes(user.role);
  const isStartup = project.mandate_type === 'fundraising';

  const [form, setForm] = useState({
    codename: project.codename || '', industry: project.industry || '', region: project.region || '',
    deal_type: project.deal_type || '', stage: project.stage || '',
    revenue_band: project.revenue_band || '', ebitda_band: project.ebitda_band || '',
    investment_needed: project.investment_needed || '', equity_stake: project.equity_stake || '',
    post_money_valuation: project.post_money_valuation || '', tam_band: project.tam_band || '',
    location_city: project.location_city || '', short_description: project.short_description || '',
    status: project.status || 'active',
  });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  // Nutzer-Zuordnung (nur Admin)
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [newMemberId, setNewMemberId] = useState('');

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  useEffect(() => {
    if (!isAdmin) return;
    api.get(`/admin/projects/${project.id}/members`).then(setMembers).catch(() => {});
    api.get('/admin/users').then(setAllUsers).catch(() => {});
  }, [project.id, isAdmin]);

  const addMember = async () => {
    if (!newMemberId) return;
    try {
      await api.post(`/admin/projects/${project.id}/members`, { user_id: parseInt(newMemberId) });
      setMembers(await api.get(`/admin/projects/${project.id}/members`));
      setNewMemberId('');
    } catch (e) { setMsg('Fehler: ' + e.message); }
  };

  const removeMember = async (userId) => {
    try {
      await api.delete(`/admin/projects/${project.id}/members/${userId}`);
      setMembers(members.filter(m => m.user_id !== userId));
    } catch (e) { setMsg('Fehler: ' + e.message); }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      const payload = { ...form };
      if (!isAdmin) delete payload.status;
      await api.put(`/projects/${project.id}`, payload);
      if (imageFile) {
        const fd = new FormData();
        fd.append('image', imageFile);
        await api.upload(`/projects/${project.id}/image`, fd);
      }
      onSaved && onSaved();
      onClose();
    } catch (err) { setMsg('Fehler: ' + err.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: '2rem', width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontWeight: 700, color: C.text, margin: 0, fontSize: '1.1rem' }}>Mandat pflegen: {project.codename}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
        </div>

        {msg && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, padding: '0.6rem 0.9rem', marginBottom: '1rem', fontSize: '0.83rem', color: '#991b1b' }}>{msg}</div>}

        <form onSubmit={save}>
          <div style={{ marginBottom: '0.9rem' }}>
            <label style={LABEL}>Name / Codename *</label>
            <input value={form.codename} onChange={set('codename')} required style={INPUT} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem', marginBottom: '0.9rem' }}>
            <div>
              <label style={LABEL}>Branche (NACE) *</label>
              <GroupedSelect value={form.industry} onChange={set('industry')} groups={NACE_INDUSTRIES} required style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>Region *</label>
              <GroupedSelect value={form.region} onChange={set('region')} groups={BUNDESLAENDER} required style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>Deal-Typ *</label>
              <GroupedSelect value={form.deal_type} onChange={set('deal_type')} groups={isStartup ? DEAL_TYPES_FUNDRAISING : DEAL_TYPES_MA} required style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>Standort (Anzeige)</label>
              <input value={form.location_city} onChange={set('location_city')} placeholder="z. B. Süddeutschland" style={INPUT} />
            </div>
          </div>

          {isStartup ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem', marginBottom: '0.9rem' }}>
              <div><label style={LABEL}>Stage</label><GroupedSelect value={form.stage} onChange={set('stage')} groups={FUNDRAISING_STAGES} style={INPUT} /></div>
              <div><label style={LABEL}>Runden-Volumen</label><input value={form.investment_needed} onChange={set('investment_needed')} placeholder="€ 1,1 Mio." style={INPUT} /></div>
              <div><label style={LABEL}>Investor-Stake</label><input value={form.equity_stake} onChange={set('equity_stake')} placeholder="~26 %" style={INPUT} /></div>
              <div><label style={LABEL}>Post-Money</label><input value={form.post_money_valuation} onChange={set('post_money_valuation')} placeholder="€ 3,5 Mio." style={INPUT} /></div>
              <div><label style={LABEL}>TAM</label><input value={form.tam_band} onChange={set('tam_band')} placeholder="€ 9,3 Mrd." style={INPUT} /></div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem', marginBottom: '0.9rem' }}>
              <div><label style={LABEL}>Umsatzband</label><input value={form.revenue_band} onChange={set('revenue_band')} placeholder="5–10 Mio. €" style={INPUT} /></div>
              <div><label style={LABEL}>EBITDA-Band</label><input value={form.ebitda_band} onChange={set('ebitda_band')} placeholder="1–2 Mio. €" style={INPUT} /></div>
            </div>
          )}

          <div style={{ marginBottom: '0.9rem' }}>
            <label style={LABEL}>Kurzbeschreibung (anonymisiert!) *</label>
            <textarea value={form.short_description} onChange={set('short_description')} required rows={3} style={{ ...INPUT, resize: 'vertical' }} />
          </div>

          {/* Projektbild */}
          <div style={{ marginBottom: '0.9rem' }}>
            <label style={LABEL}>Projektbild (JPG/PNG/WebP, max. 5 MB: bitte anonymisiert wählen)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {project.has_image === 1 && !imageFile && (
                <img src={`/api/projects/${project.id}/image`} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: `1px solid ${C.border}` }} />
              )}
              {imageFile && (
                <img src={URL.createObjectURL(imageFile)} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: `1px solid ${C.border}` }} />
              )}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: C.navy, background: C.bg }}>
                <Upload size={13} /> {project.has_image === 1 ? 'Bild ersetzen' : 'Bild auswählen'}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setImageFile(e.target.files[0] || null)} style={{ display: 'none' }} />
              </label>
              {imageFile && <span style={{ fontSize: '0.75rem', color: C.muted }}>{imageFile.name}</span>}
            </div>
          </div>

          {/* Status (nur Admin) */}
          {isAdmin && (
            <div style={{ marginBottom: '0.9rem' }}>
              <label style={LABEL}>Status (Sichtbarkeit)</label>
              <select value={form.status} onChange={set('status')} style={{ ...INPUT, background: '#fff' }}>
                <option value="active">Aktiv (im Marktplatz sichtbar)</option>
                <option value="draft">Entwurf (verborgen)</option>
              </select>
            </div>
          )}

          {/* Nutzer-Zuordnung (nur Admin) */}
          {isAdmin && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '0.9rem 1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: C.navy, fontSize: '0.78rem', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>ZUGEORDNETE NUTZER (dürfen dieses Mandat pflegen)</div>
              {members.length === 0 && <div style={{ fontSize: '0.8rem', color: C.muted, marginBottom: '0.5rem' }}>Noch keine Nutzer zugeordnet.</div>}
              {members.map(m => (
                <div key={m.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', fontSize: '0.82rem', borderBottom: `1px solid ${C.border}` }}>
                  <span>{m.name} <span style={{ color: C.muted }}>({m.email})</span></span>
                  <button type="button" onClick={() => removeMember(m.user_id)} style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Entfernen</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                <select value={newMemberId} onChange={e => setNewMemberId(e.target.value)} style={{ ...INPUT, flex: 1, background: '#fff' }}>
                  <option value="">Nutzer auswählen…</option>
                  {allUsers.filter(u => !members.some(m => m.user_id === u.id)).map(u => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email}): {u.role === 'seller' ? 'Verkäufer' : 'Investor'}</option>
                  ))}
                </select>
                <button type="button" onClick={addMember} disabled={!newMemberId} style={{ padding: '0.5rem 1rem', background: C.navy, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, opacity: newMemberId ? 1 : 0.5 }}>
                  Zuordnen
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.7rem', border: `1px solid ${C.border}`, borderRadius: 6, background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Abbrechen</button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: '0.7rem', background: C.navy, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Wird gespeichert…' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
