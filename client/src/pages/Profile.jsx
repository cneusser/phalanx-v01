import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Save, User } from 'lucide-react';

const C = { navy: '#14314F', steel: '#A5C8E4', bg: '#F3F7FB' };

const INDUSTRIES = ['Maschinenbau', 'Software & IT', 'Healthcare & Medizintechnik', 'Automotive & Zulieferer', 'Business Services', 'Lebensmittel & Getränke', 'Chemie & Pharma', 'Baugewerbe', 'Handel & E-Commerce', 'Energie & Umwelt'];
const REGIONS = ['Bayern', 'Baden-Württemberg', 'NRW', 'Hessen', 'Norddeutschland', 'Berlin / Brandenburg', 'Sachsen / Thüringen', 'Süddeutschland', 'DACH', 'DACH+'];
const DEAL_TYPES = ['Nachfolge', 'MBO', 'MBI', 'Wachstumskapital', 'Buy-and-Build', 'Strategische Partnerschaft'];

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/profile').then(d => {
      setProfile(d.profile);
      setIndustries(d.profile?.industries || []);
      setRegions(d.profile?.regions || []);
      setDealTypes(d.profile?.deal_types || []);
      setRevenueMin(d.profile?.revenue_min ?? 0);
      setRevenueMax(d.profile?.revenue_max ?? 100);
    }).finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/profile', { industries, regions, deal_types: dealTypes, revenue_min: revenueMin, revenue_max: revenueMax });
      setMsg('Profil gespeichert ✓');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setMsg('Fehler: ' + err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>Wird geladen...</div>;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ width: 52, height: 52, background: C.navy, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={24} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: C.navy }}>{user?.first_name} {user?.last_name}</h1>
          <div style={{ color: '#888', fontSize: '0.85rem' }}>{user?.company} · {user?.email}</div>
        </div>
      </div>

      {msg && <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#065f46' }}>{msg}</div>}

      <form onSubmit={save}>
        <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #dce8f2' }}>
          <h2 style={{ fontWeight: 600, color: C.navy, marginBottom: '1.5rem', fontSize: '1rem' }}>Suchkriterien & Investment-Präferenzen</h2>

          <MultiSelect label="Branchen" options={INDUSTRIES} value={industries} onChange={setIndustries} />
          <MultiSelect label="Regionen" options={REGIONS} value={regions} onChange={setRegions} />
          <MultiSelect label="Deal-Typen" options={DEAL_TYPES} value={dealTypes} onChange={setDealTypes} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#333', marginBottom: '0.35rem' }}>Umsatz von (Mio. €)</label>
              <input type="number" value={revenueMin} onChange={e => setRevenueMin(Number(e.target.value))} min={0} style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.875rem', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#333', marginBottom: '0.35rem' }}>Umsatz bis (Mio. €)</label>
              <input type="number" value={revenueMax} onChange={e => setRevenueMax(Number(e.target.value))} min={0} style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.875rem', outline: 'none' }} />
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: C.navy, color: '#fff', border: 'none', padding: '0.7rem 1.5rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
              <Save size={15} /> {saving ? 'Speichert...' : 'Profil speichern'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
