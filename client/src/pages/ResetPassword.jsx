import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import CapitalMatchLogo from '../components/CapitalMatchLogo';

const C = {
  navy:    '#1A4D8A',
  steel:   '#29ABE2',
  xLight:  '#F3F8FC',
  gray:    '#64748B',
  border:  '#C8E4F4',
};

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, #EBF7FC 0%, #F3F8FC 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '2.5rem', maxWidth: 420, width: '100%', textAlign: 'center', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ color: C.navy, marginBottom: '0.5rem' }}>Ungültiger Link</h2>
          <p style={{ color: C.gray, fontSize: '0.875rem', marginBottom: '1.5rem' }}>Der Reset-Link ist ungültig oder fehlt. Bitte fordern Sie einen neuen an.</p>
          <Link to="/passwort-vergessen" style={{ background: C.navy, color: '#fff', padding: '0.75rem 1.5rem', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem' }}>
            Neuen Link anfordern
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== password2) return setError('Passwörter stimmen nicht überein.');
    if (password.length < 8) return setError('Passwort muss mindestens 8 Zeichen haben.');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Fehler');
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, #EBF7FC 0%, #F3F8FC 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '2.5rem', boxShadow: '0 4px 32px rgba(26,77,138,0.10)', width: '100%', maxWidth: 420, border: `1px solid ${C.border}` }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <CapitalMatchLogo textSize={28} white={false} />
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: C.navy, marginBottom: '0.4rem' }}>Neues Passwort setzen</h1>
        </div>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '1rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#065f46' }}>
              ✓ Passwort erfolgreich geändert! Sie werden zur Anmeldung weitergeleitet…
            </div>
            <Link to="/login" style={{ color: C.navy, fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>Jetzt anmelden</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#991b1b' }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '0.9rem', position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.35rem' }}>Neues Passwort *</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mindestens 8 Zeichen"
                required
                style={{ width: '100%', padding: '0.65rem 2.5rem 0.65rem 0.9rem', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: '0.9rem', outline: 'none', background: C.xLight, boxSizing: 'border-box' }}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 10, top: 34, background: 'none', border: 'none', cursor: 'pointer', color: C.gray, padding: 0 }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.35rem' }}>Passwort bestätigen *</label>
              <input
                type="password"
                value={password2}
                onChange={e => setPassword2(e.target.value)}
                placeholder="Passwort wiederholen"
                required
                style={{ width: '100%', padding: '0.65rem 0.9rem', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: '0.9rem', outline: 'none', background: C.xLight, boxSizing: 'border-box' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', background: C.navy, color: '#fff', border: 'none', padding: '0.85rem', borderRadius: 8, fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Wird gespeichert…' : 'Passwort ändern'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
