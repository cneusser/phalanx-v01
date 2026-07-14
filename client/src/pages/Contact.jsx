import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Mail, Phone, MapPin, Globe, Send, CheckCircle } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', steel: '#29ABE2', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', text: '#0F172A', muted: '#64748B' };

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [human, setHuman] = useState(false);
  const [hp, setHp] = useState('');
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (!form.name || !form.email || form.message.trim().length < 5) { setMsg('Bitte Name, E-Mail und eine Nachricht angeben.'); return; }
    if (!human) { setMsg('Bitte bestätigen Sie, dass Sie kein Roboter sind.'); return; }
    setBusy(true); setMsg('');
    try { await api.post('/community/contact', { ...form, human, company_website: hp }); setSent(true); }
    catch (e) { setMsg('Fehler: ' + e.message); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <div style={{ background: C.navy, color: '#fff', padding: '2.5rem 1.5rem 2rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 800, marginBottom: '0.4rem' }}>Kontakt</h1>
          <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.92rem', maxWidth: 620 }}>Sie haben Fragen zu CapitalMatch, einem Mandat oder unserer Beratung? Wir freuen uns auf Ihre Nachricht und melden uns zeitnah persönlich.</p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.75rem 1.5rem 4rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Kontaktdaten */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1.5rem' }}>
          <div style={{ fontWeight: 700, color: C.navy, marginBottom: '1rem' }}>Phalanx GmbH</div>
          {[[MapPin, 'Helene-Lange-Straße 28, D-91056 Erlangen'], [Phone, '+49 9131-9 20 60 75'], [Mail, 'info@phalanx.de', 'mailto:info@phalanx.de'], [Globe, 'www.phalanx.de', 'https://www.phalanx.de']].map(([Icon, text, href], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.7rem', fontSize: '0.88rem', color: C.text }}>
              <Icon size={16} color={C.steel} />
              {href ? <a href={href} style={{ color: C.accent, textDecoration: 'none' }}>{text}</a> : <span>{text}</span>}
            </div>
          ))}
          <div style={{ fontSize: '0.78rem', color: C.muted, marginTop: '1rem', lineHeight: 1.6 }}>
            CapitalMatch ist eine Marke der Phalanx GmbH. Weitere Angaben im <Link to="/impressum" style={{ color: C.accent }}>Impressum</Link>.
          </div>
        </div>

        {/* Nachricht */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1.5rem' }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
              <CheckCircle size={30} color="#16a34a" style={{ marginBottom: 10 }} />
              <div style={{ fontWeight: 700, color: C.navy, marginBottom: 4 }}>Vielen Dank!</div>
              <div style={{ fontSize: '0.85rem', color: C.muted }}>Ihre Nachricht ist eingegangen, wir melden uns zeitnah.</div>
            </div>
          ) : (
            <>
              <div style={{ fontWeight: 700, color: C.navy, marginBottom: '1rem' }}>Nachricht senden</div>
              <input value={form.name} onChange={set('name')} placeholder="Ihr Name *" style={inp} />
              <input value={form.email} onChange={set('email')} type="email" placeholder="Ihre E-Mail *" style={{ ...inp, marginTop: '0.6rem' }} />
              <textarea value={form.message} onChange={set('message')} rows={5} placeholder="Ihre Nachricht *" style={{ ...inp, marginTop: '0.6rem', resize: 'vertical', fontFamily: 'inherit' }} />
              <input value={hp} onChange={e => setHp(e.target.value)} name="company_website" tabIndex={-1} autoComplete="off" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} aria-hidden="true" />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.85rem', fontSize: '0.83rem', color: C.text, cursor: 'pointer' }}>
                <input type="checkbox" checked={human} onChange={e => setHuman(e.target.checked)} /> Ich bin kein Roboter.
              </label>
              {msg && <div style={{ background: '#fee2e2', borderRadius: 8, padding: '0.55rem 0.85rem', marginTop: '0.75rem', fontSize: '0.82rem', color: '#991b1b' }}>{msg}</div>}
              <button onClick={submit} disabled={busy} style={{ marginTop: '1rem', width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}><Send size={15} /> {busy ? 'Wird gesendet…' : 'Nachricht senden'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const inp = { width: '100%', padding: '0.65rem 0.85rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' };
