import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { Star, AlertTriangle, Mail, ShieldCheck, ShieldOff, Send, CheckSquare, Square, BellRing, Megaphone, FileText, Inbox } from 'lucide-react';
import ContactDrawer from './ContactDrawer';
import TemplateSendModal from './TemplateSendModal';
import LeadIngestModal from './LeadIngestModal';

const C = { navy: '#0D1B36', accent: '#1D4E89', bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0', text: '#0F172A', muted: '#64748B' };
const SELECT = { width: '100%', padding: '0.5rem 0.6rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.82rem', outline: 'none', background: '#fff', boxSizing: 'border-box' };

const ROLE_LABEL = { buyer: 'Käufer', advisor: 'Berater', seller: 'Verkäufer', process: 'Prozessbeteiligter', bank: 'Bank', lawyer: 'Anwalt', target: 'Ziel', other: 'Sonstige' };
// v0.269: Herkunft eines Inbound-Leads (aus der Plattform) für die „Eingang"-Markierung
const INBOUND_LABEL = { nda: 'NDA', interest: 'Interesse', watchlist: 'beobachtet', mailing: 'Mailing', marketplace: 'Marktplatz', inbound: 'Eingang' };
// Käufertyp (v0.291): Kurzform + Farbe für die Kanban-Karte
const BUYER_TYPE = {
  strategic: { short: 'Strategisch', bg: '#ede9fe', color: '#5b21b6' },
  financial: { short: 'Finanzinvestor', bg: '#dbeafe', color: '#1e40af' },
  private: { short: 'Privat', bg: '#dcfce7', color: '#166534' },
  advisor_mandate: { short: 'M&A-Suchmandat', bg: '#fef3c7', color: '#92400e' },
};
// Kurzform der Herkunftsplattform: „Deutsche Unternehmerbörse (DUB.de)" → „DUB.de"
const sourceShort = (s) => { if (!s) return ''; const m = s.match(/\(([^)]+)\)/); return m ? m[1] : s; };
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
  const [campaign, setCampaign] = useState(false);      // Massenmailing-Modal
  const [updateMail, setUpdateMail] = useState(false);  // Projekt-Update-Modal
  const [camps, setCamps] = useState([]);               // versendete Kampagnen
  const [openContact, setOpenContact] = useState(null); // Kontakt-360°-Ansicht
  const [tplSend, setTplSend] = useState(false);        // Prozess-Mailvorlage versenden
  const [leadIngest, setLeadIngest] = useState(false);  // Marktplatz-Anfrage einfügen
  const [campDetail, setCampDetail] = useState(null);   // { camp, recipients } für das Reaktions-Pop-up

  async function openCampaign(c) {
    try {
      const d = await api.get(`/crm/campaigns/${c.id}/recipients`);
      setCampDetail({ camp: c, recipients: d.recipients || [] });
    } catch (e) { show('Fehler: ' + e.message); }
  }
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
      if (d.deals.length && !active) {
        const live = d.deals.find(x => !['closed', 'withdrawn'].includes(x.deal_status) && x.status !== 'draft');
        setActive((live || d.deals[0]).id);
      }
    }).catch(e => show('Fehler: ' + e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBoard = useCallback(async () => {
    if (!active) return;
    try {
      setBoard(await api.get(`/crm/deals/${active}/parties`));
      const c = await api.get(`/crm/deals/${active}/campaigns`).catch(() => ({ campaigns: [] }));
      setCamps(c.campaigns || []);
    } catch (e) { show('Fehler: ' + e.message); }
  }, [active, show]);
  useEffect(() => { loadBoard(); setSelected([]); }, [loadBoard]);

  async function toggleReminders(campId, on) {
    try { await api.put(`/crm/campaigns/${campId}`, { reminders_enabled: on }); await loadBoard(); }
    catch (e) { show('Fehler: ' + e.message); }
  }

  const partyById = (id) => (board?.parties || []).find(p => p.id === id);
  const [moveAsk, setMoveAsk] = useState(null);   // Bestätigung beim Verschieben

  // Drop auf eine Käufer-Spalte: fragt zur Sicherheit nach (verschiebt NICHT sofort,
  // und schickt von sich aus keine Mail). Keine Änderung, wenn Stufe und Rolle gleich.
  function dropOnStage(stage) {
    const p = partyById(drag);
    if (!p) return;
    const isBuyer = (p.party_role || 'buyer') === 'buyer';
    if (isBuyer && p.funnel_stage === stage) return;   // nichts zu tun
    const label = (stages.find(s => s.key === stage) || {}).label || `Stufe ${stage}`;
    setMoveAsk({ party: p, toStage: stage, toLabel: label, wasParticipant: !isBuyer });
  }

  async function applyMove(sendMail) {
    if (!moveAsk) return;
    const { party, toStage } = moveAsk;
    const patch = { funnel_stage: toStage };
    if ((party.party_role || 'buyer') !== 'buyer') patch.party_role = 'buyer';
    try {
      await api.put(`/crm/parties/${party.id}`, patch);
      setMoveAsk(null);
      await loadBoard();
      if (sendMail) { setSelected([party.contact_id]); setTplSend(true); }
    } catch (e) { show('Fehler: ' + e.message); }
  }

  // Drop auf die Beteiligten-Zone: aus einem Käufer wird ein Prozessbeteiligter
  // (aus dem Käufer-Funnel heraus). Bereits Beteiligte bleiben, wie sie sind.
  async function dropOnInvolved() {
    const p = partyById(drag);
    if (!p) return;
    if ((p.party_role || 'buyer') === 'buyer') {
      try { await api.put(`/crm/parties/${p.id}`, { party_role: 'process' }); await loadBoard(); show('In „Beteiligte" verschoben (Prozessbeteiligter). Rolle im Kontakt änderbar.'); }
      catch (e) { show('Fehler: ' + e.message); }
    }
  }

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

  async function inviteSeller(contactId) {
    try {
      const r = await api.post(`/crm/deals/${active}/invite-seller`, { contact_id: contactId });
      show(r.sent ? 'Einladung an den Verkäufer versendet.' : `Nicht versendet: ${r.reason || 'unbekannt'}`);
      await loadBoard();
    } catch (e) { show('Fehler: ' + e.message); }
  }

  const allParties = (board?.parties || []).filter(p => hideDropped ? p.party_status !== 'dropped' : true);
  const deal = deals.find(d => d.id === active);

  // v0.280: Nur Käufer gehören in den Kauf-Funnel. Verkäufer/Mandant und weitere
  // Beteiligte (Berater, Bank, Anwalt) werden getrennt darüber gezeigt.
  const parties = allParties.filter(p => (p.party_role || 'buyer') === 'buyer');
  const involved = (board?.parties || []).filter(p => (p.party_role || 'buyer') !== 'buyer');

  // v0.269: „Eingang" ganz vorne. Dorthin kommen frische Inbound-Leads (Beobachter,
  // Favoriten), die noch nicht aktiv bearbeitet wurden (Stufe 0). NDA-/Interesse-Leads
  // haben eine höhere Stufe und stehen in ihrer regulären Spalte.
  const inboxCards = parties.filter(p => p.source === 'inbound' && (p.funnel_stage || 0) === 0);
  const inboxIds = new Set(inboxCards.map(p => p.id));
  const lanes = inboxCards.length ? [{ key: 'inbox', label: 'Eingang', inbox: true }, ...stages] : stages;
  const cardsForLane = (lane) => lane.inbox
    ? inboxCards
    : parties.filter(p => p.funnel_stage === lane.key && !inboxIds.has(p.id));
  // Käufer-bezogene Kennzahlen (statt der serverseitigen Gesamtzahlen inkl. Verkäufer)
  const buyerReached = {};
  stages.forEach(s => { buyerReached[s.key] = parties.filter(p => p.funnel_stage >= s.key).length; });

  // „Alle auswählen": Kontakte mit Widerspruch werden gar nicht erst angehakt.
  const selectable = parties.filter(p => p.contact_id
    && p.consent_status !== 'opt_out' && p.contact_status !== 'do_not_contact').map(p => p.contact_id);
  const allSelected = selectable.length > 0 && selectable.every(id => selected.includes(id));
  const toggleAll = () => setSelected(allSelected ? [] : selectable);
  // Auswahl über eine konkrete Kontaktliste (funktioniert für Stufen und „Eingang")
  const toggleIds = (ids) => {
    if (!ids.length) return;
    const on = ids.every(id => selected.includes(id));
    setSelected(s => on ? s.filter(x => !ids.includes(x)) : [...new Set([...s, ...ids])]);
  };

  return (
    <div>
      {/* Mandats-Auswahl: laufende Mandate als Reiter, abgeschlossene und Entwürfe im Klappmenü */}
      {(() => {
        const isArchived = (d) => ['closed', 'withdrawn'].includes(d.deal_status) || d.status === 'archived';
        const live = deals.filter(d => !isArchived(d) && d.status !== 'draft');
        const rest = deals.filter(d => isArchived(d) || d.status === 'draft');
        const activeIsRest = rest.some(d => d.id === active);
        return (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
            {live.map(d => (
              <button key={d.id} onClick={() => setActive(d.id)} style={{
                border: `1.5px solid ${active === d.id ? C.navy : C.border}`,
                background: active === d.id ? C.navy : '#fff', color: active === d.id ? '#fff' : C.text,
                borderRadius: 8, padding: '0.45rem 0.9rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
              }}>
                {d.codename}
                <span style={{ opacity: 0.7, fontWeight: 500, marginLeft: 6 }}>{d.parties}</span>
              </button>
            ))}
            {!!rest.length && (
              <select
                value={activeIsRest ? active : ''}
                onChange={e => e.target.value && setActive(Number(e.target.value))}
                title="Abgeschlossene Mandate und Entwürfe"
                style={{
                  ...SELECT, width: 'auto', minWidth: 230,
                  border: `1.5px solid ${activeIsRest ? C.navy : C.border}`,
                  background: activeIsRest ? C.navy : '#fff',
                  color: activeIsRest ? '#fff' : C.muted,
                  fontWeight: 700,
                }}>
                <option value="">Archiv & Entwürfe ({rest.length})</option>
                {rest.map(d => (
                  <option key={d.id} value={d.id} style={{ color: C.text, background: '#fff' }}>
                    {d.codename} · {d.parties}
                    {['closed', 'withdrawn'].includes(d.deal_status) ? ' (abgeschlossen)' : d.status === 'draft' ? ' (Entwurf)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })()}

      {/* Kontakt direkt zum Mandat hinzufügen */}
      {active && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr auto', gap: '0.4rem', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '0.7rem', marginBottom: '0.8rem' }}>
          <select value={addContact} onChange={e => setAddContact(e.target.value)} style={SELECT}>
            <option value="">Kontakt zum Mandat hinzufügen…</option>
            {allContacts
              .filter(k => !(board?.parties || []).some(p => p.contact_id === k.id))
              .map(k => (
                <option key={k.id} value={k.id}>
                  {[k.first_name, k.last_name].filter(Boolean).join(' ')}{k.companies ? `, ${k.companies}` : ''}
                </option>
              ))}
          </select>
          <select value={addRole} onChange={e => setAddRole(e.target.value)} style={SELECT}>
            {Object.entries(ROLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <select value={addStage} onChange={e => setAddStage(e.target.value)} style={SELECT}>
            {stages.map(s => <option key={s.key} value={s.key}>{s.key}: {s.label}</option>)}
          </select>
          <button onClick={addParty} disabled={!addContact} style={{
            background: addContact ? C.navy : '#cbd5e1', color: '#fff', border: 'none', borderRadius: 8,
            padding: '0 1rem', fontWeight: 700, fontSize: '0.82rem', cursor: addContact ? 'pointer' : 'default', whiteSpace: 'nowrap',
          }}>+ Hinzufügen</button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap' }}>
          <button onClick={toggleAll} disabled={!selectable.length} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: C.navy,
            border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '0.42rem 0.8rem',
            fontSize: '0.8rem', fontWeight: 700, cursor: selectable.length ? 'pointer' : 'default',
          }}>
            {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
            {allSelected ? 'Auswahl aufheben' : `Alle auswählen (${selectable.length})`}
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: C.muted, cursor: 'pointer' }}>
            <input type="checkbox" checked={hideDropped} onChange={e => setHideDropped(e.target.checked)} />
            Ausgestiegene ausblenden
          </label>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button onClick={() => setLeadIngest(true)} title="Kaufanfrage aus einem Marktplatz (DUB.de u. a.) einfügen" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: C.navy,
            border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '0.5rem 0.9rem',
            fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
          }}>
            <Inbox size={14} /> Anfrage einfügen
          </button>
          {active && (
            <button onClick={() => setUpdateMail(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: C.navy,
              border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '0.5rem 0.9rem',
              fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
            }}>
              <BellRing size={14} /> Prozess-Update
            </button>
          )}
          {selected.length > 0 && (
            <>
              <button onClick={() => setTplSend(true)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: C.navy,
                border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '0.5rem 0.9rem',
                fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
              }}>
                <FileText size={14} /> Prozess-Mail ({selected.length})
              </button>
              <button onClick={inviteSelected} disabled={inviting} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: C.navy,
                border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '0.5rem 0.9rem',
                fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
              }}>
                <Mail size={14} /> {inviting ? 'Wird versendet…' : 'Nur Einwilligung anfragen'}
              </button>
              <button onClick={() => setCampaign(true)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, background: C.navy, color: '#fff', border: 'none',
                borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
              }}>
                <Megaphone size={14} /> {selected.length} anschreiben (Mandats-Mailing)
              </button>
            </>
          )}
        </div>
      </div>

      {/* Kampagnen des Mandats: Reaktionen und Reminder-Automatik */}
      {!!camps.length && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '0.7rem 0.9rem', marginBottom: '0.9rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: C.navy, marginBottom: '0.5rem' }}>Versendete Mailings</div>
          {camps.slice(0, 5).map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', padding: '0.35rem 0', borderTop: '1px solid #F1F5F9' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: C.text }}>
                  {c.name} <span style={{ fontWeight: 500, color: C.muted }}>· {c.purpose === 'update' ? 'Prozess-Update' : 'Ansprache'}</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: C.muted }}>
                  {new Date(c.sent_at || c.created_at).toLocaleDateString('de-DE')} · {c.recipients} Empfänger ·{' '}
                  <button onClick={() => openCampaign(c)} title="Wer hat reagiert? Empfänger anzeigen"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#059669', fontWeight: 700, textDecoration: 'underline' }}>
                    {c.responded} Reaktion(en)
                  </button>
                  {c.reminded > 0 && <> · {c.reminded} erinnert</>}
                  {c.no_response > 0 && <> · {c.no_response} ohne Rückmeldung</>}
                  {c.skipped > 0 && <> · {c.skipped} gesperrt</>}
                  {' · '}<button onClick={() => openCampaign(c)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: C.accent, fontWeight: 600 }}>Empfänger</button>
                </div>
              </div>
              {c.purpose !== 'update' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: C.muted, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <input type="checkbox" checked={!!c.reminders_enabled} onChange={e => toggleReminders(c.id, e.target.checked)} />
                  Reminder Tag 7 / 21
                </label>
              )}
            </div>
          ))}
        </div>
      )}

      {deal && board && (involved.length > 0 || drag) && (
        <div
          onDragOver={(e) => { e.preventDefault(); setOverStage('involved'); }}
          onDragLeave={() => setOverStage(null)}
          onDrop={() => { if (drag) dropOnInvolved(); setDrag(null); setOverStage(null); }}
          style={{ background: overStage === 'involved' ? '#EDE9FE' : '#F5F3FF', border: `1px ${overStage === 'involved' ? 'dashed' : 'solid'} ${overStage === 'involved' ? '#7c3aed' : '#DDD6FE'}`, borderRadius: 10, padding: '0.6rem 0.9rem', marginBottom: '0.9rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#5b21b6', marginBottom: '0.4rem' }}>Mandant &amp; Beteiligte <span style={{ fontWeight: 400, color: C.muted }}>· nicht Teil des Käufer-Funnels · Karten hierher ziehen</span></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {!involved.length && <div style={{ fontSize: '0.72rem', color: '#a78bfa', padding: '0.3rem 0' }}>Karte hierher ziehen, um sie als Beteiligten zu führen.</div>}
            {involved.map(p => {
              const registered = p.invite_status === 'registered';
              const invited = ['invited', 'opened', 'consented'].includes(p.invite_status);
              return (
                <div key={p.id} draggable onDragStart={() => setDrag(p.id)} onDragEnd={() => { setDrag(null); setOverStage(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #DDD6FE', borderRadius: 8, padding: '0.4rem 0.6rem', cursor: 'grab' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#5b21b6', background: '#EDE9FE', borderRadius: 8, padding: '0.05rem 0.4rem' }}>{ROLE_LABEL[p.party_role] || p.party_role}</span>
                  <button onClick={() => setOpenContact(p.contact_id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', color: C.accent }}>
                    {[p.first_name, p.last_name].filter(Boolean).join(' ')}
                  </button>
                  {p.company_name && <span style={{ fontSize: '0.72rem', color: C.muted }}>· {p.company_name}</span>}
                  {p.party_role === 'seller' && (
                    registered
                      ? <span style={{ fontSize: '0.66rem', color: '#065f46', fontWeight: 700 }}>✓ registriert</span>
                      : <button onClick={() => inviteSeller(p.contact_id)} disabled={!p.email} title={p.email ? 'Verkäufer zur Plattform einladen (sieht den Prozessstand)' : 'Keine E-Mail hinterlegt'}
                          style={{ fontSize: '0.68rem', fontWeight: 700, color: '#fff', background: p.email ? '#7c3aed' : '#c4b5fd', border: 'none', borderRadius: 6, padding: '0.2rem 0.55rem', cursor: p.email ? 'pointer' : 'default' }}>
                          {invited ? 'Erneut einladen' : 'Einladen'}
                        </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {deal && board && (
        <>
          {/* Funnel-Kennzahlen */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.4rem', marginBottom: '1rem' }}>
            {stages.map(s => {
              const reached = buyerReached[s.key] || 0;
              const prev = s.key > 0 ? (buyerReached[s.key - 1] || 0) : null;
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
            {lanes.map(s => {
              const cards = cardsForLane(s);
              const dropStage = s.inbox ? 0 : s.key;   // Drop in „Eingang" = Stufe 0
              return (
                <div
                  key={s.key}
                  onDragOver={(e) => { e.preventDefault(); setOverStage(s.key); }}
                  onDragLeave={() => setOverStage(null)}
                  onDrop={() => { if (drag) dropOnStage(dropStage); setDrag(null); setOverStage(null); }}
                  style={{
                    minWidth: 210, flex: '1 0 210px', background: overStage === s.key ? '#EEF4FB' : (s.inbox ? '#FFFBEB' : C.bg),
                    border: `1px solid ${overStage === s.key ? C.accent : (s.inbox ? '#fcd34d' : C.border)}`, borderRadius: 10, padding: '0.6rem',
                  }}>
                  {(() => {
                    const colIds = cards.filter(p => selectable.includes(p.contact_id)).map(p => p.contact_id);
                    const colSel = colIds.filter(id => selected.includes(id)).length;
                    const colAll = colIds.length > 0 && colSel === colIds.length;
                    return (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: C.navy, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                          <span>{s.label}</span>
                          <span style={{ color: C.muted }}>{cards.length}</span>
                        </div>
                        {colIds.length > 0 && (
                          <label
                            title={`Alle ${colIds.length} Kontakte der Stufe „${s.label}" auswählen`}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, cursor: 'pointer',
                              fontSize: '0.65rem', fontWeight: 700, color: colSel ? C.accent : C.muted, userSelect: 'none',
                            }}>
                            <input
                              type="checkbox"
                              checked={colAll}
                              ref={el => { if (el) el.indeterminate = colSel > 0 && !colAll; }}
                              onChange={() => toggleIds(colIds)}
                              style={{ margin: 0 }}
                            />
                            {colSel ? `${colSel}/${colIds.length} ausgewählt` : `Stufe auswählen (${colIds.length})`}
                          </label>
                        )}
                      </div>
                    );
                  })()}

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
                            <div
                              onClick={(e) => { e.stopPropagation(); setOpenContact(p.contact_id); }}
                              title="Kontakt öffnen, pflegen und Aktivitäten sehen"
                              style={{ fontWeight: 700, fontSize: '0.78rem', color: C.accent, display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'transparent' }}
                              onMouseEnter={e => { e.currentTarget.style.textDecorationColor = C.accent; }}
                              onMouseLeave={e => { e.currentTarget.style.textDecorationColor = 'transparent'; }}>
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
                          {p.buyer_type && BUYER_TYPE[p.buyer_type] && (
                            <span title={`Käufertyp: ${BUYER_TYPE[p.buyer_type].short}`} style={{ background: BUYER_TYPE[p.buyer_type].bg, color: BUYER_TYPE[p.buyer_type].color, padding: '0.05rem 0.35rem', borderRadius: 10, fontSize: '0.58rem', fontWeight: 700 }}>{BUYER_TYPE[p.buyer_type].short}</span>
                          )}
                          {p.lead_source ? (
                            <span title={`Kam über ${p.lead_source}${p.lead_ref ? ` (${p.lead_ref})` : ''}`}
                              style={{ background: '#DBEAFE', color: '#1e40af', padding: '0.05rem 0.35rem', borderRadius: 10, fontSize: '0.58rem', fontWeight: 700 }}>
                              ⬢ {sourceShort(p.lead_source)}
                            </span>
                          ) : p.source === 'inbound' && (
                            <span title={`Aus der Plattform: ${INBOUND_LABEL[p.inbound_signal] || 'Eingang'}`}
                              style={{ background: '#FEF3C7', color: '#92400e', padding: '0.05rem 0.35rem', borderRadius: 10, fontSize: '0.58rem', fontWeight: 700 }}>
                              Eingang{p.inbound_signal && INBOUND_LABEL[p.inbound_signal] ? ` · ${INBOUND_LABEL[p.inbound_signal]}` : ''}
                            </span>
                          )}
                          {(() => {
                            const eff = (p.nda_status === 'signed' || p.nda_online === 'signed') ? 'signed'
                              : (p.nda_status === 'open' || p.nda_online === 'open') ? 'open' : null;
                            if (eff === 'signed') return <span title="NDA liegt vor (online oder manuell)" style={{ background: '#d1fae5', color: '#065f46', padding: '0.05rem 0.35rem', borderRadius: 10, fontSize: '0.58rem', fontWeight: 800 }}>NDA ✓</span>;
                            if (eff === 'open') return <span title="NDA angefragt, noch nicht unterzeichnet" style={{ background: '#fef3c7', color: '#92400e', padding: '0.05rem 0.35rem', borderRadius: 10, fontSize: '0.58rem', fontWeight: 800 }}>NDA offen</span>;
                            return null;
                          })()}
                          {p.access_granted === 1 && (
                            <span title="Hat Zugang zum Mandat (Unterlagen/Datenraum)" style={{ background: '#dbeafe', color: '#1e40af', padding: '0.05rem 0.35rem', borderRadius: 10, fontSize: '0.58rem', fontWeight: 800 }}>Zugang</span>
                          )}
                          {p.identity_revealed === 1 && (
                            <span title="Klarname für diesen Interessenten freigegeben" style={{ background: '#dcfce7', color: '#166534', padding: '0.05rem 0.35rem', borderRadius: 10, fontSize: '0.58rem', fontWeight: 800 }}>Klarname</span>
                          )}
                          {p.platform_nda && (
                            <span title="Käufer hat das Plattform-NDA gezeichnet" style={{ background: '#ede9fe', color: '#5b21b6', padding: '0.05rem 0.35rem', borderRadius: 10, fontSize: '0.58rem', fontWeight: 800 }}>Plattform-NDA</span>
                          )}
                          {p.consent_status === 'opt_in' && <ShieldCheck size={11} color="#059669" title="Einwilligung erteilt" />}
                          {(p.consent_status === 'opt_out' || p.contact_status === 'do_not_contact') && <ShieldOff size={11} color="#dc2626" title="Widerspruch, nicht kontaktieren" />}
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
                  {!cards.length && <div style={{ fontSize: '0.68rem', color: '#cbd5e1', textAlign: 'center', padding: '0.8rem 0' }}>k. A.</div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!deals.length && <div style={{ padding: '2rem', textAlign: 'center', color: C.muted }}>Noch keine Mandate mit Beteiligten.</div>}

      {campaign && deal && (
        <CampaignModal
          project={deal}
          contactIds={selected}
          onClose={() => setCampaign(false)}
          onSent={(r) => {
            setCampaign(false); setSelected([]); loadBoard();
            show(`Mailing versendet: ${r.sent} Kontakt(e) · ${r.skipped} übersprungen`);
          }}
          show={show}
        />
      )}

      {tplSend && deal && (
        <TemplateSendModal
          project={deal}
          contactIds={selected}
          onClose={() => setTplSend(false)}
          onSent={(r) => {
            setTplSend(false); setSelected([]); loadBoard();
            show(`Prozess-Mail versendet: ${r.sent} Kontakt(e) · ${r.skipped} übersprungen`);
          }}
          show={show}
        />
      )}

      {openContact && (
        <ContactDrawer
          contactId={openContact}
          onClose={() => setOpenContact(null)}
          onChanged={loadBoard}
          show={show}
        />
      )}

      {leadIngest && (
        <LeadIngestModal
          deals={deals}
          activeProjectId={active || ''}
          onClose={() => setLeadIngest(false)}
          onDone={() => loadBoard()}
          show={show}
        />
      )}

      {moveAsk && (
        <div onClick={() => setMoveAsk(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: 'min(460px, 96vw)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', padding: '1.2rem 1.3rem' }}>
            <div style={{ fontWeight: 800, color: C.navy, fontSize: '1rem', marginBottom: 6 }}>
              {[moveAsk.party.first_name, moveAsk.party.last_name].filter(Boolean).join(' ')} nach „{moveAsk.toLabel}" verschieben?
            </div>
            <div style={{ fontSize: '0.85rem', color: C.muted, lineHeight: 1.5, marginBottom: 14 }}>
              {moveAsk.wasParticipant && <>Der Kontakt wird dabei vom Beteiligten zum Käufer. </>}
              Das Verschieben allein sendet <strong>keine</strong> E-Mail. Sie können den Kontakt hier optional gleich mit der passenden Prozess-Mail anschreiben.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => setMoveAsk(null)} style={{ background: '#fff', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.5rem 0.9rem', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>Abbrechen</button>
              <button onClick={() => applyMove(false)} style={{ background: '#fff', color: C.navy, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '0.5rem 0.9rem', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>Nur verschieben</button>
              <button onClick={() => applyMove(true)} style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>Verschieben + Prozess-Mail</button>
            </div>
          </div>
        </div>
      )}

      {campDetail && (() => {
        const R = campDetail.recipients;
        const name = (r) => [r.salutation, r.title, r.first_name, r.last_name].filter(Boolean).join(' ').trim() || r.email || 'Unbekannt';
        const groups = [
          ['responded', 'Reagiert (Einwilligung, Registrierung oder Antwort)', '#065f46', '#d1fae5'],
          ['reminded', 'Erinnert, noch offen', '#92400e', '#fef3c7'],
          ['sent', 'Angeschrieben, wartet auf Reaktion', '#475569', '#f1f5f9'],
          ['suppressed', 'Wird im Funnel geführt (kein Reminder)', '#3730a3', '#e0e7ff'],
          ['no_response', 'Ohne Rückmeldung (Serie beendet)', '#475569', '#f1f5f9'],
          ['skipped', 'Nicht angeschrieben (Widerspruch)', '#991b1b', '#fee2e2'],
        ];
        return (
          <div onClick={() => setCampDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: 'min(620px, 96vw)', maxHeight: '88vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.2rem', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 800, color: C.navy, fontSize: '0.95rem', minWidth: 0 }}>
                  {campDetail.camp.name}
                  <div style={{ fontWeight: 400, color: C.muted, fontSize: '0.72rem' }}>{R.length} Empfänger · wer hat reagiert?</div>
                </div>
                <button onClick={() => setCampDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: '1.2rem' }}>×</button>
              </div>
              <div style={{ padding: '0.9rem 1.2rem' }}>
                {groups.map(([key, label, color, bg]) => {
                  const list = R.filter(r => r.status === key);
                  if (!list.length) return null;
                  return (
                    <div key={key} style={{ marginBottom: '0.9rem' }}>
                      <div style={{ display: 'inline-block', background: bg, color, fontSize: '0.66rem', fontWeight: 800, padding: '0.1rem 0.5rem', borderRadius: 10, marginBottom: '0.4rem' }}>{label} ({list.length})</div>
                      {list.map((r, i) => (
                        <div key={i} onClick={() => r.contact_id && (setCampDetail(null), setOpenContact(r.contact_id))}
                          title={r.contact_id ? 'Kontakt öffnen' : ''}
                          style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '0.3rem 0', borderTop: '1px solid #F1F5F9', cursor: r.contact_id ? 'pointer' : 'default' }}>
                          <span style={{ fontSize: '0.82rem', color: C.text, fontWeight: 600 }}>{name(r)}
                            {r.company_name && <span style={{ fontWeight: 400, color: C.muted }}> · {r.company_name}</span>}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: C.muted, whiteSpace: 'nowrap' }}>
                            {r.responded_at ? new Date(r.responded_at).toLocaleDateString('de-DE') : (r.reminder_count > 0 ? `${r.reminder_count}× erinnert` : '')}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
                {!R.length && <div style={{ color: C.muted, fontSize: '0.85rem' }}>Noch keine Empfänger erfasst.</div>}
              </div>
            </div>
          </div>
        );
      })()}

      {updateMail && deal && (
        <UpdateMailModal
          project={deal}
          onClose={() => setUpdateMail(false)}
          onSent={(r) => { setUpdateMail(false); loadBoard(); show(r.sent ? `Prozess-Update an ${r.sent} Beteiligte versendet` : `Nicht versendet: ${r.reason}`); }}
          show={show}
        />
      )}
    </div>
  );
}

// ── Massenmailing: Mandats-Ansprache mit Einwilligung + Pflege-Link ──────────
function CampaignModal({ project, contactIds, onClose, onSent, show }) {
  const [subject, setSubject] = useState(`[Vertraulich] ${project.codename}, vertrauliche Vorabinformation`);
  const [intro, setIntro] = useState('');
  const [reminders, setReminders] = useState(true);
  const [preview, setPreview] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.post(`/crm/deals/${project.id}/campaign/preview`, { contact_ids: contactIds })
      .then(setPreview).catch(e => show('Fehler: ' + e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    if (!window.confirm(
      `${preview?.send || 0} Kontakt(e) zum Mandat „${project.codename}" anschreiben?\n\n` +
      `Kontakte ohne Einwilligung erhalten eine Double-Opt-in-Anfrage, Unterlagen gibt es erst nach Zustimmung. ` +
      `Widersprüche werden übersprungen.${reminders ? '\n\nReminder laufen automatisch an Tag 7 und Tag 21.' : ''}`)) return;
    setSending(true);
    try {
      const r = await api.post(`/crm/deals/${project.id}/campaign`, {
        contact_ids: contactIds, subject, intro, reminders_enabled: reminders,
      });
      onSent(r);
    } catch (e) { show('Fehler: ' + e.message); setSending(false); }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,54,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: '1.4rem', width: 'min(640px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 0.3rem', color: C.navy, fontSize: '1.05rem' }}>Mandats-Mailing: {project.codename}</h3>
        <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: C.muted, lineHeight: 1.5 }}>
          Eine Mail, drei Zwecke: anonymes Kurzprofil des Mandats, Einwilligung nach DSGVO (Double-Opt-in)
          und ein persönlicher Link zur Pflege der Kontaktdaten.
        </p>

        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: C.text }}>Betreff</label>
        <input value={subject} onChange={e => setSubject(e.target.value)} style={{ ...SELECT, margin: '0.3rem 0 0.9rem' }} />

        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: C.text }}>Persönliche Einleitung (optional)</label>
        <textarea
          value={intro} onChange={e => setIntro(e.target.value)} rows={5}
          placeholder="Leer lassen für den Standardtext: sachliche Vorstellung des Mandats, Hinweis auf Anonymität bis zum NDA."
          style={{ ...SELECT, margin: '0.3rem 0 0.5rem', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
        <div style={{ fontSize: '0.7rem', color: C.muted, marginBottom: '0.9rem' }}>
          Eckdaten (Branche, Region, Umsatz-/EBITDA-Band), Prozessablauf, Unterschrift und Rechtshinweis werden automatisch ergänzt.
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: C.text, cursor: 'pointer', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.6rem 0.7rem' }}>
          <input type="checkbox" checked={reminders} onChange={e => setReminders(e.target.checked)} />
          <span>
            <strong>Automatisch nachfassen</strong>: höfliche Erinnerung an <strong>Tag 7</strong>, abschließende Nachfrage an <strong>Tag 21</strong>.
            <span style={{ display: 'block', fontSize: '0.72rem', color: C.muted, marginTop: 2 }}>
              Jede Reaktion (Zustimmung, Absage, Statuswechsel im Funnel) stoppt die Serie sofort. Danach keine weitere Ansprache.
            </span>
          </span>
        </label>

        {preview && (
          <div style={{ marginTop: '1rem', border: `1px solid ${C.border}`, borderRadius: 8, maxHeight: 180, overflowY: 'auto' }}>
            <div style={{ padding: '0.5rem 0.7rem', background: C.bg, fontSize: '0.75rem', fontWeight: 700, color: C.navy, position: 'sticky', top: 0 }}>
              {preview.send} Empfänger · {preview.skip} übersprungen
            </div>
            {preview.recipients.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '0.35rem 0.7rem', fontSize: '0.74rem', borderTop: '1px solid #F1F5F9', opacity: r.skip ? 0.55 : 1 }}>
                <span style={{ color: C.text }}>{r.name} <span style={{ color: C.muted }}>{r.email}</span></span>
                <span style={{ whiteSpace: 'nowrap', color: r.skip ? '#dc2626' : (r.needs_consent ? '#d97706' : '#059669'), fontWeight: 700 }}>
                  {r.skip || (r.needs_consent ? 'Einwilligung nötig' : 'eingewilligt')}
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.2rem' }}>
          <button onClick={onClose} style={{ background: '#fff', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.55rem 1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>Abbrechen</button>
          <button onClick={send} disabled={sending || !preview?.send} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: sending || !preview?.send ? '#cbd5e1' : C.navy, color: '#fff', border: 'none', borderRadius: 8,
            padding: '0.55rem 1.2rem', fontSize: '0.82rem', fontWeight: 700, cursor: sending || !preview?.send ? 'default' : 'pointer',
          }}>
            <Send size={14} /> {sending ? 'Wird versendet…' : `An ${preview?.send || 0} versenden`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Prozess-Update an die aktiven, eingewilligten Beteiligten ────────────────
function UpdateMailModal({ project, onClose, onSent, show }) {
  const [note, setNote] = useState('');
  const [list, setList] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get(`/crm/deals/${project.id}/active-participants`)
      .then(d => setList(d.participants || [])).catch(() => setList([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    setSending(true);
    try { onSent(await api.post(`/crm/deals/${project.id}/update-mail`, { note })); }
    catch (e) { show('Fehler: ' + e.message); setSending(false); }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,54,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: '1.4rem', width: 'min(560px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 0.3rem', color: C.navy, fontSize: '1.05rem' }}>Prozess-Update: {project.codename}</h3>
        <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: C.muted, lineHeight: 1.5 }}>
          Geht ausschließlich an Beteiligte, die eingewilligt haben und noch im Prozess sind
          ({list === null ? '…' : list.length} Empfänger). Ausgestiegene und Widersprüche bleiben außen vor.
        </p>
        <textarea
          value={note} onChange={e => setNote(e.target.value)} rows={5}
          placeholder={'z. B.: Der Zeitplan wurde angepasst, indikative Angebote werden bis zum 15.08. erbeten. Das Information Memorandum liegt in aktualisierter Fassung im Datenraum.'}
          style={{ ...SELECT, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
        {list !== null && !!list.length && (
          <div style={{ marginTop: '0.7rem', fontSize: '0.74rem', color: C.muted, lineHeight: 1.6 }}>
            {list.map(p => p.name).join(' · ')}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.2rem' }}>
          <button onClick={onClose} style={{ background: '#fff', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.55rem 1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>Abbrechen</button>
          <button onClick={send} disabled={sending || note.trim().length < 10 || !(list || []).length} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: sending || note.trim().length < 10 || !(list || []).length ? '#cbd5e1' : C.navy,
            color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 1.2rem', fontSize: '0.82rem', fontWeight: 700,
            cursor: sending ? 'default' : 'pointer',
          }}>
            <Send size={14} /> {sending ? 'Wird versendet…' : 'Update versenden'}
          </button>
        </div>
      </div>
    </div>
  );
}
