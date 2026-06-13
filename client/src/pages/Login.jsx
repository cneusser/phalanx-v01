import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PhalanxLogo from '../components/PhalanxLogo';

const C = { navy: '#14314F', steel: '#A5C8E4', lightBg: '#EDF4FA', xLight: '#F3F7FB', gray: '#878787' };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const user = await login(email, password);
      navigate(['super_admin', 'advisor'].includes(user.role) ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = (em, pw) => { setEmail(em); setPassword(pw); };

  return (
    <div style={{ minHeight: '100vh', background: C.xLight, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '2.5rem',
        boxShadow: '0 4px 32px rgba(20,49,79,0.10)',
        width: '100%', maxWidth: 420,
        border: `1px solid ${C.lightBg}`,
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.9rem' }}>
            <PhalanxLogo size={52} showText={false} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: C.navy }}>Anmelden</h1>
          <p style={{ color: C.gray, fontSize: '0.85rem', marginTop: '0.25rem' }}>Willkommen zurück bei Phalanx</p>
        </div>

        {/* Demo accounts */}
        <div style={{ background: C.lightBg, border: `1px solid ${C.steel}40`, borderRadius: 8, padding: '0.75rem', marginBottom: '1.5rem', fontSize: '0.78rem' }}>
          <div style={{ fontWeight: 600, color: C.navy, marginBottom: '0.4rem' }}>Demo-Zugänge:</div>
          {[
            ['admin@phalanx.de', 'Admin1234!', 'Admin'],
            ['max.mueller@example.de', 'Buyer1234!', 'Käufer'],
          ].map(([em, pw, label]) => (
            <button key={em} onClick={() => demoLogin(em, pw)} style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.navy, padding: '0.15rem 0',
              textDecoration: 'underline', fontSize: '0.78rem',
            }}>
              {label}: {em} / {pw}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: '#fee2e2', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#991b1b' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.35rem' }}>E-Mail *</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width: '100%', padding: '0.65rem 0.9rem', border: `1px solid ${C.steel}80`, borderRadius: 7, fontSize: '0.9rem', outline: 'none', background: C.xLight, boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.35rem' }}>Passwort *</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              style={{ width: '100%', padding: '0.65rem 0.9rem', border: `1px solid ${C.steel}80`, borderRadius: 7, fontSize: '0.9rem', outline: 'none', background: C.xLight, boxSizing: 'border-box' }}
            />
          </div>
          <button type="submit" disabled={loading} style={{
            width: '100%', background: C.navy, color: '#fff',
            border: 'none', padding: '0.85rem', borderRadius: 8,
            fontWeight: 700, fontSize: '0.95rem',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
          }}>
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: C.gray }}>
          Noch kein Konto?{' '}
          <Link to="/registrieren" style={{ color: C.navy, fontWeight: 700 }}>Jetzt registrieren</Link>
        </div>
      </div>
    </div>
  );
}
