// ─────────────────────────────────────────────────────────────────────────────
// Kontakt-360°-Ansicht (CRM V): überall einsetzbar: aus dem Deal-Funnel, der
// Kontaktliste oder dem Admin-Dashboard. Zeigt Stammdaten (editierbar), die
// Mandats-Zuordnungen und eine chronologische Aktivitäten-Historie: was ist wann
// rausgegangen (Einladung, Mailing, Reminder, Pflege-Link) und was kam zurück
// (geöffnet, eingewilligt, registriert, selbst gepflegt, widersprochen).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import { api, getToken } from '../api/client';
import { X, Mail, Send, ShieldCheck, ShieldOff, Star, Save, ExternalLink, FileText, Inbox, Check, Plus } from 'lucide-react';
import TemplateSendModal from './TemplateSendModal';

const C = { navy: '#0D1B36', accent: '#1D4E89', bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0', text: '#0F172A', muted: '#64748B' };
const IN = { width: '100%', padding: '0.45rem 0.6rem', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: '0.82rem', outline: 'none', background: '#fff', boxSizing: 'border-box' };
const LBL = { fontSize: '0.68rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.03em' };

const STAGE_LABEL = ['Longlist', 'Angesprochen', 'Rückmeldung', 'Match', 'NDA', 'IM / Unterlagen', 'Gespräch', 'LOI eingereicht', 'LOI unterschrieben', 'Namensnennung', 'Due Diligence', 'Signing', 'Closing'];
// Käufertyp (v0.291): value → Anzeigename
const BUYER_TYPES = [
  ['', 'ohne Angabe'], ['strategic', 'Strategischer Käufer'], ['financial', 'Finanzinvestor'],
  ['private', 'Privatperson'], ['advisor_mandate', 'M&A-Berater mit Suchmandat'],
];
const EVENT_COLOR = {
  invite: '#1D4E89', mail: '#1D4E89', reminder: '#d97706', open: '#0891b2',
  consent: '#059669', register: '#059669', response: '#059669',
  selfcare: '#7c3aed', link: '#7c3aed', decline: '#dc2626',
  reply_in: '#059669', task: '#0f766e', task_done: '#64748b',
  chat_in: '#0891b2', chat_out: '#1D4E89',
};
const FIELDS = [
  ['salutation', 'Anrede'], ['title', 'Titel'], ['first_name', 'Vorname'], ['last_name', 'Nachname'],
  ['email', 'E-Mail'], ['phone', 'Telefon'], ['mobile', 'Mobil'],
  ['location', 'Ort'], ['responsibility', 'Verantwortung'], ['linkedin_url', 'LinkedIn'],
];

const fmt = (ts) => ts ? new Date(ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'k. A.';

export default function ContactDrawer({ contactId, onClose, onChanged, show }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('stamm');
  const [tplFor, setTplFor] = useState(null);   // Prozess-Mail zu einem Mandat des Kontakts
  const [reply, setReply] = useState('');       // eingegangene Antwort manuell erfassen
  const [replySubject, setReplySubject] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await api.get(`/crm/contacts/${contactId}/detail`);
      setData(d);
      const f = {};
      FIELDS.forEach(([k]) => { f[k] = d.contact[k] || ''; });
      f.notes = d.contact.notes || '';
      f.is_decision_maker = d.contact.is_decision_maker === 1;
      f.buyer_type = d.contact.buyer_type || '';
      setForm(f);
    } catch (e) { show('Fehler: ' + e.message); }
  }, [contactId, show]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    try {
      await api.put(`/crm/contacts/${contactId}`, { ...form, is_decision_maker: form.is_decision_maker ? 1 : 0 });
      show('Kontakt gespeichert ✓');
      await load(); onChanged && onChanged();
    } catch (e) { show('Fehler: ' + e.message); }
    finally { setSaving(false); }
  }

  // Pflege-Link: Der Kontakt bekommt einen persönlichen Link, über den er seine
  // eigenen Daten prüft und korrigiert. Doppelversand wird serverseitig gebremst;
  // hier fragen wir bewusst nach, bevor wir erneut senden.
  async function sendProfileLink(force = false) {
    try {
      await api.post(`/crm/contacts/${contactId}/profile-link`, force ? { force: true } : {});
      show('Pflege-Link versendet ✓'); await load();
    } catch (e) {
      if (e.code === 'PROFILE_LINK_RECENT') {
        if (window.confirm(`${e.message}\n\nTrotzdem erneut senden?`)) return sendProfileLink(true);
        return;
      }
      show('Fehler: ' + e.message);
    }
  }
  async function invite() {
    try { await api.post(`/crm/contacts/${contactId}/invite`, {}); show('Einladung (DSGVO) versendet ✓'); await load(); }
    catch (e) { show('Fehler: ' + e.message); }
  }
  async function setStage(partyId, stage) {
    try { await api.put(`/crm/parties/${partyId}`, { funnel_stage: Number(stage) }); await load(); onChanged && onChanged(); }
    catch (e) { show('Fehler: ' + e.message); }
  }
  async function setPartyStatus(partyId, status) {
    try { await api.put(`/crm/parties/${partyId}`, { party_status: status }); await load(); onChanged && onChanged(); }
    catch (e) { show('Fehler: ' + e.message); }
  }
  async function setPartyField(partyId, patch) {
    try { await api.put(`/crm/parties/${partyId}`, patch); await load(); onChanged && onChanged(); }
    catch (e) { show('Fehler: ' + e.message); }
  }

  async function logReply() {
    if (reply.trim().length < 3) return;
    try {
      const r = await api.post(`/crm/contacts/${contactId}/messages`, { body: reply, subject: replySubject });
      setReply(''); setReplySubject('');
      show(r.project ? `Antwort erfasst: Mandat ${r.project.codename}, Wiedervorlage angelegt ✓` : 'Antwort erfasst ✓');
      await load(); onChanged && onChanged();
    } catch (e) { show('Fehler: ' + e.message); }
  }
  async function addTask() {
    if (!taskTitle.trim()) return;
    try {
      await api.post('/crm/tasks', { title: taskTitle, due_on: taskDue || null, contact_id: contactId });
      setTaskTitle(''); setTaskDue(''); show('Wiedervorlage angelegt ✓'); await load();
    } catch (e) { show('Fehler: ' + e.message); }
  }
  // DSGVO: vollständige Datenauskunft (Art. 15) als JSON
  function exportContact() {
    fetch(`/api/crm/contacts/${contactId}/export`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.blob() : Promise.reject(new Error('Export nicht erlaubt')))
      .then(b => {
        const u = URL.createObjectURL(b); const a = document.createElement('a');
        a.href = u; a.download = `Datenauskunft_Kontakt_${contactId}.json`; a.click(); URL.revokeObjectURL(u);
      })
      .catch(e => show('Fehler: ' + e.message));
  }

  // DSGVO: Recht auf Vergessenwerden (Art. 17): personenbezogene Daten löschen,
  // Prozesshistorie als Nachweis behalten.
  async function anonymize() {
    if (!window.confirm(
      'Kontakt endgültig anonymisieren?\n\n' +
      'Name, E-Mail, Telefon, Notizen und Profildaten werden gelöscht. Die Prozesshistorie ' +
      '(wann was versendet wurde) bleibt als Nachweis erhalten. Das lässt sich nicht rückgängig machen.')) return;
    try {
      await api.post(`/crm/contacts/${contactId}/anonymize`, {});
      show('Kontakt anonymisiert ✓');
      await load(); onChanged && onChanged();
    } catch (e) { show('Fehler: ' + e.message); }
  }

  async function doneTask(id) {
    try { await api.put(`/crm/tasks/${id}`, { status: 'done' }); await load(); }
    catch (e) { show('Fehler: ' + e.message); }
  }

  const k = data?.contact;
  const blocked = k && (k.consent_status === 'opt_out' || k.contact_status === 'do_not_contact');

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,54,0.5)', zIndex: 1100, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', width: 'min(560px, 100%)', height: '100%', overflowY: 'auto', boxShadow: '-8px 0 30px rgba(0,0,0,0.15)' }}>
        {!data ? (
          <div style={{ padding: '2rem', color: C.muted }}>Laden…</div>
        ) : (
          <>
            {/* Kopf */}
            <div style={{ background: C.navy, color: '#fff', padding: '1.1rem 1.3rem', position: 'sticky', top: 0, zIndex: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {k.is_decision_maker === 1 && <Star size={13} color="#f59e0b" fill="#f59e0b" />}
                    {[k.salutation, k.title, k.first_name, k.last_name].filter(Boolean).join(' ')}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                    {(data.current || []).map(c => c.company_name).join(' · ') || 'ohne Unternehmen'}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', fontSize: '0.68rem' }}>
                    {k.consent_status === 'opt_in' && <Badge bg="#065f46" icon={<ShieldCheck size={10} />}>eingewilligt</Badge>}
                    {blocked && <Badge bg="#991b1b" icon={<ShieldOff size={10} />}>Widerspruch</Badge>}
                    {!blocked && k.consent_status !== 'opt_in' && <Badge bg="#92400e">Einwilligung offen</Badge>}
                    {data.account && <Badge bg="#1D4E89">Plattform-Konto</Badge>}
                  </div>
                </div>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}><X size={20} /></button>
              </div>
            </div>

            {/* Aktionen */}
            <div style={{ display: 'flex', gap: '0.4rem', padding: '0.8rem 1.3rem', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
              <button
                onClick={() => sendProfileLink(false)}
                disabled={blocked || !k.email}
                title={'Persönlicher Link, über den der Kontakt seine eigenen Daten prüft und korrigiert (60 Tage gültig). Den Text ändern Sie unter Admin → Mailvorlagen → Pflege-Link.'}
                style={btn(blocked || !k.email)}>
                <Send size={13} /> Pflege-Link
              </button>
              <button onClick={invite} disabled={blocked || !k.email || k.consent_status === 'opt_in'} style={btn(blocked || !k.email || k.consent_status === 'opt_in')}>
                <Mail size={13} /> Einladen (DSGVO)
              </button>
              {k.email && (
                <a href={`mailto:${k.email}`} style={{ ...btn(false), textDecoration: 'none' }}>
                  <ExternalLink size={13} /> Direkt mailen
                </a>
              )}
              <button onClick={exportContact} title="Vollständige Datenauskunft nach Art. 15 DSGVO (JSON)" style={btn(false)}>
                Auskunft (DSGVO)
              </button>
              {!k.anonymized_at && (
                <button onClick={anonymize} title="Recht auf Vergessenwerden (Art. 17 DSGVO)"
                  style={{ ...btn(false), color: '#dc2626', borderColor: '#fecaca' }}>
                  Löschen (DSGVO)
                </button>
              )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1.2rem', padding: '0 1.3rem', borderBottom: `1px solid ${C.border}` }}>
              {[['stamm', 'Stammdaten'], ['mandate', `Mandate (${(data.deals || []).length})`],
                ['aufgaben', `Wiedervorlagen (${(data.tasks || []).length})`],
                ['aktivitaet', `Aktivitäten (${(data.activity || []).length})`]].map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)} style={{
                  background: 'none', border: 'none', borderBottom: `2px solid ${tab === key ? C.accent : 'transparent'}`,
                  color: tab === key ? C.navy : C.muted, fontWeight: 700, fontSize: '0.8rem', padding: '0.7rem 0', cursor: 'pointer',
                }}>{label}</button>
              ))}
            </div>

            <div style={{ padding: '1.1rem 1.3rem' }}>
              {tab === 'stamm' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
                    {FIELDS.map(([key, label]) => (
                      <div key={key}>
                        <div style={LBL}>{label}</div>
                        <input value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ ...IN, marginTop: 3 }} />
                      </div>
                    ))}
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0.9rem 0', fontSize: '0.82rem', color: C.text, cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!form.is_decision_maker} onChange={e => setForm(f => ({ ...f, is_decision_maker: e.target.checked }))} />
                    Entscheider
                  </label>
                  <div style={{ margin: '0.4rem 0 0.2rem' }}>
                    <div style={LBL}>Käufertyp</div>
                    <select value={form.buyer_type || ''} onChange={e => setForm(f => ({ ...f, buyer_type: e.target.value }))} style={{ ...IN, marginTop: 3 }}>
                      {BUYER_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div style={LBL}>Interne Notizen</div>
                  <textarea rows={4} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    style={{ ...IN, marginTop: 3, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />

                  <div style={{ marginTop: '0.9rem', fontSize: '0.72rem', color: C.muted, lineHeight: 1.6 }}>
                    Einwilligung: <strong>{k.consent_status || 'unbekannt'}</strong>
                    {k.consent_at && ` seit ${fmt(k.consent_at)}`}
                    {k.profile_updated_at && <> · zuletzt vom Kontakt selbst gepflegt: {fmt(k.profile_updated_at)}</>}
                    {data.account && <> · Konto seit {fmt(data.account.created_at)}{data.account.last_login ? `, zuletzt aktiv ${fmt(data.account.last_login)}` : ''}</>}
                  </div>

                  <button onClick={save} disabled={saving} style={{
                    marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: 6, background: C.navy, color: '#fff',
                    border: 'none', borderRadius: 8, padding: '0.6rem 1.2rem', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer',
                  }}>
                    <Save size={14} /> {saving ? 'Speichern…' : 'Speichern'}
                  </button>
                </>
              )}

              {tab === 'mandate' && (
                <>
                  {!(data.deals || []).length && <div style={{ color: C.muted, fontSize: '0.85rem' }}>Dieser Kontakt ist noch keinem Mandat zugeordnet.</div>}
                  {(data.deals || []).map(d => (
                    <div key={d.party_id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '0.8rem', marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <strong style={{ color: C.navy, fontSize: '0.9rem' }}>{d.codename}</strong>
                        <span style={{ fontSize: '0.72rem', color: C.muted }}>{d.party_role}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.6rem' }}>
                        <div>
                          <div style={LBL}>Funnel-Stufe</div>
                          <select value={d.funnel_stage} onChange={e => setStage(d.party_id, e.target.value)} style={{ ...IN, marginTop: 3 }}>
                            {STAGE_LABEL.map((l, i) => <option key={i} value={i}>{i}: {l}</option>)}
                          </select>
                        </div>
                        <div>
                          <div style={LBL}>Status</div>
                          <select value={d.party_status} onChange={e => setPartyStatus(d.party_id, e.target.value)} style={{ ...IN, marginTop: 3 }}>
                            <option value="open">offen</option>
                            <option value="active">aktiv/dabei</option>
                            <option value="unclear">unklar</option>
                            <option value="dropped">ausgestiegen</option>
                          </select>
                        </div>
                      </div>
                      {/* NDA und Zugang zum Mandat */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.6rem' }}>
                        <div>
                          <div style={LBL}>NDA</div>
                          <select value={d.nda_status || ''} onChange={e => setPartyField(d.party_id, { nda_status: e.target.value })} style={{ ...IN, marginTop: 3 }}>
                            <option value="">kein NDA</option>
                            <option value="open">angefragt</option>
                            <option value="signed">liegt vor</option>
                          </select>
                          {d.nda_online && (
                            <div style={{ fontSize: '0.66rem', color: d.nda_online === 'signed' ? '#059669' : '#92400e', marginTop: 2 }}>
                              online: {d.nda_online === 'signed' ? 'unterzeichnet' : 'angefragt'}
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={LBL}>Zugang zum Mandat</div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: '0.8rem', color: C.text, cursor: 'pointer' }}>
                            <input type="checkbox" checked={d.access_granted === 1} onChange={e => setPartyField(d.party_id, { access_granted: e.target.checked })} />
                            {d.access_granted === 1 ? 'freigegeben' : 'kein Zugang'}
                          </label>
                        </div>
                      </div>
                      {d.next_step && <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: '0.5rem' }}>→ {d.next_step}</div>}
                      <button
                        onClick={() => setTplFor({ id: d.project_id, codename: d.codename })}
                        disabled={blocked || !k.email}
                        style={{ ...btn(blocked || !k.email), marginTop: '0.6rem' }}>
                        <FileText size={13} /> Prozess-Mail senden
                      </button>
                    </div>
                  ))}
                </>
              )}

              {tab === 'aufgaben' && (
                <>
                  {/* Eingegangene Antwort erfassen (funktioniert auch ohne BCC-Ingest) */}
                  <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '0.8rem', marginBottom: '1rem' }}>
                    <div style={{ ...LBL, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                      <Inbox size={12} /> Antwort des Kontakts erfassen
                    </div>
                    <input value={replySubject} onChange={e => setReplySubject(e.target.value)}
                      placeholder="Betreff (enthält der Betreff den Mandats-Codenamen, wird das Mandat automatisch erkannt)"
                      style={{ ...IN, marginBottom: 5 }} />
                    <textarea value={reply} onChange={e => setReply(e.target.value)} rows={4}
                      placeholder="Text der Antwort einfügen…"
                      style={{ ...IN, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
                    <button onClick={logReply} disabled={reply.trim().length < 3} style={{ ...btn(reply.trim().length < 3), marginTop: 6 }}>
                      <Check size={13} /> Antwort erfassen
                    </button>
                    <div style={{ fontSize: '0.7rem', color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
                      Stoppt laufende Erinnerungen, zieht den Funnel auf „Rückmeldung" und legt eine Wiedervorlage in zwei Tagen an.
                    </div>
                  </div>

                  {/* Wiedervorlagen */}
                  <div style={{ display: 'flex', gap: 5, marginBottom: '0.8rem' }}>
                    <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Neue Wiedervorlage…" style={{ ...IN, flex: 1 }} />
                    <input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} style={{ ...IN, width: 140 }} />
                    <button onClick={addTask} disabled={!taskTitle.trim()} style={btn(!taskTitle.trim())}><Plus size={13} /></button>
                  </div>
                  {!(data.tasks || []).length && <div style={{ color: C.muted, fontSize: '0.85rem' }}>Keine offenen Wiedervorlagen.</div>}
                  {(data.tasks || []).map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.6rem 0.7rem', marginBottom: '0.4rem' }}>
                      <button onClick={() => doneTask(t.id)} title="Erledigt" style={{
                        width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${C.border}`, background: '#fff', cursor: 'pointer', flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.text }}>{t.title}</div>
                        <div style={{ fontSize: '0.7rem', color: C.muted }}>
                          {t.due_on ? `fällig ${new Date(t.due_on).toLocaleDateString('de-DE')}` : 'ohne Frist'}
                          {t.source === 'reply' && ' · aus eingegangener Antwort'}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {tab === 'aktivitaet' && (
                <>
                  {!(data.activity || []).length && <div style={{ color: C.muted, fontSize: '0.85rem' }}>Noch keine Aktivitäten erfasst.</div>}
                  {(data.activity || []).map((e, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: '0.85rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: EVENT_COLOR[e.type] || C.muted, marginTop: 4, flexShrink: 0 }} />
                        {i < data.activity.length - 1 && <div style={{ width: 1, flex: 1, background: C.border, marginTop: 3 }} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.text }}>{e.label}</div>
                        {e.detail && <div style={{ fontSize: '0.74rem', color: C.muted, marginTop: 1 }}>{e.detail}</div>}
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 1 }}>{fmt(e.ts)}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        )}
        {tplFor && (
          <TemplateSendModal
            project={tplFor}
            contactIds={[contactId]}
            onClose={() => setTplFor(null)}
            onSent={(r) => { setTplFor(null); load(); show(r.sent ? 'Prozess-Mail versendet ✓' : 'Nicht versendet (Widerspruch?)'); }}
            show={show}
          />
        )}
      </div>
    </div>
  );
}

function Badge({ children, bg, icon }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: bg, color: '#fff', padding: '0.12rem 0.45rem', borderRadius: 10, fontWeight: 700 }}>
      {icon}{children}
    </span>
  );
}

const btn = (disabled) => ({
  display: 'inline-flex', alignItems: 'center', gap: 5,
  background: '#fff', color: disabled ? '#cbd5e1' : C.navy,
  border: `1.5px solid ${disabled ? C.border : C.border}`, borderRadius: 8,
  padding: '0.42rem 0.8rem', fontSize: '0.78rem', fontWeight: 700,
  cursor: disabled ? 'default' : 'pointer',
});
