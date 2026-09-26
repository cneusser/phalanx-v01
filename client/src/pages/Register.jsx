import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Search, Building2 } from 'lucide-react';
import CapitalMatchLogo from '../components/CapitalMatchLogo';
import Turnstile from '../components/Turnstile';
import { useT } from '../i18n';

const C = {
  navy:    '#174a6a',
  steel:   '#174a6a',
  lightBg: '#f7f5f0',
  xLight:  '#f4f6f7',
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
  const t = useT();
  const { register } = useAuth();
  const [roleType, setRoleType] = useState('buyer'); // 'buyer' or 'seller'
  const [params] = useSearchParams();
  // Herkunft der Registrierung (z. B. ?src=linkedin), fürs Tracking.
  const signupSource = (params.get('src') || params.get('utm_source') || 'direct').toLowerCase();
  const [form, setForm] = useState({
    email: '', password: '', salutation: '', title: '', first_name: '', last_name: '',
    company: '', position: '', linkedin_url: '', buyer_type: 'strategic', succession_type: '', mobile: '', phone: '',
  });
  // Käufer-Segment: Nachfolge-Interessent oder professioneller Käufer
  const [buyerSegment, setBuyerSegment] = useState('succession');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tsToken, setTsToken] = useState('');
  const [tsReset, setTsReset] = useState(0);   // frisches Turnstile-Token nach Fehlversuch

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) return setError(t('reg.accept_privacy', 'Bitte akzeptieren Sie die Datenschutzhinweise.'));
    setLoading(true);
    setError('');
    try {
      const result = await register({ ...form, role: roleType, privacy_consent: agreed, turnstile_token: tsToken, signup_source: signupSource });
      if (result.pending) {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.message);
      setTsToken(''); setTsReset(k => k + 1);
    } finally {
      setLoading(false);
    }
  };

  // Success state: pending approval
  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, #f7f5f0 0%, #f4f6f7 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '2.5rem', boxShadow: '0 4px 32px rgba(26,77,138,0.10)', width: '100%', maxWidth: 460, border: `1px solid ${C.border}`, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: '2rem' }}>
            ✓
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: C.navy, marginBottom: '0.75rem' }}>
            {t('reg.verify_title', 'Bitte bestätigen Sie Ihre E-Mail')}
          </h2>
          <p style={{ color: C.gray, fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            Fast geschafft! Wir haben Ihnen einen Bestätigungslink geschickt. Erst nach Bestätigung Ihrer E-Mail-Adresse ist die Registrierung abgeschlossen, anschließend prüft unser Team Ihren Zugang und schaltet ihn frei.
          </p>
          <div style={{ background: C.xLight, borderRadius: 8, padding: '0.9rem 1rem', border: `1px solid ${C.border}`, fontSize: '0.82rem', color: C.gray, marginBottom: '1.5rem' }}>
            <strong style={{ color: C.navy }}>{t('reg.verify_sent_to', 'Bestätigungs-E-Mail an:')}</strong> {form.email}<br/>
            <span style={{ fontSize: '0.76rem' }}>Keine E-Mail erhalten? Prüfen Sie den Spam-Ordner oder fordern Sie den Link auf der Anmeldeseite erneut an.</span>
          </div>
          <Link to="/login" style={{ display: 'inline-block', background: C.navy, color: '#fff', padding: '0.75rem 2rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>
            {t('reg.to_login', 'Zur Anmeldung')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, #f7f5f0 0%, #f4f6f7 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '2.5rem', boxShadow: '0 4px 32px rgba(26,77,138,0.10)', width: '100%', maxWidth: 520, border: `1px solid ${C.border}` }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <CapitalMatchLogo textSize={28} white={false} />
          </div>
          <p style={{ color: C.gray, fontSize: '0.8rem' }}>{t('reg.title', 'Kostenlose Registrierung: Zugang zu exklusiven Mandaten')}</p>
        </div>

        {/* Role Toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: C.xLight, padding: '0.4rem', borderRadius: 10, border: `1px solid ${C.border}` }}>
          {[
            ['buyer', <><Search size={14} /> {t('reg.role_buyer', 'Ich suche (Käufer)')}</>],
            ['seller', <><Building2 size={14} /> {t('reg.role_seller', 'Ich verkaufe (Verkäufer)')}</>],
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
          {/* Anrede (Pflicht) + Titel */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div style={{ marginBottom: '0.9rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.35rem' }}>
                {t('reg.salutation', 'Anrede *')}
              </label>
              <select value={form.salutation} onChange={set('salutation')} required style={{ ...inputStyle, background: '#fff' }}>
                <option value="">{t('common.choose', 'Bitte wählen…')}</option>
                <option value="Herr">Herr</option>
                <option value="Frau">Frau</option>
                <option value="Divers">Divers</option>
              </select>
            </div>
            <Field label="Titel (optional)" value={form.title} onChange={set('title')} placeholder="z. B. Dr., Prof." />
          </div>

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
              {t('reg.password', 'Passwort *')}
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
            label={roleType === 'seller'
              ? t('reg.company_selling', 'Unternehmen (zu verkaufen)')
              : t('reg.company', 'Unternehmen')}
            value={form.company}
            onChange={set('company')}
            placeholder={roleType === 'seller' ? 'Müller GmbH' : 'Müller Holding GmbH'}
          />
          <Field label="Position" value={form.position} onChange={set('position')} placeholder="Geschäftsführer" />
          <Field label="LinkedIn-Profil (optional)" value={form.linkedin_url} onChange={set('linkedin_url')} placeholder="https://linkedin.com/in/..." />
          <div style={{ fontSize: '0.74rem', color: C.gray, marginTop: '-0.5rem', marginBottom: '0.9rem' }}>
            Wenn wir Sie über LinkedIn angesprochen haben, erleichtert Ihr Profillink die Zuordnung Ihres bereits vorbereiteten Zugangs.
          </div>

          {/* Käufer-Segment: Nachfolge-Interessent vs professioneller Käufer */}
          {roleType === 'buyer' && (
            <div style={{ marginBottom: '0.9rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.35rem' }}>
                {t('reg.segment_q', 'Was beschreibt Sie am besten?')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.6rem' }}>
                {[['succession', t('reg.seg_successor', 'Nachfolge-Interessent'), t('reg.seg_successor_note', 'MBI / MBO, ich möchte ein Unternehmen übernehmen')],
                  ['professional', t('reg.seg_professional', 'Professioneller Käufer'), t('reg.seg_professional_note', 'Stratege, Investor, Family Office, Berater')]].map(([val, t, sub]) => (
                  <button type="button" key={val}
                    onClick={() => { setBuyerSegment(val); setForm(f => ({ ...f, buyer_type: val === 'succession' ? 'successor' : 'strategic', succession_type: val === 'succession' ? (f.succession_type || 'mit_beteiligung') : '' })); }}
                    style={{ textAlign: 'left', padding: '0.6rem 0.75rem', borderRadius: 8, cursor: 'pointer',
                      border: `1.5px solid ${buyerSegment === val ? C.steel : C.border}`, background: buyerSegment === val ? C.lightBg : C.xLight }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: C.navy }}>{t}</div>
                    <div style={{ fontSize: '0.72rem', color: C.gray, marginTop: 2, lineHeight: 1.3 }}>{sub}</div>
                  </button>
                ))}
              </div>

              {buyerSegment === 'succession' ? (
                <>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: C.navy, marginBottom: '0.3rem' }}>{t('reg.succession_interest', 'Ihr Nachfolge-Interesse')}</label>
                  <select value={form.succession_type} onChange={set('succession_type')} style={{ ...inputStyle, background: C.xLight }}>
                    <option value="mit_beteiligung">{t('reg.succ_with_equity', 'Nachfolge mit Kapitalbeteiligung')}</option>
                    <option value="ohne_beteiligung">{t('reg.succ_without_equity', 'Nachfolge ohne Beteiligung (operative Führung)')}</option>
                  </select>
                  <div style={{ fontSize: '0.72rem', color: C.gray, marginTop: '0.4rem', lineHeight: 1.4 }}>
                    {t('reg.network_note', 'Als Nachfolge-Interessent sind Sie Teil unseres Nachfolge-Netzwerks, kostenfrei, mit Matching und Events.')}
                  </div>
                </>
              ) : (
                <>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: C.navy, marginBottom: '0.3rem' }}>{t('reg.buyer_type', 'Käufertyp')}</label>
                  {/* Werteliste wie im CRM: nur so greift die Käufergruppen-Zielsteuerung */}
                  <select value={form.buyer_type} onChange={set('buyer_type')} style={{ ...inputStyle, background: C.xLight }}>
                    <option value="strategic">{t('buyer.strategic', 'Strategischer Käufer')}</option>
                    <option value="financial">{t('buyer.financial', 'Finanzinvestor / Private Equity')}</option>
                    <option value="business_angel">{t('buyer.angel', 'Business Angel')}</option>
                    <option value="venture_capital">{t('buyer.vc', 'Venture Capital')}</option>
                    <option value="family_office">{t('buyer.family_office', 'Family Office')}</option>
                    <option value="advisor_mandate">{t('buyer.advisor', 'M&A-Berater mit Suchmandat')}</option>
                  </select>
                </>
              )}
            </div>
          )}

          {/* Seller info box */}
          {roleType === 'seller' && (
            <div style={{ background: C.xLight, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.85rem 1rem', marginBottom: '0.9rem', fontSize: '0.8rem', color: C.gray, lineHeight: 1.6 }}>
              <strong style={{ color: C.navy }}>{t('reg.as_seller', 'Als Verkäufer')}</strong>{' '}{t('reg.seller_note', 'registrieren Sie sich kostenlos. Nach der Freischaltung können Sie Ihr Unternehmensprofil erstellen und Dokumente hochladen.')}
            </div>
          )}

          {/* Phone */}
          <Field label="Mobilnummer" value={form.mobile} onChange={set('mobile')} placeholder="+49 170 1234567" required />
          <div style={{ fontSize: '0.72rem', color: C.gray, marginTop: '-0.5rem', marginBottom: '0.7rem' }}>{t('reg.mobile_note', 'Pflichtangabe: Grundlage für die spätere 2-Faktor-Authentifizierung.')}</div>
          <Field label="Telefon (optional)" value={form.phone} onChange={set('phone')} placeholder="+49 9131 123456" />

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
              <Link to="/datenschutz" style={{ color: C.navy, fontWeight: 600 }}>{t('reg.privacy_link', 'Datenschutzhinweise')}</Link>{' '}
              und willige ein, dass meine Angaben zur Verwaltung meines Zugangs gespeichert und für die
              projektbezogene Ansprache (z.&nbsp;B. Informationen zu Mandaten und Prozessschritten) genutzt werden.
              Sofern die Phalanx GmbH mich zuvor persönlich (etwa über LinkedIn) kontaktiert hat, dürfen bereits
              zu mir vorbereitete Kontaktdaten mit diesem Konto zusammengeführt werden (Art. 13 DSGVO).
              Die Einwilligung kann ich jederzeit mit Wirkung für die Zukunft widerrufen.
            </label>
          </div>

          {/* Roboter-Test (nur sichtbar, wenn Cloudflare Turnstile konfiguriert ist) */}
          <Turnstile onToken={setTsToken} resetKey={tsReset} />

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
            {loading ? t('reg.submitting', 'Wird registriert…') : t('reg.submit', 'Kostenlos registrieren')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: C.gray }}>
          Bereits registriert?{' '}
          <Link to="/login" style={{ color: C.navy, fontWeight: 700 }}>{t('nav.login', 'Anmelden')}</Link>
        </div>
      </div>
    </div>
  );
}
