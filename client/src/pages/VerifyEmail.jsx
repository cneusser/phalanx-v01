import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { CheckCircle, XCircle, MailWarning } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', muted: '#64748B' };

export default function VerifyEmail() {
  const [state, setState] = useState('loading'); // loading | ok | expired | error
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) { setState('error'); setMsg('Kein Bestätigungslink gefunden.'); return; }
    api.post('/auth/verify-email', { token })
      .then(d => { setState('ok'); setMsg(d.message); })
      .catch(e => { setState(e.message && e.message.includes('abgelaufen') ? 'expired' : 'error'); setMsg(e.message); });
  }, []);

  const icon = state === 'ok' ? <CheckCircle size={34} color="#16a34a" /> : state === 'expired' ? <MailWarning size={34} color="#f59e0b" /> : state === 'error' ? <XCircle size={34} color="#dc2626" /> : null;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '2.5rem', maxWidth: 460, width: '100%', textAlign: 'center' }}>
        {state === 'loading' ? <div style={{ color: C.muted }}>E-Mail wird bestätigt…</div> : (
          <>
            <div style={{ marginBottom: '0.9rem' }}>{icon}</div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: C.navy, marginBottom: '0.5rem' }}>
              {state === 'ok' ? 'E-Mail bestätigt' : state === 'expired' ? 'Link abgelaufen' : 'Bestätigung fehlgeschlagen'}
            </h1>
            <p style={{ color: C.muted, fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>{msg}</p>
            {state === 'ok'
              ? <Link to="/login" style={{ background: C.navy, color: '#fff', padding: '0.7rem 1.5rem', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem' }}>Zur Anmeldung</Link>
              : <Link to="/login" style={{ color: C.accent, fontWeight: 600, textDecoration: 'none', fontSize: '0.88rem' }}>Zur Anmeldung (neue Bestätigung anfordern)</Link>}
          </>
        )}
      </div>
    </div>
  );
}
