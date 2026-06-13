import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import CapitalMatchLogo from '../components/CapitalMatchLogo';

const C = {
  navy:    '#1A4D8A',
  steel:   '#29ABE2',
  xLight:  '#F3F8FC',
  gray:    '#64748B',
  border:  '#C8E4F4',
};

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Fehler');
      setSuccess(true);
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
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: C.navy, marginBottom: '0.4rem' }}>Passwort zurücksetzen</h1>
          <p style={{ color: C.gray, fontSize: '0.85rem' }}>Geben Sie Ihre E-Mail-Adresse ein. Wir schicken Ihnen einen Reset-Link.</p>
        </div>

        {success ? (
          <div>
            <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#065f46', textAlign: 'center' }}>
              Falls ein Konto mit dieser E-Mail existiert, wurde ein Reset-Link gesendet. Bitte prüfen Sie Ihren Posteingang.
            </div>
            <Link to="/login" style={{ display: 'block', textAlign: 'center', color: C.navy, fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
              ← Zurück zur Anmeldung
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#991b1b' }}>
                {error}
              </div>
            )}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.35rem' }}>
                E-Mail-Adresse *
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="ihre@email.de"
                style={{ width: '100%', padding: '0.65rem 0.9rem', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: '0.9rem', outline: 'none', background: C.xLight, boxSizing: 'border-box' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', background: C.navy, color: '#fff', border: 'none', padding: '0.85rem', borderRadius: 8, fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Wird gesendet…' : 'Reset-Link anfordern'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <Link to="/login" style={{ fontSize: '0.85rem', color: C.gray, textDecoration: 'none' }}>
                ← Zurück zur Anmeldung
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
