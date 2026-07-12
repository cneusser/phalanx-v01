import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { Star, AlertTriangle, Mail, ShieldCheck, ShieldOff } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0', text: '#0F172A', muted: '#64748B' };
const SELECT = { width: '100%', padding: '0.5rem 0.6rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.82rem', outline: 'none', background: '#fff', boxSizing: 'border-box' };

const ROLE_LABEL = { buyer: 'Käufer', advisor: 'Berater', seller: 'Verkäufer', bank: 'Bank', lawyer: 'Anwalt', target: 'Ziel', other: 'Sonstige' };
const STATUS_STYLE = {
  active: { label: 'aktiv', bg: '#d1fae5', color: '#065f46' },
  open: { label: 'offen', bg: '#f1f5f9', color: '#475569' },
  dropped: { label: 'raus', bg: '#fee2e2', color: '#991b1b' },
  unclear: { label: 'unklar', bg: '#fef3c7', color: '#92400e' },
};

export default function DealFunnelBoard({ show }) {
  const [deals, setDeals] = useState([]);
  const [stages, setStages] = useState([]);
  const [active, setActive] = useState(null);
  const [board, setBoard] = useState(null);
  const [drag, setDrag] = useState(null);
  const [overStage, setOverStage] = useState(null);
  const [hideDropped, setHideDropped] = useState(true);
  const [selected, setSelected] = useState([]);   // Kontakt-IDs für Sammel-Einladung
  const [inviting, setInviting] = useState(false);
  // Kontakt direkt zum Mandat hinzufügen
  const [allContacts, setAllContacts] = useState([]);
  const [addContact, setAddContact] = useState('');
  const [addRole, setAddRole] = useState('buyer');
  const [addStage, setAddStage] = useState(0);

  useEffect(() => { api.get('/crm/contacts').then(setAllContacts).catch(() => {}); }, []);

  async function addParty() {
    if (!addContact || !active) return;
    try {
      await api.post(`/crm/deals/${active}/parties`, {
        contact_id: Number(addContact), party_role: addRole, funnel_stage: Number(addStage),
      });
      setAddContact('');
      await loadBoard();
      show('Kontakt zum Mandat hinzugefügt ✓');
    } catch (e) { show('Fehler: ' + e.message); }
  }

  useEffect(() => {
    api.get('/crm/deals').then(d => {
      setDeals(d.deals); setStages(d.stages);
      if (d.deals.length && !active) setActive(d.deals[0].id);
    }).catch(e => show('Fehler: ' + e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBoard = useCallback(async () => {
    if (!active) return;
    try { setBoard(await api.get(`/crm/deals/${active}/parties`)); }
    catch (e) { show('Fehler: ' + e.message); }
  }, [active, show]);
  useEffect(() => { loadBoard(); setSelected([]); }, [loadBoard]);

  async function moveTo(partyId, stage) {
    try { await api.put(`/crm/parties/${partyId}`, { funnel_stage: stage }); await loadBoard(); }
    catch (e) { show('Fehler: ' + e.message); }
  }
  async function setStatus(partyId, status) {
    try { await api.put(`/crm/parties/${partyId}`, { party_status: status }); await loadBoard(); }
    catch (e) { show('Fehler: ' + e.message); }
  }

  async function inviteSelected() {
    if (!selected.length) return;
    if (!window.confirm(
      `${selected.length} Kontakt(e) zu CapitalMatch einladen?\n\n` +
      `Es geht eine E-Mail mit Einwilligungs-Anfrage raus (Double-Opt-in). ` +
      `Ein Konto wird erst angelegt, wenn der Empfänger aktiv zustimmt. ` +
      `Kontakte mit Widerspruch werden automatisch übersprungen.`)) return;
    setInviting(true);
    try {
      const r = await api.post('/crm/invite/bulk', { contact_ids: selected });
      show(`Einladungen: ${r.sent} versendet · ${r.already} liefen bereits · ${r.blocked} übersprungen (Widerspruch/keine E-Mail)`);
      setSelected([]); await loadBoard();
    } catch (e) { show('Fehler: ' + e.message); }
    finally { setInviting(false); }
  }

  const toggle = (contactId) => setSelected(s => s.includes(contactId) ? s.filter(x => x !== contactId) : [...s, contactId]);

  const parties = (board?.parties || []).filter(p => hideDropped ? p.party_status !== 'dropped' : true);
  const deal = deals.find(d => d.id === active);

  return (
    <div>
      {/* Mandats-Auswahl */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {deals.map(d => (
          <button key={d.id} onClick={() => setActive(d.id)} style={{
            border: `1.5px solid ${active === d.id ? C.navy : C.border}`,
            background: active === d.id ? C.navy : '#fff', color: active === d.id ? '#fff' : C.text,
            borderRadius: 8, padding: '0.45rem 0.9rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
          }}>
            {d.codename}
            <span style={{ opacity: 0.7, fontWeight: 500, marginLeft: 6 }}>{d.parties}</span>
            {d.status === 'draft' && <span style={{ marginLeft: 6, fontSize: '0.65rem', opacity: 0.7 }}>(Entwurf)</span>}
          </button>
        ))}
      </div>

      {/* Kontakt direkt zum Mandat hinzufügen */}
      {active && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr auto', gap: '0.4rem', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '0.7rem', marginBottom: '0.8rem' }}>
          <select value={addContact} onChange={e => setAddContact(e.target.value)} style={SELECT}>
            <option value="">Kontakt zum Mandat hinzufügen…</option>
            {allContacts
              .filter(k => !(board?.parties || []).some(p => p.contact_id === k.id))
              .map(k => (
                <option key={k.id} value={k.id}>
                  {[k.first_name, k.last_name].filter(Boolean).join(' ')}{k.companies ? ` — ${k.companies}` : ''}
                </option>
              ))}
          </select>
          <select value={addRole} onChange={e => setAddRole(e.target.value)} style={SELECT}>
            {Object.entries(ROLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <select value={addStage} onChange={e => setAddStage(e.target.value)} style={SELECT}>
            {stages.map(s => <option key={s.key} value={s.key}>{s.key} — {s.label}</option>)}
          </select>
          <button onClick={addParty} disabled={!addContact} style={{
            background: addContact ? C.navy : '#cbd5e1', color: '#fff', border: 'none', borderRadius: 8,
            padding: '0 1rem', fontWeight: 700, fontSize: '0.82rem', cursor: addContact ? 'pointer' : 'default', whiteSpace: 'nowrap',
          }}>+ Hinzufügen</button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.8rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: C.muted, cursor: 'pointer' }}>
          <input type="checkbox" checked={hideDropped} onChange={e => setHideDropped(e.target.checked)} />
          Ausgestiegene ausblenden
        </label>
        {selected.length > 0 && (
          <button onClick={inviteSelected} disabled={inviting} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, background: C.navy, color: '#fff', border: 'none',
            borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
          }}>
            <Mail size={14} /> {inviting ? 'Wird versendet…' : `${selected.length} Kontakt(e) einladen (DSGVO)`}
          </button>
        )}
      </div>

      {deal && board && (
        <>
          {/* Funnel-Kennzahlen */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.4rem', marginBottom: '1rem' }}>
            {stages.map(s => {
              const reached = board.reached[s.key] || 0;
              const prev = s.key > 0 ? (board.reached[s.key - 1] || 0) : null;
              const conv = prev ? Math.round((reached / Math.max(prev, 1)) * 100) : null;
              return (
                <div key={s.key} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: reached > 0 ? C.accent : C.muted }}>{reached}</div>
                  <div style={{ fontSize: '0.62rem', color: C.muted, fontWeight: 600, lineHeight: 1.2 }}>{s.label}</div>
                  {conv !== null && <div style={{ fontSize: '0.6rem', color: conv >= 50 ? '#059669' : conv >= 25 ? '#d97706' : '#dc2626', fontWeight: 700 }}>{conv}%</div>}
                </div>
              );
            })}
          </div>

          {/* Kanban */}
          <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {stages.map(s => {
              const cards = parties.filter(p => p.funnel_stage === s.key);
              return (
                <div
                  key={s.key}
                  onDragOver={(e) => { e.preventDefault(); setOverStage(s.key); }}
                  onDragLeave={() => setOverStage(null)}
                  onDrop={() => { if (drag) moveTo(drag, s.key); setDrag(null); setOverStage(null); }}
                  style={{
                    minWidth: 210, flex: '1 0 210px', background: overStage === s.key ? '#EEF4FB' : C.bg,
                    border: `1px solid ${overStage === s.key ? C.accent : C.border}`, borderRadius: 10, padding: '0.6rem',
                  }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: C.navy, marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{s.label}</span><span style={{ color: C.muted }}>{cards.length}</span>
                  </div>

                  {cards.map(p => {
                    const st = STATUS_STYLE[p.party_status] || STATUS_STYLE.open;
                    const invited = ['invited', 'opened', 'consented', 'registered'].includes(p.invite_status);
                    return (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={() => setDrag(p.id)}
                        onDragEnd={() => { setDrag(null); setOverStage(null); }}
                        style={{
                          background: C.card, border: `1px solid ${p.stagnant ? '#fcd34d' : C.border}`,
                          borderRadius: 8, padding: '0.55rem 0.6rem', marginBottom: '0.4rem', cursor: 'grab',
                          opacity: p.party_status === 'dropped' ? 0.55 : 1,
                        }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                          <input
                            type="checkbox"
                            checked={selected.includes(p.contact_id)}
                            onChange={() => toggle(p.contact_id)}
                            onClick={e => e.stopPropagation()}
                            title="Für Plattform-Einladung auswählen"
                            style={{ marginTop: 2, flexShrink: 0 }}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.78rem', color: C.text, display: 'flex', alignItems: 'center', gap: 3 }}>
                              {p.is_decision_maker === 1 && <Star size={10} color="#f59e0b" fill="#f59e0b" />}
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {[p.first_name, p.last_name].filter(Boolean).join(' ')}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.66rem', color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.company_name || p.email}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 4, alignItems: 'center' }}>
                          <span style={{ background: st.bg, color: st.color, padding: '0.05rem 0.35rem', borderRadius: 10, fontSize: '0.6rem', fontWeight: 700 }}>{st.label}</span>
                          <span style={{ fontSize: '0.6rem', color: C.muted }}>{ROLE_LABEL[p.party_role] || p.party_role}</span>
                          {p.consent_status === 'opt_in' && <ShieldCheck size={11} color="#059669" title="Einwilligung erteilt" />}
                          {(p.consent_status === 'opt_out' || p.contact_status === 'do_not_contact') && <ShieldOff size={11} color="#dc2626" title="Widerspruch — nicht kontaktieren" />}
                          {invited && <Mail size={11} color={C.accent} title={`Einladung: ${p.invite_status}`} />}
                          {p.stagnant && (
                            <span title={`Seit ${p.days_in_stage} Tagen ohne Fortschritt`} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: '#92400e', fontSize: '0.6rem', fontWeight: 700 }}>
                              <AlertTriangle size={10} /> {p.days_in_stage}T
                            </span>
                          )}
                        </div>

                        {p.next_step && (
                          <div style={{ fontSize: '0.62rem', color: C.muted, marginTop: 3, lineHeight: 1.35, maxHeight: 26, overflow: 'hidden' }}>
                            → {p.next_step}
                          </div>
                        )}

                        <select
                          value={p.party_status}
                          onChange={e => setStatus(p.id, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          style={{ marginTop: 4, width: '100%', fontSize: '0.62rem', padding: '0.15rem', border: `1px solid ${C.border}`, borderRadius: 5, cursor: 'pointer' }}>
                          <option value="open">offen</option>
                          <option value="active">aktiv/dabei</option>
                          <option value="unclear">unklar</option>
                          <option value="dropped">ausgestiegen</option>
                        </select>
                      </div>
                    );
                  })}
                  {!cards.length && <div style={{ fontSize: '0.68rem', color: '#cbd5e1', textAlign: 'center', padding: '0.8rem 0' }}>—</div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!deals.length && <div style={{ padding: '2rem', textAlign: 'center', color: C.muted }}>Noch keine Mandate mit Beteiligten.</div>}
    </div>
  );
}
