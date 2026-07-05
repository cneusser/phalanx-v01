import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { MessageSquarePlus, Send, Sparkles, CheckCircle } from 'lucide-react';
import { ROADMAP_INTRO, PUBLIC_ROADMAP, ROADMAP_STATUS } from '../constants/publicRoadmap';

const C = { navy: '#0D1B36', accent: '#1D4E89', steel: '#29ABE2', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', text: '#0F172A', muted: '#64748B' };
const CATS = [['idea', 'Idee / Wunsch'], ['change', 'Änderungswunsch'], ['bug', 'Fehler melden'], ['other', 'Sonstiges']];

export default function Feedback() {
  const [category, setCategory] = useState('idea');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [changes, setChanges] = useState([]);

  useEffect(() => { api.get('/community/changelog').then(d => setChanges((d || []).slice(0, 4))).catch(() => {}); }, []);

  async function submit() {
    if (message.trim().length < 5) { setMsg('Bitte formulieren Sie Ihre Nachricht (mind. 5 Zeichen).'); return; }
    setBusy(true); setMsg('');
    try { await api.post('/community/feedback', { category, message }); setSent(true); setMessage(''); }
    catch (e) { setMsg('Fehler: ' + e.message); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <div style={{ background: C.navy, color: '#fff', padding: '2.5rem 1.5rem 2rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}><MessageSquarePlus size={22} /> Feedback & Roadmap</h1>
          <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.92rem', maxWidth: 680, lineHeight: 1.6 }}>{ROADMAP_INTRO}</p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.75rem 1.5rem 4rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Feedback-Formular */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1.5rem' }}>
          <div style={{ fontWeight: 700, color: C.navy, marginBottom: '1rem' }}>Nachricht an das Team</div>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
              <CheckCircle size={30} color="#16a34a" style={{ marginBottom: 10 }} />
              <div style={{ fontWeight: 700, color: C.navy, marginBottom: 4 }}>Vielen Dank für Ihr Feedback!</div>
              <div style={{ fontSize: '0.85rem', color: C.muted, marginBottom: '1rem' }}>Wir prüfen jeden Hinweis und melden uns bei Rückfragen.</div>
              <button onClick={() => setSent(false)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.83rem', color: C.navy }}>Weitere Nachricht senden</button>
            </div>
          ) : (
            <>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: C.muted, marginBottom: '0.35rem' }}>KATEGORIE</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                {CATS.map(([k, l]) => (
                  <button key={k} onClick={() => setCategory(k)} style={{ padding: '0.4rem 0.8rem', borderRadius: 20, fontSize: '0.78rem', cursor: 'pointer', border: `1.5px solid ${category === k ? C.navy : C.border}`, background: category === k ? C.navy : '#fff', color: category === k ? '#fff' : C.muted, fontWeight: category === k ? 600 : 400 }}>{l}</button>
                ))}
              </div>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} placeholder="Was können wir besser machen? Welche Funktion würden Sie sich wünschen?" style={{ width: '100%', padding: '0.7rem 0.85rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
              {msg && <div style={{ background: '#fee2e2', borderRadius: 8, padding: '0.55rem 0.85rem', margin: '0.75rem 0 0', fontSize: '0.82rem', color: '#991b1b' }}>{msg}</div>}
              <button onClick={submit} disabled={busy} style={{ marginTop: '1rem', width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}><Send size={15} /> {busy ? 'Wird gesendet…' : 'Feedback senden'}</button>
            </>
          )}
        </div>

        {/* Roadmap + Was ist neu */}
        <div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 700, color: C.navy, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Sparkles size={16} color={C.steel} /> Geplante Funktionen</div>
            {PUBLIC_ROADMAP.map((r, i) => {
              const s = ROADMAP_STATUS[r.status];
              return (
                <div key={i} style={{ paddingBottom: '0.9rem', marginBottom: '0.9rem', borderBottom: i < PUBLIC_ROADMAP.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ background: s.bg, color: s.color, fontSize: '0.66rem', fontWeight: 700, padding: '0.12rem 0.5rem', borderRadius: 20 }}>{s.label}</span>
                    <span style={{ fontWeight: 700, color: C.text, fontSize: '0.88rem' }}>{r.title}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: C.muted, lineHeight: 1.5 }}>{r.text}</div>
                </div>
              );
            })}
          </div>

          {changes.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1.5rem' }}>
              <div style={{ fontWeight: 700, color: C.navy, marginBottom: '0.9rem' }}>Was ist neu</div>
              {changes.map(c => (
                <div key={c.id} style={{ marginBottom: '0.8rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: C.text }}>{c.title} <span style={{ color: C.muted, fontWeight: 400, fontSize: '0.72rem' }}>· {c.version}{c.released_on ? ' · ' + new Date(c.released_on).toLocaleDateString('de-DE') : ''}</span></div>
                  <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.1rem', color: C.muted, fontSize: '0.78rem', lineHeight: 1.5 }}>
                    {(c.items || []).slice(0, 3).map((it, j) => <li key={j}>{it}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
