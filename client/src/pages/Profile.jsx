import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Save, User, Download, AlertTriangle } from 'lucide-react';

const C = { navy: '#14314F', steel: '#A5C8E4', bg: '#F3F7FB' };

const INDUSTRIES = ['Maschinenbau', 'Software & IT', 'Healthcare & Medizintechnik', 'Automotive & Zulieferer', 'Business Services', 'Lebensmittel & Getränke', 'Chemie & Pharma', 'Baugewerbe', 'Handel & E-Commerce', 'Energie & Umwelt'];
const REGIONS = ['Bayern', 'Baden-Württemberg', 'NRW', 'Hessen', 'Norddeutschland', 'Berlin / Brandenburg', 'Sachsen / Thüringen', 'Süddeutschland', 'DACH', 'DACH+'];
const DEAL_TYPES = ['Nachfolge', 'MBO', 'MBI', 'Wachstumskapital', 'Buy-and-Build', 'Strategische Partnerschaft'];

const INPUT = { width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' };

const MultiSelect = ({ label, options, value = [], onChange }) => (
  <div style={{ marginBottom: '1.25rem' }}>
    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#333', marginBottom: '0.5rem' }}>{label}</label>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
      {options.map(opt => {
        const selected = value.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => onChange(selected ? value.filter(v => v !== opt) : [...value, opt])} style={{
            padding: '0.3rem 0.75rem', borderRadius: 20, border: selected ? `1.5px solid ${C.navy}` : '1.5px solid #ddd',
            background: selected ? `${C.navy}12` : '#fff', color: selected ? C.navy : '#666',
            cursor: 'pointer', fontSize: '0.78rem', fontWeight: selected ? 600 : 400, transition: 'all 0.15s',
          }}>
            {opt}
          </button>
        );
      })}
    </div>
  </div>
);

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [industries, setIndustries] = useState([]);
  const [regions, setRegions] = useState([]);
  const [dealTypes, setDealTypes] = useState([]);
  const [revenueMin, setRevenueMin] = useState(0);
  const [revenueMax, setRevenueMax] = useState(100);
  // Kontaktdaten + Pitchbook-Selbstdarstellung
  const [contact, setContact] = useState({ salutation: '', title: '', first_name: '', last_name: '', company: '', position: '', mobile: '', phone: '', street: '', postal_code: '', city: '', about: '', website: '', linkedin_url: '' });
  const [missingFields, setMissingFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  // Sprint 18: Benachrichtigungs-Einstellungen (eigener Endpoint, echtes Opt-out möglich)
  const [notif, setNotif] = useState({ newsletter: true, newsletter_freq: 'instant', follow_updates: true, similar_suggestions: true });

  const isBuyer = user?.role === 'buyer';

  useEffect(() => { api.get('/community/notifications').then(setNotif).catch(() => {}); }, []);

  useEffect(() => {
    api.get('/profile').then(d => {
      setProfile(d.profile);
      setIndustries(d.profile?.industries || []);
      setRegions(d.profile?.regions || []);
      setDealTypes(d.profile?.deal_types || []);
      setRevenueMin(d.profile?.revenue_min ?? 0);
      setRevenueMax(d.profile?.revenue_max ?? 100);
      setContact({
        salutation: d.user?.salutation || '', title: d.user?.title || '',
        first_name: d.user?.first_name || '', last_name: d.user?.last_name || '',
        company: d.user?.company || '', position: d.user?.position || '', mobile: d.user?.mobile || '', phone: d.user?.phone || '',
        street: d.user?.street || '', postal_code: d.user?.postal_code || '', city: d.user?.city || '',
        about: d.user?.about || '', website: d.user?.website || '', linkedin_url: d.user?.linkedin_url || '',
      });
      setMissingFields(d.missing_fields || []);
    }).finally(() => setLoading(false));
  }, []);

  const setC = (key) => (e) => setContact(prev => ({ ...prev, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/profile', {
        ...contact,
        industries, regions, deal_types: dealTypes, revenue_min: revenueMin, revenue_max: revenueMax,
      });
      // Benachrichtigungs-Einstellungen separat speichern (booleans dürfen 0 sein)
      await api.put('/community/notifications', notif).catch(() => {});
      const d = await api.get('/profile');
      setMissingFields(d.missing_fields || []);
      setMsg('Profil gespeichert ✓');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setMsg('Fehler: ' + err.message); }
    finally { setSaving(false); }
  };

  // Eigenen Audit-Trail als CSV herunterladen (DSGVO-Transparenz)
  const downloadActivity = () => {
    const token = localStorage.getItem('phalanx_token');
    fetch('/api/profile/activity/export', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.blob() : Promise.reject(new Error('Export fehlgeschlagen')))
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'CapitalMatch_Aktivitaeten.csv'; a.click();
        URL.revokeObjectURL(url);
      })
      .catch(err => setMsg('Fehler: ' + err.message));
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>Wird geladen...</div>;

  const card = { background: '#fff', borderRadius: 12, padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #dce8f2', marginBottom: '1.5rem' };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ width: 52, height: 52, background: C.navy, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={24} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: C.navy }}>{user?.first_name} {user?.last_name}</h1>
          <div style={{ color: '#888', fontSize: '0.85rem' }}>{user?.company} · {user?.email}</div>
        </div>
      </div>

      {/* Vollständigkeits-Hinweis: Kontaktdaten sind Voraussetzung für den Prozess */}
      {missingFields.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '0.9rem 1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#92400e' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Profil unvollständig.</strong> Bitte vervollständigen Sie Ihre Kontaktdaten — sie sind Voraussetzung,
            um Mandate im Detail einzusehen, Interesse zu bekunden{user?.role === 'seller' ? ' bzw. Mandate anzulegen' : ''}.
          </div>
        </div>
      )}

      {msg && <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#065f46' }}>{msg}</div>}

      <form onSubmit={save}>
        {/* Kontaktdaten (Pflicht) */}
        <div style={card}>
          <h2 style={{ fontWeight: 600, color: C.navy, marginBottom: '1.5rem', fontSize: '1rem' }}>Kontaktdaten <span style={{ color: '#c00', fontWeight: 400, fontSize: '0.8rem' }}>(Pflicht für die Prozessteilnahme)</span></h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#333', marginBottom: '0.35rem' }}>Anrede *</label>
              <select value={contact.salutation} onChange={setC('salutation')} style={{ ...INPUT, background: '#fff', borderColor: missingFields.includes('salutation') ? '#f59e0b' : '#ddd' }}>
                <option value="">Bitte wählen…</option>
                <option value="Herr">Herr</option>
                <option value="Frau">Frau</option>
                <option value="Divers">Divers</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#333', marginBottom: '0.35rem' }}>Titel (optional)</label>
              <input value={contact.title} onChange={setC('title')} placeholder="z. B. Dr., Prof." style={INPUT} />
            </div>
            {[['Vorname *', 'first_name'], ['Nachname *', 'last_name'], ['Unternehmen *', 'company'], ['Position *', 'position'], ['Mobilnummer *', 'mobile'], ['Telefon (optional)', 'phone'], ['Straße + Hausnummer *', 'street']].map(([label, key]) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#333', marginBottom: '0.35rem' }}>{label}</label>
                <input value={contact[key]} onChange={setC(key)} style={{ ...INPUT, borderColor: missingFields.includes(key) ? '#f59e0b' : '#ddd' }} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#333', marginBottom: '0.35rem' }}>PLZ *</label>
                <input value={contact.postal_code} onChange={setC('postal_code')} style={{ ...INPUT, borderColor: missingFields.includes('postal_code') ? '#f59e0b' : '#ddd' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#333', marginBottom: '0.35rem' }}>Ort *</label>
                <input value={contact.city} onChange={setC('city')} style={{ ...INPUT, borderColor: missingFields.includes('city') ? '#f59e0b' : '#ddd' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Pitchbook-Selbstdarstellung */}
        <div style={card}>
          <h2 style={{ fontWeight: 600, color: C.navy, marginBottom: '0.5rem', fontSize: '1rem' }}>Ihr Profil (Pitchbook)</h2>
          <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
            Stellen Sie sich {isBuyer ? 'als Investor' : 'als Unternehmen'} vor — diese Angaben helfen bei der Einordnung Ihrer Anfragen im Prozess.
          </p>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#333', marginBottom: '0.35rem' }}>
              {isBuyer ? 'Über uns / Investment-Ansatz' : 'Über das Unternehmen'}
            </label>
            <textarea value={contact.about} onChange={setC('about')} rows={5} placeholder={isBuyer ? 'z. B. Fokus, Ticketgrößen, bisherige Beteiligungen, Wertbeitrag…' : 'z. B. Geschäftsmodell, Historie, Anlass der Transaktion…'} style={{ ...INPUT, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#333', marginBottom: '0.35rem' }}>Website</label>
              <input value={contact.website} onChange={setC('website')} placeholder="https://…" style={INPUT} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#333', marginBottom: '0.35rem' }}>LinkedIn</label>
              <input value={contact.linkedin_url} onChange={setC('linkedin_url')} placeholder="https://linkedin.com/…" style={INPUT} />
            </div>
          </div>
        </div>

        {/* Suchkriterien (nur Investoren) */}
        {isBuyer && (
          <div style={card}>
            <h2 style={{ fontWeight: 600, color: C.navy, marginBottom: '1.5rem', fontSize: '1rem' }}>Suchkriterien & Investment-Präferenzen</h2>

            <MultiSelect label="Branchen" options={INDUSTRIES} value={industries} onChange={setIndustries} />
            <MultiSelect label="Regionen" options={REGIONS} value={regions} onChange={setRegions} />
            <MultiSelect label="Deal-Typen" options={DEAL_TYPES} value={dealTypes} onChange={setDealTypes} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#333', marginBottom: '0.35rem' }}>Umsatz von (Mio. €)</label>
                <input type="number" value={revenueMin} onChange={e => setRevenueMin(Number(e.target.value))} min={0} style={INPUT} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#333', marginBottom: '0.35rem' }}>Umsatz bis (Mio. €)</label>
                <input type="number" value={revenueMax} onChange={e => setRevenueMax(Number(e.target.value))} min={0} style={INPUT} />
              </div>
            </div>
          </div>
        )}

        {/* Sprint 18: Benachrichtigungen — granulares Opt-in/Opt-out (DSGVO) */}
        <div style={card}>
          <h2 style={{ fontWeight: 600, color: C.navy, marginBottom: '0.5rem', fontSize: '1rem' }}>Benachrichtigungen</h2>
          <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
            Sie entscheiden, worüber wir Sie per E-Mail informieren. Alle Optionen sind jederzeit abwählbar.
          </p>
          {[
            ['newsletter', 'Newsletter: neue Mandate', 'Ein Hinweis, sobald ein neues Mandat im Marktplatz veröffentlicht wird.'],
            ['follow_updates', 'Updates zu Mandaten, denen ich folge', 'Änderungen, neue Unterlagen, Exposé und Statuswechsel (Due Diligence, LOI, Abschluss). Sie folgen einem Mandat automatisch, sobald Sie Interesse bekunden — oder manuell über den Stern.'],
            ['similar_suggestions', 'Hinweise auf ähnliche Mandate', 'Passende neue Mandate auf Basis der Mandate, für die Sie sich bisher interessiert haben.'],
          ].map(([key, label, hint]) => (
            <label key={key} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.75rem 0', borderTop: '1px solid #eef4f9', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!notif[key]}
                onChange={(e) => setNotif(n => ({ ...n, [key]: e.target.checked }))}
                style={{ marginTop: 3, width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
              />
              <span>
                <span style={{ display: 'block', fontSize: '0.87rem', fontWeight: 600, color: '#333' }}>{label}</span>
                <span style={{ display: 'block', fontSize: '0.76rem', color: '#888', lineHeight: 1.5, marginTop: 2 }}>{hint}</span>
              </span>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* DSGVO-Transparenz: eigener Audit-Trail */}
          <button type="button" onClick={downloadActivity} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', color: C.navy, border: '1px solid #dce8f2', padding: '0.7rem 1.25rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
            <Download size={15} /> Meine Aktivitäten (CSV)
          </button>
          <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: C.navy, color: '#fff', border: 'none', padding: '0.7rem 1.5rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
            <Save size={15} /> {saving ? 'Speichert...' : 'Profil speichern'}
          </button>
        </div>
      </form>
    </div>
  );
}
