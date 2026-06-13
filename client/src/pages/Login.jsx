import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CapitalMatchLogo from '../components/CapitalMatchLogo';

const C = {
  navy:    '#1A4D8A',
  steel:   '#29ABE2',
  lightBg: '#EBF7FC',
  xLight:  '#F3F8FC',
  gray:    '#64748B',
  border:  '#C8E4F4',
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(email, password);
      if (['super_admin', 'advisor'].includes(user.role)) {
        navigate('/admin');
      } else if (user.role === 'seller') {
        navigate('/verkaeuferdashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, #EBF7FC 0%, #F3F8FC 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: '2.5rem',
        boxShadow: '0 4px 32px rgba(26,77,138,0.10)',
        width: '100%',
        maxWidth: 420,
        border: `1px solid ${C.border}`,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <CapitalMatchLogo textSize={36} white={false} showClaim={false} />
          </div>
          <p style={{ color: C.gray, fontSize: '0.82rem', marginTop: '0.5rem', letterSpacing: '0.02em' }}>
            Exklusive Mandatsplattform · eine Marke der Phalanx GmbH
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#fee2e2',
            borderRadius: 8,
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: '#991b1b',
            border: '1px solid #fca5a5',
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.35rem' }}>
              E-Mail *
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                width: '100%',
                padding: '0.65rem 0.9rem',
                border: `1px solid ${C.border}`,
                borderRadius: 7,
                fontSize: '0.9rem',
                outline: 'none',
                background: C.xLight,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.35rem' }}>
              Passwort *
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '0.65rem 0.9rem',
                border: `1px solid ${C.border}`,
                borderRadius: 7,
                fontSize: '0.9rem',
                outline: 'none',
                background: C.xLight,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Passwort vergessen */}
          <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
            <Link to="/passwort-vergessen" style={{ fontSize: '0.8rem', color: C.steel, textDecoration: 'none', fontWeight: 500 }}>
              Passwort vergessen?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: C.navy,
              color: '#fff',
              border: 'none',
              padding: '0.85rem',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Anmelden…' : 'Anmelden'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: C.gray }}>
          Noch kein Konto?{' '}
          <Link to="/registrieren" style={{ color: C.navy, fontWeight: 700 }}>Jetzt registrieren</Link>
        </div>
      </div>
    </div>
  );
}
