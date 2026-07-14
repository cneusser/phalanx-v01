// ─────────────────────────────────────────────────────────────────────────────
// Admin: alle Prozess-Mailvorlagen einsehen, ändern, deaktivieren, ergänzen.
// Links die Liste je Prozessschritt, rechts der Editor mit Live-Vorschau.
// Systemvorlagen sind änderbar, aber nicht löschbar (nur deaktivierbar).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { Save, Plus, Trash2, Eye, Lock } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0', text: '#0F172A', muted: '#64748B' };
const IN = { width: '100%', padding: '0.5rem 0.65rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.83rem', outline: 'none', background: '#fff', boxSizing: 'border-box' };
const LBL = { fontSize: '0.7rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 3 };

const CTA_LABELS = { project: 'Mandatsseite', consent: 'Einwilligung (Double-Opt-in)', profile: 'Selbstpflege-Portal', none: 'kein Button' };

export default function TemplateAdmin({ show }) {
  const [templates, setTemplates] = useState([]);
  const [placeholders, setPlaceholders] = useState([]);
  const [stages, setStages] = useState([]);
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState({});
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.get('/crm/templates');
      setTemplates(d.templates || []);
      setPlaceholders(d.placeholders || []);
      setStages(d.stages || []);
      if (!sel && d.templates?.length) pick(d.templates[0]);
    } catch (e) { show('Fehler: ' + e.message); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);

  function pick(t) {
    setSel(t);
    setForm({
      name: t.name, subject: t.subject, body: t.body,
      cta_label: t.cta_label || '', cta_target: t.cta_target,
      stage: t.stage == null ? '' : String(t.stage), is_active: t.is_active === 1,
    });
    setPreview(null);
  }

  async function save() {
    if (!sel) return;
    setSaving(true);
    try {
      await api.put(`/crm/templates/${sel.id}`, {
        ...form,
        stage: form.stage === '' ? null : Number(form.stage),
        is_active: !!form.is_active,
      });
      show('Vorlage gespeichert ✓');
      const d = await api.get('/crm/templates');
      setTemplates(d.templates || []);
      const fresh = (d.templates || []).find(t => t.id === sel.id);
      if (fresh) setSel(fresh);
    } catch (e) { show('Fehler: ' + e.message); }
    finally { setSaving(false); }
  }

  async function addNew() {
    const name = window.prompt('Name der neuen Vorlage (z. B. „Zwischenstand an Longlist")');
    if (!name) return;
    try {
      await api.post('/crm/templates', {
        name, subject: '[Vertraulich] {{mandat}}: ', body: 'Text der Vorlage …\n\n{{anrede}} wird automatisch vorangestellt.',
        cta_target: 'project', cta_label: 'Mandat ansehen',
      });
      show('Vorlage angelegt ✓'); load();
    } catch (e) { show('Fehler: ' + e.message); }
  }

  async function remove() {
    if (!sel || sel.is_system === 1) return;
    if (!window.confirm(`Vorlage „${sel.name}" löschen?`)) return;
    try { await api.delete(`/crm/templates/${sel.id}`); setSel(null); show('Vorlage gelöscht'); load(); }
    catch (e) { show('Fehler: ' + e.message); }
  }

  async function doPreview() {
    if (!sel) return;
    try { setPreview(await api.post(`/crm/templates/${sel.id}/preview`, { subject: form.subject, body: form.body, frist: '15.08.2026' })); }
    catch (e) { show('Fehler: ' + e.message); }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1rem', alignItems: 'start' }}>
      {/* Liste */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '0.7rem 0.9rem', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: C.navy }}>Vorlagen ({templates.length})</span>
          <button onClick={addNew} title="Neue Vorlage" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.accent }}><Plus size={16} /></button>
        </div>
        {templates.map(t => (
          <div key={t.id} onClick={() => pick(t)} style={{
            padding: '0.6rem 0.9rem', borderBottom: `1px solid ${C.border}`, cursor: 'pointer',
            background: sel?.id === t.id ? '#EEF4FB' : '#fff',
            opacity: t.is_active === 1 ? 1 : 0.5,
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: C.navy, display: 'flex', alignItems: 'center', gap: 5 }}>
              {t.is_system === 1 && <Lock size={10} color={C.muted} />}
              {t.name}
            </div>
            <div style={{ fontSize: '0.68rem', color: C.muted, marginTop: 1 }}>
              {t.stage != null ? `Stufe ${t.stage} · ` : ''}{CTA_LABELS[t.cta_target]}{t.is_active === 1 ? '' : ' · inaktiv'}
            </div>
          </div>
        ))}
      </div>

      {/* Editor */}
      {sel && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1.1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.7rem', marginBottom: '0.8rem' }}>
            <div>
              <div style={LBL}>Name</div>
              <input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={IN} />
            </div>
            <div>
              <div style={LBL}>Prozessschritt</div>
              <select value={form.stage ?? ''} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))} style={IN}>
                <option value="">, keiner, </option>
                {stages.map(s => <option key={s.key} value={s.key}>{s.key}: {s.label}</option>)}
              </select>
            </div>
            <div>
              <div style={LBL}>Button-Ziel</div>
              <select value={form.cta_target || 'project'} onChange={e => setForm(f => ({ ...f, cta_target: e.target.value }))} style={IN}>
                {Object.entries(CTA_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.7rem', marginBottom: '0.8rem' }}>
            <div>
              <div style={LBL}>Betreff</div>
              <input value={form.subject || ''} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} style={IN} />
            </div>
            <div>
              <div style={LBL}>Button-Text</div>
              <input value={form.cta_label || ''} onChange={e => setForm(f => ({ ...f, cta_label: e.target.value }))} style={IN} />
            </div>
          </div>

          <div style={LBL}>Text</div>
          <textarea value={form.body || ''} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={12}
            style={{ ...IN, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />

          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.7rem 0.9rem', margin: '0.8rem 0', fontSize: '0.72rem', color: C.muted, lineHeight: 1.8 }}>
            <strong style={{ color: C.navy }}>Platzhalter:</strong>{' '}
            {placeholders.map(([p]) => (
              <code key={p} onClick={() => setForm(f => ({ ...f, body: (f.body || '') + ' ' + p }))}
                title="Klicken, um an den Text anzuhängen"
                style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 5, padding: '0.05rem 0.3rem', marginRight: 4, cursor: 'pointer', color: C.accent }}>{p}</code>
            ))}
            <div style={{ marginTop: 6 }}>Anrede, Eckdaten-Tabelle des Mandats, Unterschrift und DSGVO-Hinweis werden beim Versand automatisch ergänzt.</div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.82rem', color: C.text, cursor: 'pointer', marginBottom: '0.9rem' }}>
            <input type="checkbox" checked={!!form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
            Aktiv (steht beim Versand zur Auswahl)
          </label>

          {preview && (
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: '0.9rem 1rem', marginBottom: '0.9rem' }}>
              <div style={{ ...LBL, marginBottom: 6 }}>Vorschau (Beispieldaten)</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.navy, marginBottom: 6 }}>{preview.subject}</div>
              <div style={{ fontSize: '0.8rem', color: C.text, marginBottom: 5 }}>{preview.salutation}</div>
              <div style={{ fontSize: '0.8rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{preview.body}</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={save} disabled={saving} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, background: C.navy, color: '#fff', border: 'none',
              borderRadius: 8, padding: '0.55rem 1.2rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
            }}>
              <Save size={14} /> {saving ? 'Speichern…' : 'Speichern'}
            </button>
            <button onClick={doPreview} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: C.navy,
              border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '0.55rem 1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
            }}>
              <Eye size={14} /> Vorschau
            </button>
            {sel.is_system !== 1 && (
              <button onClick={remove} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: '#dc2626',
                border: '1.5px solid #fecaca', borderRadius: 8, padding: '0.55rem 1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
              }}>
                <Trash2 size={14} /> Löschen
              </button>
            )}
            {sel.is_system === 1 && (
              <span style={{ fontSize: '0.72rem', color: C.muted, alignSelf: 'center' }}>
                Systemvorlage: änderbar, aber nicht löschbar (deaktivieren genügt).
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
