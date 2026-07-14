// ─────────────────────────────────────────────────────────────────────────────
// Prozess-Mailvorlage versenden: an einen Kontakt oder an eine Auswahl.
// Vorlage wählen → Vorschau mit echten Daten → Text bei Bedarf einmalig anpassen
// (ohne die Vorlage zu überschreiben) → versenden.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Send, FileText } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0', text: '#0F172A', muted: '#64748B' };
const IN = { width: '100%', padding: '0.5rem 0.65rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.83rem', outline: 'none', background: '#fff', boxSizing: 'border-box' };
const LBL = { fontSize: '0.7rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 3 };

export default function TemplateSendModal({ project, contactIds, onClose, onSent, show }) {
  const [templates, setTemplates] = useState([]);
  const [tplId, setTplId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [frist, setFrist] = useState('');
  const [advance, setAdvance] = useState(true);
  const [reminders, setReminders] = useState(false);
  const [preview, setPreview] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get('/crm/templates').then(d => {
      const act = (d.templates || []).filter(t => t.is_active === 1);
      setTemplates(act);
      if (act.length) setTplId(String(act[0].id));
    }).catch(e => show('Fehler: ' + e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tpl = templates.find(t => String(t.id) === String(tplId));

  // Vorlage gewechselt → Betreff/Text aus der Vorlage übernehmen
  useEffect(() => {
    if (!tpl) return;
    setSubject(tpl.subject); setBody(tpl.body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tplId]);

  // Vorschau mit echten Daten des ersten Empfängers (entprellt)
  useEffect(() => {
    if (!tpl) return;
    const t = setTimeout(() => {
      api.post(`/crm/templates/${tpl.id}/preview`, {
        contact_id: contactIds[0], project_id: project.id, subject, body, frist,
      }).then(setPreview).catch(() => {});
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tplId, subject, body, frist]);

  async function send() {
    if (!tpl) return;
    if (!window.confirm(
      `Vorlage „${tpl.name}" an ${contactIds.length} Kontakt(e) senden?\n\n` +
      `Kontakte mit Widerspruch werden übersprungen.` +
      (advance && tpl.stage != null ? `\nDie Funnel-Stufe wird auf „${tpl.stage}" nachgezogen.` : ''))) return;
    setSending(true);
    try {
      const r = await api.post(`/crm/deals/${project.id}/send-template`, {
        template_id: tpl.id, contact_ids: contactIds,
        subject, body, frist, advance_stage: advance, reminders_enabled: reminders,
      });
      onSent(r);
    } catch (e) { show('Fehler: ' + e.message); setSending(false); }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,54,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: '1.4rem', width: 'min(760px, 100%)', maxHeight: '92vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 0.2rem', color: C.navy, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 7 }}>
          <FileText size={17} /> Prozess-Mail: {project.codename}
        </h3>
        <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: C.muted }}>
          {contactIds.length} Empfänger · Vorlage wählen, bei Bedarf anpassen, versenden. Änderungen hier gelten nur für diesen Versand.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.7rem', marginBottom: '0.8rem' }}>
          <div>
            <div style={LBL}>Prozessschritt / Vorlage</div>
            <select value={tplId} onChange={e => setTplId(e.target.value)} style={IN}>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.stage != null ? `${t.stage} · ` : ''}{t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div style={LBL}>Frist / Datum (für {'{{frist}}'})</div>
            <input value={frist} onChange={e => setFrist(e.target.value)} placeholder="z. B. 15.08.2026" style={IN} />
          </div>
        </div>

        <div style={LBL}>Betreff</div>
        <input value={subject} onChange={e => setSubject(e.target.value)} style={{ ...IN, marginBottom: '0.8rem' }} />

        <div style={LBL}>Text</div>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={9}
          style={{ ...IN, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, marginBottom: '0.4rem' }} />
        <div style={{ fontSize: '0.7rem', color: C.muted, marginBottom: '0.9rem' }}>
          Platzhalter: {'{{anrede}} {{mandat}} {{branche}} {{region}} {{umsatz}} {{transaktionsart}} {{unternehmen}} {{frist}} {{berater}}'}, 
          Anrede, Eckdaten-Tabelle, Unterschrift und Rechtshinweis werden automatisch ergänzt.
        </div>

        {preview && (
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '0.9rem 1rem', marginBottom: '0.9rem' }}>
            <div style={{ ...LBL, marginBottom: 6 }}>Vorschau (erster Empfänger: {preview.to || 'k. A.'})</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.navy, marginBottom: 6 }}>{preview.subject}</div>
            <div style={{ fontSize: '0.8rem', color: C.text, marginBottom: 5 }}>{preview.salutation}</div>
            <div style={{ fontSize: '0.8rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{preview.body}</div>
            {preview.cta && (
              <div style={{ marginTop: 10, display: 'inline-block', background: C.navy, color: '#fff', padding: '0.4rem 0.9rem', borderRadius: 7, fontSize: '0.75rem', fontWeight: 700 }}>
                {preview.cta}
              </div>
            )}
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: C.text, cursor: 'pointer', marginBottom: '0.4rem' }}>
          <input type="checkbox" checked={advance} onChange={e => setAdvance(e.target.checked)} />
          Funnel-Stufe auf den Prozessschritt der Vorlage nachziehen
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: C.text, cursor: 'pointer' }}>
          <input type="checkbox" checked={reminders} onChange={e => setReminders(e.target.checked)} />
          Automatisch nachfassen (Tag 7 und Tag 21), falls keine Reaktion kommt
        </label>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.2rem' }}>
          <button onClick={onClose} style={{ background: '#fff', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.55rem 1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>Abbrechen</button>
          <button onClick={send} disabled={sending || !tpl} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: sending || !tpl ? '#cbd5e1' : C.navy, color: '#fff', border: 'none', borderRadius: 8,
            padding: '0.55rem 1.2rem', fontSize: '0.82rem', fontWeight: 700, cursor: sending ? 'default' : 'pointer',
          }}>
            <Send size={14} /> {sending ? 'Wird versendet…' : `An ${contactIds.length} versenden`}
          </button>
        </div>
      </div>
    </div>
  );
}
