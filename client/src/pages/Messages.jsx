import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Send, UserPlus, Check, X, MessageSquare, ShieldCheck, ArrowUpRight, Pencil, Trash2, Clock } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', steel: '#29ABE2', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', text: '#0F172A', muted: '#64748B' };

export default function Messages() {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [connections, setConnections] = useState([]);
  const [active, setActive] = useState(null); // partner_id
  const [thread, setThread] = useState(null);
  const [body, setBody] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [msg, setMsg] = useState('');
  // v0.399: Nachbessern im Zustellfenster
  const [bearbeitet, setBearbeitet] = useState(null);   // id der Nachricht in Bearbeitung
  const [entwurf, setEntwurf] = useState('');
  const [jetzt, setJetzt] = useState(Date.now());       // laesst die Restzeit herunterzaehlen
  const endRef = useRef();
  const feldRef = useRef();

  // Einmal pro Sekunde neu rechnen, damit „noch 7:12" wirklich laeuft.
  useEffect(() => { const t = setInterval(() => setJetzt(Date.now()), 1000); return () => clearInterval(t); }, []);
  // Das Textfeld waechst mit dem Text, bis zu einer Obergrenze.
  useEffect(() => {
    const el = feldRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [body]);

  const loadThreads = useCallback(() => { api.get('/messages/threads').then(setThreads).catch(() => {}); }, []);
  const loadConnections = useCallback(() => { api.get('/messages/connections').then(setConnections).catch(() => {}); }, []);
  useEffect(() => { loadThreads(); loadConnections(); }, [loadThreads, loadConnections]);
  // Sprint 15: Thread automatisch öffnen, wenn aus einem Mandat heraus verlinkt
  useEffect(() => {
    const openPartner = location.state && location.state.openPartner;
    if (openPartner) openThread(openPartner);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const openThread = useCallback((pid) => {
    setActive(pid);
    api.get(`/messages/thread/${pid}`).then(d => { setThread(d); setTimeout(() => endRef.current?.scrollIntoView(), 50); loadThreads(); }).catch(e => setMsg('Fehler: ' + e.message));
  }, [loadThreads]);

  async function send() {
    if (!body.trim() || !active) return;
    try {
      await api.post('/messages/send', { recipient_id: active, body });
      setBody(''); openThread(active);
    } catch (e) { setMsg('Fehler: ' + e.message); }
  }

  // Enter macht eine neue Zeile. Gesendet wird über den Knopf oder mit
  // Befehlstaste beziehungsweise Strg zusammen mit Enter.
  function tastendruck(e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
  }

  // Restzeit einer eigenen, noch nicht zugestellten Nachricht in Sekunden.
  function rest(m) {
    if (!m.zustellung_ab || m.benachrichtigt_am) return 0;
    const s2 = Math.ceil((new Date(m.zustellung_ab).getTime() - jetzt) / 1000);
    return s2 > 0 ? s2 : 0;
  }
  const mmss = (s2) => `${Math.floor(s2 / 60)}:${String(s2 % 60).padStart(2, '0')}`;

  async function speichereAenderung(id) {
    if (!entwurf.trim()) return;
    setMsg('');
    try {
      await api.put(`/messages/${id}`, { body: entwurf });
      setBearbeitet(null); setEntwurf(''); openThread(active);
    } catch (e) { setMsg('Fehler: ' + e.message); }
  }

  async function nimmZurueck(id) {
    if (!window.confirm('Diese Nachricht zurücknehmen? Sie wurde noch nicht zugestellt.')) return;
    setMsg('');
    try { await api.delete(`/messages/${id}`); openThread(active); }
    catch (e) { setMsg('Fehler: ' + e.message); }
  }
  // Mandatsbezug der Konversation: jüngste Nachricht mit Mandat (für Berater-Aktionen).
  const mandateCtx = thread && [...thread.messages].reverse().find(m => m.project_id);
  async function approveNda(projectId) {
    setMsg('');
    try {
      const d = await api.post(`/admin/projects/${projectId}/interests/${active}/approve-nda`, {});
      setMsg(d.nda ? 'NDA freigegeben, Datenraum geöffnet ✓' : 'Datenraum freigegeben ✓');
      openThread(active);
    } catch (e) { setMsg('Fehler: ' + e.message); }
  }

  async function addContact() {
    if (!addEmail.trim()) return;
    setMsg('');
    try { await api.post('/messages/connections', { email: addEmail }); setAddEmail(''); setMsg('Kontaktanfrage gesendet.'); loadConnections(); }
    catch (e) { setMsg('Fehler: ' + e.message); }
  }
  async function decide(id, action) {
    try { await api.put(`/messages/connections/${id}`, { action }); loadConnections(); loadThreads(); } catch (e) { setMsg('Fehler: ' + e.message); }
  }

  const incoming = connections.filter(c => c.status === 'pending' && c.direction === 'incoming');
  const accepted = connections.filter(c => c.status === 'accepted');
  // Konversationen + akzeptierte Kontakte ohne bisherige Nachricht zusammenführen
  const partners = {};
  accepted.forEach(c => { partners[c.other.id] = { partner_id: c.other.id, name: c.other.name, company: c.other.company, last: '', unread: 0 }; });
  threads.forEach(t => { partners[t.partner_id] = { ...partners[t.partner_id], ...t }; });
  const list = Object.values(partners);

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <div style={{ background: C.navy, color: '#fff', padding: '1.5rem' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MessageSquare size={20} /> Nachrichten</h1>
          <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.85rem', marginTop: 2 }}>Diskreter Austausch mit Ihren bestätigten Kontakten.</p>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '1.5rem', display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1rem', alignItems: 'start' }}>
        {/* Linke Spalte: Kontakt hinzufügen + Anfragen + Konversationen */}
        <div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: C.muted, marginBottom: '0.5rem' }}>KONTAKT HINZUFÜGEN</div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <input value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="E-Mail-Adresse" style={{ flex: 1, padding: '0.5rem 0.6rem', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: '0.82rem', outline: 'none' }} />
              <button onClick={addContact} style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 7, padding: '0 0.7rem', cursor: 'pointer' }}><UserPlus size={15} /></button>
            </div>
            {msg && <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: msg.startsWith('Fehler') ? '#991b1b' : '#065f46' }}>{msg}</div>}
          </div>

          {incoming.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: C.muted, marginBottom: '0.5rem' }}>OFFENE ANFRAGEN</div>
              {incoming.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', color: C.text }}>{c.other.name}<div style={{ fontSize: '0.7rem', color: C.muted }}>{c.other.company}</div></span>
                  <span style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => decide(c.id, 'accept')} style={{ background: '#166534', color: '#fff', border: 'none', borderRadius: 6, padding: '0.3rem', cursor: 'pointer' }}><Check size={14} /></button>
                    <button onClick={() => decide(c.id, 'decline')} style={{ background: '#fff', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 6, padding: '0.3rem', cursor: 'pointer' }}><X size={14} /></button>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: C.muted, padding: '0.8rem 1rem 0.4rem' }}>KONVERSATIONEN</div>
            {list.length === 0 ? <div style={{ padding: '1.5rem', textAlign: 'center', color: C.muted, fontSize: '0.82rem' }}>Noch keine Kontakte. Fügen Sie oben jemanden per E-Mail hinzu.</div>
              : list.map(t => (
                <div key={t.partner_id} onClick={() => openThread(t.partner_id)} style={{ padding: '0.7rem 1rem', borderTop: `1px solid ${C.border}`, cursor: 'pointer', background: active === t.partner_id ? C.bg : '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: C.text, fontSize: '0.85rem' }}>{t.name}</span>
                    {t.unread > 0 && <span style={{ background: C.accent, color: '#fff', borderRadius: 20, fontSize: '0.66rem', fontWeight: 700, padding: '0.05rem 0.4rem' }}>{t.unread}</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.last || t.company || 'k. A.'}</div>
                </div>
              ))}
          </div>
        </div>

        {/* Rechte Spalte: Thread */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, minHeight: 420, display: 'flex', flexDirection: 'column' }}>
          {!thread ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: '0.88rem' }}>Wählen Sie links eine Konversation.</div>
          ) : (
            <>
              <div style={{ padding: '0.9rem 1.1rem', borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.navy }}>{thread.partner.name}{thread.partner.company ? ` · ${thread.partner.company}` : ''}</div>
              {isAdmin && mandateCtx && (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', padding: '0.55rem 1.1rem', borderBottom: `1px solid ${C.border}`, background: '#f8fbff' }}>
                  <span style={{ fontSize: '0.72rem', color: C.muted, fontWeight: 600 }}>Mandat {mandateCtx.project_codename || `#${mandateCtx.project_id}`}:</span>
                  <button onClick={() => approveNda(mandateCtx.project_id)} title="NDA freigeben und Datenraum für diesen Kontakt öffnen" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#065f46', color: '#fff', border: 'none', borderRadius: 7, padding: '0.35rem 0.75rem', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}>
                    <ShieldCheck size={13} /> NDA freigeben und Datenraum
                  </button>
                  <button onClick={() => navigate(`/projekte/${mandateCtx.project_id}`)} title="Zum Mandat" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff', color: C.navy, border: `1px solid ${C.border}`, borderRadius: 7, padding: '0.35rem 0.75rem', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}>
                    <ArrowUpRight size={13} /> Zum Mandat
                  </button>
                  <button onClick={() => navigate('/funnel')} title="Zum Deal-Funnel" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff', color: C.navy, border: `1px solid ${C.border}`, borderRadius: 7, padding: '0.35rem 0.75rem', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}>
                    <ArrowUpRight size={13} /> Deal-Funnel
                  </button>
                </div>
              )}
              {isAdmin && msg && <div style={{ padding: '0.4rem 1.1rem', fontSize: '0.78rem', color: msg.includes('Fehler') ? '#991b1b' : '#065f46' }}>{msg}</div>}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', maxHeight: 440 }}>
                {thread.messages.length === 0 ? <div style={{ color: C.muted, fontSize: '0.83rem', textAlign: 'center', marginTop: '2rem' }}>Noch keine Nachrichten. Schreiben Sie die erste.</div>
                  : thread.messages.map(m => {
                    // Sprint 15: Systemnachrichten (Prozess-Ereignisse) als zentrierte Timeline-Einträge
                    if (m.type === 'system') {
                      return (
                        <div key={m.id} style={{ display: 'flex', justifyContent: 'center', margin: '0.6rem 0' }}>
                          <div style={{ maxWidth: '85%', background: '#EEF4FB', color: C.accent, border: `1px solid ${C.border}`, padding: '0.4rem 0.8rem', borderRadius: 20, fontSize: '0.76rem', lineHeight: 1.4, textAlign: 'center' }}>
                            {m.body}
                            <span style={{ opacity: 0.6, marginLeft: 6 }}>· {new Date(m.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
                          </div>
                        </div>
                      );
                    }
                    const mine = m.sender_id === user.id;
                    const offen = mine ? rest(m) : 0;        // Restzeit bis zur Zustellung
                    const inArbeit = bearbeitet === m.id;
                    return (
                      <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: '0.5rem' }}>
                        <div style={{ maxWidth: '75%', background: mine ? C.navy : C.bg, color: mine ? '#fff' : C.text, padding: '0.5rem 0.8rem', borderRadius: 10, fontSize: '0.85rem', lineHeight: 1.45, opacity: offen ? 0.82 : 1, border: offen ? '1px dashed rgba(255,255,255,0.45)' : 'none' }}>
                          {m.project_codename && <div style={{ fontSize: '0.64rem', fontWeight: 700, opacity: 0.75, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{m.project_codename}</div>}
                          {inArbeit ? (
                            <>
                              <textarea value={entwurf} onChange={e => setEntwurf(e.target.value)} rows={Math.min(8, entwurf.split('\n').length + 1)}
                                style={{ width: 'min(420px, 60vw)', background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 7, padding: '0.45rem 0.6rem', fontSize: '0.85rem', lineHeight: 1.45, resize: 'vertical', fontFamily: 'inherit' }} />
                              <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
                                <button onClick={() => { setBearbeitet(null); setEntwurf(''); }} style={{ background: 'transparent', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '0.22rem 0.6rem', fontSize: '0.72rem', cursor: 'pointer' }}>Abbrechen</button>
                                <button onClick={() => speichereAenderung(m.id)} style={{ background: '#fff', color: C.navy, border: 'none', borderRadius: 6, padding: '0.22rem 0.7rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>Übernehmen</button>
                              </div>
                            </>
                          ) : (
                            <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
                          )}
                          <div style={{ fontSize: '0.62rem', opacity: 0.7, marginTop: 2, textAlign: 'right' }}>
                            {m.bearbeitet_am && <span style={{ marginRight: 5 }}>bearbeitet</span>}
                            {new Date(m.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        {offen > 0 && !inArbeit && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, fontSize: '0.68rem', color: C.muted }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Clock size={11} /> wird in {mmss(offen)} zugestellt</span>
                            <button onClick={() => { setBearbeitet(m.id); setEntwurf(m.body); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'none', border: 'none', color: C.accent, fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}><Pencil size={11} /> Bearbeiten</button>
                            <button onClick={() => nimmZurueck(m.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'none', border: 'none', color: '#991b1b', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}><Trash2 size={11} /> Zurücknehmen</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                <div ref={endRef} />
              </div>
              {thread.allowed ? (
                <div style={{ padding: '0.75rem', borderTop: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <textarea ref={feldRef} value={body} onChange={e => setBody(e.target.value)} onKeyDown={tastendruck} rows={1}
                      placeholder="Nachricht…  Enter macht eine neue Zeile."
                      style={{ flex: 1, padding: '0.6rem 0.8rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.85rem', lineHeight: 1.45, outline: 'none', resize: 'none', overflowY: 'auto', maxHeight: 200, fontFamily: 'inherit' }} />
                    <button onClick={send} disabled={!body.trim()} title="Senden (Cmd oder Strg + Enter)"
                      style={{ background: body.trim() ? C.navy : '#94a3b8', color: '#fff', border: 'none', borderRadius: 8, padding: '0.62rem 1rem', cursor: body.trim() ? 'pointer' : 'default' }}><Send size={16} /></button>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: C.muted, marginTop: 5 }}>
                    Enter macht eine neue Zeile. Senden mit dem Knopf oder Cmd beziehungsweise Strg und Enter. Nach dem Senden bleiben einige Minuten, um den Text noch zu ändern.
                  </div>
                </div>
              ) : (
                <div style={{ padding: '0.9rem', borderTop: `1px solid ${C.border}`, fontSize: '0.8rem', color: C.muted, textAlign: 'center' }}>Nachrichten sind möglich, sobald die Kontaktanfrage angenommen wurde.</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
