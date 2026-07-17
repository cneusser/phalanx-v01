import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n';
import { api } from '../api/client';
import CapitalMatchLogo from '../components/CapitalMatchLogo';
import Turnstile from '../components/Turnstile';

const C = {
  navy:    '#1A4D8A',
  steel:   '#29ABE2',
  lightBg: '#EBF7FC',
  xLight:  '#F3F8FC',
  gray:    '#64748B',
  border:  '#C8E4F4',
};

export default function Login() {
  const [challenge, setChallenge] = useState(null);   // 2FA: Zwischenschritt nach dem Passwort
  const [code, setCode] = useState('');
  const t = useT();
  const { login, loginTwoFactor } = useAuth();
  const navigate = useNavigate();
  // Sprint 19: Rücksprung nach dem Login (z. B. aus einer Mandats-Einladung)
  const [params] = useSearchParams();
  const redirect = params.get('redirect');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [tsToken, setTsToken] = useState('');

  // Wohin nach erfolgreichem Login? (Rücksprung nur auf interne Pfade, kein Open Redirect)
  const goAfterLogin = (user) => {
    if (redirect && redirect.startsWith('/')) navigate(redirect);
    else if (['super_admin', 'tenant_owner', 'advisor', 'assistant', 'analyst'].includes(user.role)) navigate('/admin');
    else if (user.role === 'seller') navigate('/verkaeuferdashboard');
    else navigate('/dashboard');
  };

  const submitCode = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const user = await loginTwoFactor(challenge, code.trim());
      goAfterLogin(user);
    } catch (err) {
      setError(err.message);
      if (err.code === 'CHALLENGE_EXPIRED') { setChallenge(null); setCode(''); }
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(''); setUnverified(false); setResendMsg('');
    try {
      const user = await login(email, password, tsToken);
      // Sprint 13: Zweiter Faktor verlangt → Code-Eingabe statt Weiterleitung
      if (user && user.twofa_required) { setChallenge(user.challenge); setLoading(false); return; }
      goAfterLogin(user);
    } catch (err) {
      setError(err.message);
      if ((err.message || '').includes('bestätigen Sie zuerst Ihre E-Mail')) setUnverified(true);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResendMsg('');
    try { const d = await api.post('/auth/resend-verification', { email }); setResendMsg(d.message); }
    catch (e) { setResendMsg('Fehler: ' + e.message); }
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
            {unverified && (
              <div style={{ marginTop: '0.6rem' }}>
                <button type="button" onClick={resend} style={{ background: 'none', border: 'none', color: '#1A4D8A', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: '0.83rem' }}>Bestätigungs-E-Mail erneut senden</button>
                {resendMsg && <div style={{ marginTop: '0.4rem', color: '#065f46', fontSize: '0.8rem' }}>{resendMsg}</div>}
              </div>
            )}
          </div>
        )}

        {/* Form */}
        {/* Sprint 13: Zweiter Faktor */}
        {challenge ? (
          <form onSubmit={submitCode}>
            <div style={{ background: '#EDF4FA', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.8rem 1rem', marginBottom: '1rem', fontSize: '0.83rem', color: '#475569', lineHeight: 1.55 }}>
              Ihr Konto ist mit <strong>Zwei-Faktor-Authentifizierung</strong> geschützt. Bitte geben Sie den
              6-stelligen Code aus Ihrer Authenticator-App ein, oder einen Ihrer Backup-Codes.
            </div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0D1B36', marginBottom: 4 }}>
              Code
            </label>
            <input
              value={code}
              onChange={e => setCode(e.target.value)}
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              style={{ width: '100%', padding: '0.75rem 0.9rem', border: '1px solid #DDE8F3', borderRadius: 8, fontSize: '1.1rem', letterSpacing: '0.25em', textAlign: 'center', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
            />
            <button type="submit" disabled={loading || code.trim().length < 6} style={{
              width: '100%', marginTop: '1rem', padding: '0.8rem', background: loading || code.trim().length < 6 ? '#cbd5e1' : '#1A4D8A',
              color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
            }}>
              {loading ? 'Prüfe…' : 'Bestätigen'}
            </button>
            <button type="button" onClick={() => { setChallenge(null); setCode(''); setError(''); }} style={{
              width: '100%', marginTop: '0.6rem', padding: '0.6rem', background: 'none', border: 'none',
              color: '#64748B', fontSize: '0.82rem', cursor: 'pointer',
            }}>
              Abbrechen
            </button>
          </form>
        ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.35rem' }}>
              {t('auth.email', 'E-Mail')} *
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
              {t('auth.password', 'Passwort')} *
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
          <div style={{ textAlign: 'right', marginBottom: '0.75rem' }}>
            <Link to="/passwort-vergessen" style={{ fontSize: '0.8rem', color: C.steel, textDecoration: 'none', fontWeight: 500 }}>
              {t('auth.forgot', 'Passwort vergessen?')}
            </Link>
          </div>

          {/* Roboter-Test (nur sichtbar, wenn Cloudflare Turnstile konfiguriert ist) */}
          <Turnstile onToken={setTsToken} />

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
            {loading ? t('auth.submitting', 'Anmelden…') : t('nav.login', 'Anmelden')}
          </button>
        </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: C.gray }}>
          {t('auth.no_account', 'Noch kein Konto?')}{' '}
          <Link to="/registrieren" style={{ color: C.navy, fontWeight: 700 }}>Jetzt registrieren</Link>
        </div>
      </div>
    </div>
  );
}
