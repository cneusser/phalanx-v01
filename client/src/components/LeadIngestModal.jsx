import React, { useState } from 'react';
import { api } from '../api/client';
import { Inbox, X } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', border: '#E2E8F0', text: '#0F172A', muted: '#64748B', bg: '#F8FAFC' };
const IN = { width: '100%', padding: '0.5rem 0.6rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.85rem', boxSizing: 'border-box' };
const LBL = { fontSize: '0.68rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 3 };

// Anfrage aus einem Marktplatz (DUB.de u. a.) per Einfügen in die Plattform holen.
// Zwei Schritte: erkennen (Vorschau, editierbar) und übernehmen (Kontakt + Funnel).
export default function LeadIngestModal({ deals = [], activeProjectId, onClose, onDone, show }) {
  const [text, setText] = useState('');
  const [lead, setLead] = useState(null);
  const [projectId, setProjectId] = useState(activeProjectId || '');
  const [matched, setMatched] = useState(null);
  const [autoApproach, setAutoApproach] = useState(true);
  const [busy, setBusy] = useState(false);

  const parse = async () => {
    setBusy(true);
    try {
      const r = await api.post('/crm/leads/parse', { text });
      setLead(r.lead);
      if (r.matchedProject) { setMatched(r.matchedProject); setProjectId(r.matchedProject.id); }
    } catch (e) { show && show('Konnte die Anfrage nicht lesen: ' + e.message); }
    finally { setBusy(false); }
  };

  const setC = (k, v) => setLead(l => ({ ...l, contact: { ...l.contact, [k]: v } }));

  const ingest = async () => {
    setBusy(true);
    try {
      const r = await api.post('/crm/leads/ingest', { lead, project_id: projectId || null, auto_approach: autoApproach });
      const base = r.created ? 'Neuer Kontakt angelegt und in den Funnel gestellt.' : 'Kontakt aktualisiert und zugeordnet.';
      const sent = r.approach && r.approach.sent;
      show && show(sent ? base + ' Erstansprache versendet.' : (autoApproach && !r.project_id ? base + ' (Ohne Mandat keine Ansprache.)' : base));
      onDone && onDone(r);
      onClose();
    } catch (e) { show && show('Übernahme fehlgeschlagen: ' + e.message); }
    finally { setBusy(false); }
  };

  const c = lead?.contact || {};

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: 'min(680px, 96vw)', maxHeight: '92vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.2rem', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: C.navy }}>
            <Inbox size={18} /> Anfrage aus einem Marktplatz einfügen
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}><X size={18} /></button>
        </div>

        <div style={{ padding: '1.1rem 1.2rem' }}>
          {!lead ? (
            <>
              <div style={{ fontSize: '0.82rem', color: C.muted, marginBottom: 8, lineHeight: 1.5 }}>
                Fügen Sie die komplette Anfrage-E-Mail ein (z. B. von DUB.de). Name, Kontaktdaten, Inseratsnummer und das Mandat werden automatisch erkannt.
              </div>
              <textarea
                value={text} onChange={e => setText(e.target.value)} rows={12}
                placeholder="Hier die Anfrage-E-Mail einfügen…"
                style={{ ...IN, fontFamily: 'inherit', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button onClick={parse} disabled={busy || text.trim().length < 20} style={{
                  background: text.trim().length < 20 ? '#cbd5e1' : C.navy, color: '#fff', border: 'none', borderRadius: 8,
                  padding: '0.6rem 1.2rem', fontWeight: 700, fontSize: '0.85rem', cursor: busy ? 'default' : 'pointer',
                }}>{busy ? 'Wird gelesen…' : 'Anfrage lesen'}</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ background: '#FFFBEB', border: '1px solid #fcd34d', borderRadius: 8, padding: '0.6rem 0.8rem', marginBottom: 12, fontSize: '0.8rem', color: '#92400e' }}>
                Herkunft: <strong>{lead.sourceLabel}</strong>{lead.inserat ? ` · Inserat ${lead.inserat}` : ''}{lead.ref ? ` · Ref. ${lead.ref}` : ''}
                <div style={{ marginTop: 2, color: '#78350f' }}>Diese Herkunft wird beim Kontakt gespeichert und in der späteren Ansprache genannt.</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
                <div><div style={LBL}>Anrede</div>
                  <select value={c.salutation || ''} onChange={e => setC('salutation', e.target.value)} style={IN}>
                    <option value="">k. A.</option><option>Herr</option><option>Frau</option><option>Divers</option>
                  </select></div>
                <div><div style={LBL}>Titel</div><input value={c.title || ''} onChange={e => setC('title', e.target.value)} style={IN} /></div>
                <div><div style={LBL}>Vorname</div><input value={c.first_name || ''} onChange={e => setC('first_name', e.target.value)} style={IN} /></div>
                <div><div style={LBL}>Nachname</div><input value={c.last_name || ''} onChange={e => setC('last_name', e.target.value)} style={IN} /></div>
                <div><div style={LBL}>E-Mail</div><input value={c.email || ''} onChange={e => setC('email', e.target.value)} style={IN} /></div>
                <div><div style={LBL}>Telefon</div><input value={c.phone || ''} onChange={e => setC('phone', e.target.value)} style={IN} /></div>
                <div><div style={LBL}>Firma</div><input value={c.company || ''} onChange={e => setC('company', e.target.value)} style={IN} /></div>
                <div><div style={LBL}>Investortyp</div><input value={c.investor_type || ''} onChange={e => setC('investor_type', e.target.value)} style={IN} /></div>
                <div style={{ gridColumn: '1 / span 2' }}><div style={LBL}>Adresse</div><input value={c.location || ''} onChange={e => setC('location', e.target.value)} style={IN} /></div>
                <div style={{ gridColumn: '1 / span 2' }}><div style={LBL}>Mandat zuordnen</div>
                  <select value={projectId} onChange={e => setProjectId(e.target.value)} style={IN}>
                    <option value="">Kein Mandat</option>
                    {deals.map(d => <option key={d.id} value={d.id}>{d.codename}</option>)}
                  </select>
                  {matched && <div style={{ fontSize: '0.7rem', color: '#059669', marginTop: 3 }}>Automatisch erkannt: {matched.codename}</div>}
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: '0.82rem', color: C.text, cursor: 'pointer' }}>
                <input type="checkbox" checked={autoApproach} onChange={e => setAutoApproach(e.target.checked)} />
                <span>Direkt ansprechen: Erstansprache (mit Einwilligung und Herkunftshinweis) sofort senden{!projectId ? ' (benötigt ein Mandat)' : ''}</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
                <button onClick={() => setLead(null)} style={{ background: '#fff', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.55rem 1rem', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>Zurück</button>
                <button onClick={ingest} disabled={busy || (!c.last_name && !c.email)} style={{
                  background: (!c.last_name && !c.email) ? '#cbd5e1' : C.navy, color: '#fff', border: 'none', borderRadius: 8,
                  padding: '0.55rem 1.3rem', fontWeight: 700, fontSize: '0.85rem', cursor: busy ? 'default' : 'pointer',
                }}>{busy ? 'Wird übernommen…' : 'In den Funnel übernehmen'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
