import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Upload, X, CheckCircle, Circle } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', border: '#E2E8F0', text: '#0F172A', muted: '#64748B', bg: '#F8FAFC' };
const IN = { width: '100%', padding: '0.5rem 0.6rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.85rem', boxSizing: 'border-box', background: '#fff' };

// Rechercheliste (Excel/CSV) einlesen: Dubletten-Abgleich, Mandat zuordnen, optional einladen.
export default function ImportListModal({ onClose, onDone, show }) {
  const [report, setReport] = useState(null);
  const [deals, setDeals] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [sendInvite, setSendInvite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { api.get('/crm/deals').then(d => setDeals(d.deals || [])).catch(() => {}); }, []);

  const analyze = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      setReport(await api.upload('/crm/import/analyze', fd));
    } catch (e) { show && show('Datei nicht lesbar: ' + e.message); }
    finally { setBusy(false); }
  };

  const apply = async () => {
    if (sendInvite && !projectId) { show && show('Zum Einladen bitte ein Mandat wählen.'); return; }
    setBusy(true);
    try {
      const r = await api.post('/crm/import/apply', { contacts: report.contacts, project_id: projectId || null, send_invite: sendInvite });
      setResult(r);
      onDone && onDone(r);
    } catch (e) { show && show('Import fehlgeschlagen: ' + e.message); }
    finally { setBusy(false); }
  };

  const s = report?.summary;
  const Pill = ({ n, label, color }) => (
    <div style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.6rem', textAlign: 'center' }}>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{n}</div>
      <div style={{ fontSize: '0.68rem', color: C.muted, fontWeight: 600 }}>{label}</div>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: 'min(760px, 97vw)', maxHeight: '92vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.2rem', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: C.navy }}>
            <Upload size={18} /> Rechercheliste importieren (Excel oder CSV)
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}><X size={18} /></button>
        </div>

        <div style={{ padding: '1.1rem 1.2rem' }}>
          {result ? (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <Pill n={result.created} label="neu angelegt" color="#065f46" />
                <Pill n={result.reused} label="bereits vorhanden" color={C.accent} />
                {projectId ? <Pill n={result.attached} label="dem Mandat zugeordnet" color={C.navy} /> : null}
                {sendInvite ? <Pill n={result.invited} label="eingeladen" color="#7c3aed" /> : null}
              </div>
              {result.blocked > 0 && <div style={{ fontSize: '0.8rem', color: '#92400e' }}>{result.blocked} übersprungen (Widerspruch/Sperre).</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <button onClick={onClose} style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 1.2rem', fontWeight: 700, cursor: 'pointer' }}>Fertig</button>
              </div>
            </div>
          ) : !report ? (
            <>
              <div style={{ fontSize: '0.82rem', color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
                Laden Sie Ihre Liste (.xlsx oder .csv). Spalten wie Name, Firma, E-Mail, Ort und Notiz werden automatisch erkannt.
                Danach sehen Sie, welche Kontakte neu sind und welche schon im CRM stehen, bevor etwas gespeichert wird.
              </div>
              <label style={{ display: 'block', border: `2px dashed ${C.border}`, borderRadius: 12, padding: '2rem', textAlign: 'center', cursor: 'pointer', color: C.muted }}>
                <Upload size={26} style={{ marginBottom: 8 }} />
                <div style={{ fontWeight: 700, color: C.navy }}>{busy ? 'Wird gelesen…' : 'Datei auswählen'}</div>
                <div style={{ fontSize: '0.75rem' }}>.xlsx oder .csv, bis 6 MB</div>
                <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => analyze(e.target.files[0])} />
              </label>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <Pill n={s.total} label="in der Datei" color={C.navy} />
                <Pill n={s.neu} label="neu" color="#065f46" />
                <Pill n={s.vorhanden} label="schon im CRM" color={C.accent} />
                <Pill n={s.ohne_email} label="ohne E-Mail" color={C.muted} />
              </div>

              <div style={{ maxHeight: 280, overflow: 'auto', border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead><tr style={{ background: C.bg, position: 'sticky', top: 0 }}>
                    <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem' }}>Name / Firma</th>
                    <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem' }}>E-Mail</th>
                    <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem' }}>Ort</th>
                  </tr></thead>
                  <tbody>
                    {report.contacts.map((c, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '0.35rem 0.6rem' }}>
                          <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '0.05rem 0.4rem', borderRadius: 10, background: c.status === 'new' ? '#d1fae5' : '#e0e7ff', color: c.status === 'new' ? '#065f46' : '#3730a3' }}>
                            {c.status === 'new' ? 'neu' : 'vorhanden'}
                          </span>
                        </td>
                        <td style={{ padding: '0.35rem 0.6rem', fontWeight: 600, color: C.text }}>
                          {[c.first_name, c.last_name].filter(Boolean).join(' ')}
                          {c.company && c.company !== c.last_name && <span style={{ color: C.muted, fontWeight: 400 }}> · {c.company}</span>}
                        </td>
                        <td style={{ padding: '0.35rem 0.6rem', color: C.muted }}>{c.email || 'k. A.'}</td>
                        <td style={{ padding: '0.35rem 0.6rem', color: C.muted }}>{c.location || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: C.muted, marginBottom: 3 }}>Einem Mandat zuordnen (optional)</div>
                  <select value={projectId} onChange={e => setProjectId(e.target.value)} style={IN}>
                    <option value="">Kein Mandat, nur ins CRM aufnehmen</option>
                    {deals.map(d => <option key={d.id} value={d.id}>{d.codename}</option>)}
                  </select>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: C.text, cursor: projectId ? 'pointer' : 'not-allowed', opacity: projectId ? 1 : 0.5 }}>
                  <input type="checkbox" checked={sendInvite} disabled={!projectId} onChange={e => setSendInvite(e.target.checked)} />
                  Allen die Einladung zum Mandat senden (mit Projektvorstellung, Herkunft und Einwilligung)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setReport(null)} style={{ background: '#fff', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.55rem 1rem', fontWeight: 700, cursor: 'pointer' }}>Andere Datei</button>
                <button onClick={apply} disabled={busy} style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 1.3rem', fontWeight: 700, cursor: busy ? 'default' : 'pointer' }}>
                  {busy ? 'Wird übernommen…' : `${s.neu} neu anlegen${projectId ? ' und zuordnen' : ''}${sendInvite ? ' und einladen' : ''}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
