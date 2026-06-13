import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Search, Building2 } from 'lucide-react';
import CapitalMatchLogo from '../components/CapitalMatchLogo';

const C = {
  navy:    '#1A4D8A',
  steel:   '#29ABE2',
  lightBg: '#EBF7FC',
  xLight:  '#F3F8FC',
  gray:    '#64748B',
  border:  '#C8E4F4',
};

const inputStyle = {
  width: '100%',
  padding: '0.65rem 0.9rem',
  border: `1px solid ${C.border}`,
  borderRadius: 7,
  fontSize: '0.9rem',
  outline: 'none',
  background: C.xLight,
  boxSizing: 'border-box',
};

const Field = ({ label, type = 'text', value, onChange, placeholder, required, children }) => (
  <div style={{ marginBottom: '0.9rem' }}>
    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.35rem' }}>
      {label}{required && ' *'}
    </label>
    {children || (
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} style={inputStyle} />
    )}
  </div>
);

export default function Register() {
  const { register } = useAuth();
  const [roleType, setRoleType] = useState('buyer'); // 'buyer' or 'seller'
  const [form, setForm] = useState({
    email: '', password: '', first_name: '', last_name: '',
    company: '', position: '', buyer_type: 'strategic', phone: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) return setError('Bitte akzeptieren Sie die Datenschutzhinweise.');
    setLoading(true);
    setError('');
    try {
      const result = await register({ ...form, role: roleType });
      if (result.pending) {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Success state — pending approval
  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, #EBF7FC 0%, #F3F8FC 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '2.5rem', boxShadow: '0 4px 32px rgba(26,77,138,0.10)', width: '100%', maxWidth: 460, border: `1px solid ${C.border}`, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: '2rem' }}>
            ✓
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: C.navy, marginBottom: '0.75rem' }}>
            Registrierung eingegangen!
          </h2>
          <p style={{ color: C.gray, fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            Vielen Dank für Ihr Interesse an CapitalMatch. Ihr Konto wird von unserem Team geprüft und in Kürze freigeschaltet. Sie erhalten eine Benachrichtigung, sobald Sie Zugang haben.
          </p>
          <div style={{ background: C.xLight, borderRadius: 8, padding: '0.9rem 1rem', border: `1px solid ${C.border}`, fontSize: '0.82rem', color: C.gray, marginBottom: '1.5rem' }}>
            <strong style={{ color: C.navy }}>Registrierte E-Mail:</strong> {form.email}
          </div>
          <Link to="/login" style={{ display: 'inline-block', background: C.navy, color: '#fff', padding: '0.75rem 2rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>
            Zur Anmeldung
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, #EBF7FC 0%, #F3F8FC 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '2.5rem', boxShadow: '0 4px 32px rgba(26,77,138,0.10)', width: '100%', maxWidth: 520, border: `1px solid ${C.border}` }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <CapitalMatchLogo textSize={28} white={false} />
          </div>
          <p style={{ color: C.gray, fontSize: '0.8rem' }}>Kostenlose Registrierung — Zugang zu exklusiven Mandaten</p>
        </div>

        {/* Role Toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: C.xLight, padding: '0.4rem', borderRadius: 10, border: `1px solid ${C.border}` }}>
          {[
            ['buyer', <><Search size={14} /> Ich suche (Käufer)</>],
            ['seller', <><Building2 size={14} /> Ich verkaufe (Verkäufer)</>],
          ].map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setRoleType(val)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.6rem 0.5rem',
                borderRadius: 7,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.82rem',
                background: roleType === val ? C.navy : 'transparent',
                color: roleType === val ? '#fff' : C.gray,
                transition: 'all 0.15s ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#991b1b' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Name fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <Field label="Vorname" value={form.first_name} onChange={set('first_name')} placeholder="Max" required />
            <Field label="Nachname" value={form.last_name} onChange={set('last_name')} placeholder="Müller" required />
          </div>

          {/* Email */}
          <Field label="E-Mail-Adresse" type="email" value={form.email} onChange={set('email')} placeholder="max@beispiel.de" required />

          {/* Password with toggle */}
          <div style={{ marginBottom: '0.9rem', position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.35rem' }}>
              Passwort *
            </label>
            <input
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              placeholder="Mindestens 8 Zeichen"
              required
              style={{ ...inputStyle, paddingRight: '2.5rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              style={{ position: 'absolute', right: 10, top: 34, background: 'none', border: 'none', cursor: 'pointer', color: C.gray, padding: 0 }}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Company / Position */}
          <Field
            label={roleType === 'seller' ? 'Unternehmen (zu verkaufen)' : 'Unternehmen'}
            value={form.company}
            onChange={set('company')}
            placeholder={roleType === 'seller' ? 'Müller GmbH' : 'Müller Holding GmbH'}
          />
          <Field label="Position" value={form.position} onChange={set('position')} placeholder="Geschäftsführer" />

          {/* Buyer type — only for buyers */}
          {roleType === 'buyer' && (
            <div style={{ marginBottom: '0.9rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.35rem' }}>
                Käufertyp
              </label>
              <select value={form.buyer_type} onChange={set('buyer_type')} style={{ ...inputStyle, background: C.xLight }}>
                <option value="strategic">Strategischer Käufer</option>
                <option value="financial">Finanzinvestor / PE</option>
                <option value="family_office">Family Office</option>
                <option value="successor">Nachfolger (MBO/MBI)</option>
                <option value="advisor">Berater / Intermediär</option>
              </select>
            </div>
          )}

          {/* Seller info box */}
          {roleType === 'seller' && (
            <div style={{ background: C.xLight, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.85rem 1rem', marginBottom: '0.9rem', fontSize: '0.8rem', color: C.gray, lineHeight: 1.6 }}>
              <strong style={{ color: C.navy }}>Als Verkäufer</strong> registrieren Sie sich kostenlos. Nach Admin-Freigabe können Sie Ihr Unternehmensprofil erstellen und Dokumente hochladen.
            </div>
          )}

          {/* Phone */}
          <Field label="Telefon" value={form.phone} onChange={set('phone')} placeholder="+49 170 123456" />

          {/* GDPR Checkbox */}
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <input
              type="checkbox"
              id="agree"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              style={{ marginTop: 3, cursor: 'pointer', accentColor: C.navy }}
            />
            <label htmlFor="agree" style={{ fontSize: '0.8rem', color: C.gray, lineHeight: 1.5, cursor: 'pointer' }}>
              Ich akzeptiere die{' '}
              <Link to="/datenschutz" style={{ color: C.navy, fontWeight: 600 }}>Datenschutzhinweise</Link>{' '}
              und stimme der Verarbeitung meiner Daten zu.
            </label>
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
            {loading ? 'Wird registriert…' : 'Kostenlos registrieren'}
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
