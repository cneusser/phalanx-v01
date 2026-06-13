import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import PhalanxLogo from '../components/PhalanxLogo';

const C = { navy: '#14314F', steel: '#A5C8E4', lightBg: '#EDF4FA', xLight: '#F3F7FB', gray: '#878787' };

const Field = ({ label, type = 'text', value, onChange, placeholder, required }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.35rem' }}>
      {label}{required && ' *'}
    </label>
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
      style={{ width: '100%', padding: '0.65rem 0.9rem', border: `1px solid ${C.steel}80`, borderRadius: 7, fontSize: '0.9rem', outline: 'none', background: C.xLight, boxSizing: 'border-box' }}
    />
  </div>
);

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '', company: '', position: '', buyer_type: 'strategic', phone: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) return setError('Bitte akzeptieren Sie die Datenschutzhinweise.');
    setLoading(true); setError('');
    try {
      const user = await register(form);
      navigate(user.role === 'buyer' ? '/dashboard' : '/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.xLight, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '2.5rem',
        boxShadow: '0 4px 32px rgba(20,49,79,0.10)',
        width: '100%', maxWidth: 520,
        border: `1px solid ${C.lightBg}`,
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.9rem' }}>
            <PhalanxLogo size={52} showText={false} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: C.navy }}>Käuferprofil erstellen</h1>
          <p style={{ color: C.gray, fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Kostenlose Registrierung – Zugang zu exklusiven Mandaten
          </p>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#991b1b' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <Field label="Vorname" value={form.first_name} onChange={set('first_name')} placeholder="Max" required />
            <Field label="Nachname" value={form.last_name} onChange={set('last_name')} placeholder="Müller" required />
          </div>
          <Field label="E-Mail-Adresse" type="email" value={form.email} onChange={set('email')} placeholder="max.mueller@example.de" required />

          <div style={{ marginBottom: '1rem', position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.35rem' }}>Passwort *</label>
            <input
              type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')}
              placeholder="Mindestens 8 Zeichen" required
              style={{ width: '100%', padding: '0.65rem 2.5rem 0.65rem 0.9rem', border: `1px solid ${C.steel}80`, borderRadius: 7, fontSize: '0.9rem', outline: 'none', background: C.xLight, boxSizing: 'border-box' }}
            />
            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 10, top: 32, background: 'none', border: 'none', cursor: 'pointer', color: C.gray }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <Field label="Unternehmen" value={form.company} onChange={set('company')} placeholder="Müller Holding GmbH" />
          <Field label="Position" value={form.position} onChange={set('position')} placeholder="Geschäftsführer" />

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.35rem' }}>Käufertyp</label>
            <select value={form.buyer_type} onChange={set('buyer_type')} style={{ width: '100%', padding: '0.65rem 0.9rem', border: `1px solid ${C.steel}80`, borderRadius: 7, fontSize: '0.9rem', background: C.xLight, outline: 'none' }}>
              <option value="strategic">Strategischer Käufer</option>
              <option value="financial">Finanzinvestor / PE</option>
              <option value="family_office">Family Office</option>
              <option value="successor">Nachfolger (MBO/MBI)</option>
              <option value="advisor">Berater / Intermediär</option>
            </select>
          </div>

          <Field label="Telefon" value={form.phone} onChange={set('phone')} placeholder="+49 170 123456" />

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <input type="checkbox" id="agree" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 3, cursor: 'pointer', accentColor: C.navy }} />
            <label htmlFor="agree" style={{ fontSize: '0.8rem', color: C.gray, lineHeight: 1.5, cursor: 'pointer' }}>
              Ich akzeptiere die{' '}
              <Link to="/datenschutz" style={{ color: C.navy, fontWeight: 600 }}>Datenschutzhinweise</Link>{' '}
              und stimme der Verarbeitung meiner Daten zu.
            </label>
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', background: C.navy, color: '#fff',
            border: 'none', padding: '0.85rem', borderRadius: 8,
            fontWeight: 700, fontSize: '0.95rem',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
          }}>
            {loading ? 'Wird registriert...' : 'Kostenlos registrieren'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: C.gray }}>
          Bereits registriert?{' '}
          <Link to="/login" style={{ color: C.navy, fontWeight: 700 }}>Anmelden</Link>
        </div>
      </div>
    </div>
  );
}
