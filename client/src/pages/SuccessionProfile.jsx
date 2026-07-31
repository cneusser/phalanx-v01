import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Save, CheckCircle, UserCog, Target, ArrowRight, HelpCircle } from 'lucide-react';
import { NACE_INDUSTRIES, BUNDESLAENDER } from '../constants/projectOptions';

const C = { navy: '#1A4D8A', accent: '#29ABE2', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', text: '#0F172A', muted: '#64748B' };
const INPUT = { width: '100%', padding: '0.6rem 0.8rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', background: '#fff' };
const LABEL = { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.35rem' };

const SPECIALS = ['Seed / Start-up', 'Spin-off', 'Growth / Internationalisierung', 'Buy-out / Buy-in', 'Turnaround', 'IPO'];
const LAENDER = ['Deutschland', 'Österreich', 'Schweiz'];
// Nur die Bundesländer (die Länder-/DACH-Einträge stehen bereits bei „Zielländer")
const REGIONEN = BUNDESLAENDER.filter(r => !['Deutschland (bundesweit)', 'Österreich', 'Schweiz', 'DACH'].includes(r));
const UMSATZ = [['<1', 'unter 1 Mio.'], ['1-3', '1 bis 3 Mio.'], ['3-10', '3 bis 10 Mio.'], ['10-30', '10 bis 30 Mio.'], ['>30', 'über 30 Mio.']];
const MBI = [['reine_beteiligung', 'Reine Beteiligung'], ['partnerschaft', 'Strategische Partnerschaft'], ['operative_fuehrung', 'Übernahme der operativen Führung'], ['andere', 'Andere']];

function CheckGroup({ options, value, onChange }) {
  const list = value || [];
  const toggle = (o) => onChange(list.includes(o) ? list.filter(x => x !== o) : [...list, o]);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.35rem' }}>
      {options.map(o => (
        <label key={o} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.83rem', color: C.text, cursor: 'pointer', padding: '0.25rem 0' }}>
          <input type="checkbox" checked={list.includes(o)} onChange={() => toggle(o)} /> {o}
        </label>
      ))}
    </div>
  );
}

// Gruppierte Mehrfachauswahl (für die NACE-Branchen). Mehrere Branchen wählbar.
function GroupedCheck({ groups, value, onChange }) {
  const list = value || [];
  const toggle = (o) => onChange(list.includes(o) ? list.filter(x => x !== o) : [...list, o]);
  return (
    <div style={{ maxHeight: 260, overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.6rem 0.8rem', background: '#fff' }}>
      {groups.map(g => (
        <div key={g.group} style={{ marginBottom: '0.6rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.03em', margin: '0.2rem 0 0.3rem' }}>{g.group}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '0.15rem' }}>
            {g.options.map(o => (
              <label key={o} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', color: C.text, cursor: 'pointer', padding: '0.15rem 0' }}>
                <input type="checkbox" checked={list.includes(o)} onChange={() => toggle(o)} /> {o}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const Section = ({ title, children }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1.4rem', marginBottom: '1.1rem' }}>
    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: C.navy, margin: '0 0 1rem' }}>{title}</h3>
    {children}
  </div>
);

export default function SuccessionProfile() {
  const { user } = useAuth();
  const [f, setF] = useState({
    plz_ort: '', branchenerfahrung: '', funktionale_erfahrung: '', fuehrungserfahrung: '', budgetverantwortung: '',
    special_situations: [], ziel_laender: [], ziel_regionen: [], branchenfokus: [],
    umsatz_band: '', mbi_szenario: '', eigenkapital: '', verfuegbarkeit: '', bemerkungen: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [matches, setMatches] = useState([]);
  const [showHelp, setShowHelp] = useState(false);

  const loadMatches = () => api.get('/succession/matches').then(d => setMatches(d.matches || [])).catch(() => {});

  useEffect(() => {
    api.get('/succession/profile').then(d => {
      if (d) setF(prev => ({ ...prev, ...d }));
    }).catch(() => {}).finally(() => setLoading(false));
    loadMatches();
  }, []);

  const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value }));
  const setArr = (k) => (v) => setF(s => ({ ...s, [k]: v }));

  async function save() {
    setSaving(true); setMsg('');
    const payload = { ...f };
    try {
      await api.put('/succession/profile', payload);
      setMsg('Gespeichert. Danke, Ihr Nachfolge-Profil ist aktualisiert.');
      loadMatches();
    } catch (e) { setMsg('Fehler: ' + e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: C.muted }}>Profil wird geladen...</div>;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '2.5rem 1.5rem' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
          <UserCog size={22} color={C.navy} />
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: C.text, margin: 0 }}>Mein Nachfolge-Profil</h1>
        </div>

        {msg && (
          <div style={{ background: msg.startsWith('Fehler') ? '#fee2e2' : '#d1fae5', color: msg.startsWith('Fehler') ? '#991b1b' : '#065f46', borderRadius: 8, padding: '0.7rem 1rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
            <CheckCircle size={15} style={{ verticalAlign: -2 }} /> {msg}
          </div>
        )}

        {/* Passende Nachfolge-Mandate: prominent, ganz oben */}
        {matches.length > 0 && (
          <div style={{ background: `linear-gradient(135deg, ${C.navy}, #0d1b36)`, borderRadius: 14, padding: '1.4rem', marginBottom: '1.2rem', color: '#fff', boxShadow: '0 6px 22px rgba(13,27,54,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Target size={20} color="#fff" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>Passende Nachfolge-Mandate für Sie</h3>
              </div>
              <button onClick={() => setShowHelp(v => !v)} title="Wie wird die Übereinstimmung berechnet?"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '0.28rem 0.7rem', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}>
                <HelpCircle size={14} /> Wie wird das berechnet?
              </button>
            </div>

            {showHelp && (
              <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '0.9rem 1rem', marginBottom: '0.9rem', fontSize: '0.8rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.92)' }}>
                Die Übereinstimmung ist ein Richtwert. Sie startet bei 10 Prozent, weil es sich um ein Nachfolge-Mandat handelt, und steigt mit jeder Übereinstimmung: Branche bis zu 45, Region bis zu 30 und Umsatzgröße bis zu 15 Prozentpunkte. Es zählen nur die Angaben, die Sie im Profil unten machen. Je vollständiger Ihr Profil, desto genauer der Wert. Die grünen Marker an jedem Mandat zeigen, welche Kriterien konkret gepasst haben.
              </div>
            )}

            <div style={{ display: 'grid', gap: '0.6rem' }}>
              {matches.slice(0, 5).map(m => {
                const sc = Math.round(m.score);
                const strong = sc >= 55; const mid = sc >= 25 && sc < 55;
                const badgeBg = strong ? '#22c55e' : mid ? '#38bdf8' : 'rgba(255,255,255,0.18)';
                const badgeFg = strong || mid ? '#04263f' : '#fff';
                return (
                  <Link key={m.id} to={`/projekte/${m.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.9rem', background: 'rgba(255,255,255,0.96)', borderRadius: 10, padding: '0.8rem 0.9rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: C.text, fontSize: '0.92rem' }}>{m.sector_emoji ? m.sector_emoji + ' ' : ''}{m.codename} <span style={{ fontWeight: 500, color: C.muted, fontSize: '0.8rem' }}>· {m.deal_type}</span></div>
                      <div style={{ fontSize: '0.78rem', color: C.muted, marginTop: 2 }}>{[m.industry, m.region, m.revenue_band].filter(Boolean).join(' · ')}</div>
                      {m.reasons?.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: 5 }}>
                          {m.reasons.map(r => <span key={r} style={{ fontSize: '0.68rem', fontWeight: 700, color: '#065f46', background: '#d1fae5', borderRadius: 20, padding: '0.1rem 0.5rem' }}>{r}</span>)}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexShrink: 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 62, background: badgeBg, color: badgeFg, borderRadius: 12, padding: '0.4rem 0.2rem' }}>
                        <span style={{ fontWeight: 900, fontSize: '1.15rem', lineHeight: 1 }}>{sc}%</span>
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.03em', opacity: 0.85 }}>MATCH</span>
                      </div>
                      <ArrowRight size={16} color={C.navy} />
                    </div>
                  </Link>
                );
              })}
            </div>
            <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.75)', marginTop: '0.8rem' }}>
              Füllen Sie Ihr Profil unten aus, dann werden die Vorschläge und Prozentwerte genauer.
            </div>
          </div>
        )}

        <p style={{ color: C.muted, fontSize: '0.9rem', marginTop: 0, marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Je klarer Ihr Profil, desto besser passen die Vorschläge. Alle Angaben sind freiwillig und jederzeit änderbar. Sie werden vertraulich behandelt und nicht ohne Ihre Freigabe weitergegeben.
        </p>

        <Section title="Zur Person">
          <label style={LABEL}>PLZ und Wohnort</label>
          <input value={f.plz_ort} onChange={set('plz_ort')} placeholder="z. B. 90402 Nürnberg" style={INPUT} />
        </Section>

        <Section title="Berufliche Erfahrung">
          <div style={{ marginBottom: '0.8rem' }}><label style={LABEL}>Branchenerfahrung</label><textarea value={f.branchenerfahrung} onChange={set('branchenerfahrung')} rows={2} placeholder="In welchen Branchen waren Sie tätig?" style={{ ...INPUT, resize: 'vertical' }} /></div>
          <div style={{ marginBottom: '0.8rem' }}><label style={LABEL}>Funktionale Erfahrung</label><textarea value={f.funktionale_erfahrung} onChange={set('funktionale_erfahrung')} rows={2} placeholder="z. B. Vertrieb, Produktion, Finanzen, Geschäftsführung" style={{ ...INPUT, resize: 'vertical' }} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <div><label style={LABEL}>Führungserfahrung (Mitarbeiterzahl)</label><input value={f.fuehrungserfahrung} onChange={set('fuehrungserfahrung')} placeholder="z. B. bis 50 Mitarbeitende" style={INPUT} /></div>
            <div><label style={LABEL}>Bisher maximale Budgetverantwortung</label><input value={f.budgetverantwortung} onChange={set('budgetverantwortung')} placeholder="z. B. 10 Mio. Euro" style={INPUT} /></div>
          </div>
          <div style={{ marginTop: '0.9rem' }}><label style={LABEL}>Erfahrung in Sondersituationen</label>
            <CheckGroup options={SPECIALS} value={f.special_situations} onChange={setArr('special_situations')} />
          </div>
        </Section>

        <Section title="Gesuchtes Unternehmen">
          <div style={{ marginBottom: '0.9rem' }}><label style={LABEL}>Zielländer</label>
            <CheckGroup options={LAENDER} value={f.ziel_laender} onChange={setArr('ziel_laender')} />
          </div>
          <div style={{ marginBottom: '0.9rem' }}><label style={LABEL}>Regionen / Bundesländer (mehrere möglich, leer = bundesweit)</label>
            <CheckGroup options={REGIONEN} value={f.ziel_regionen} onChange={setArr('ziel_regionen')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '0.9rem' }}>
            <div><label style={LABEL}>Umsatzgröße</label>
              <select value={f.umsatz_band} onChange={set('umsatz_band')} style={INPUT}>
                <option value="">Bitte wählen</option>
                {UMSATZ.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            </div>
            <div><label style={LABEL}>MBI-Szenario</label>
              <select value={f.mbi_szenario} onChange={set('mbi_szenario')} style={INPUT}>
                <option value="">Bitte wählen</option>
                {MBI.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            </div>
          </div>
          <div><label style={LABEL}>Branchenfokus (mehrere möglich)</label>
            <GroupedCheck groups={NACE_INDUSTRIES} value={f.branchenfokus} onChange={setArr('branchenfokus')} />
          </div>
        </Section>

        <Section title="Finanzierung und Verfügbarkeit">
          <div style={{ marginBottom: '0.8rem' }}><label style={LABEL}>Vorhandenes Eigenkapital / Finanzierungsinstrumente</label><textarea value={f.eigenkapital} onChange={set('eigenkapital')} rows={2} placeholder="z. B. 300.000 Euro Eigenmittel, Förderdarlehen denkbar" style={{ ...INPUT, resize: 'vertical' }} /></div>
          <div><label style={LABEL}>Verfügbarkeit</label><input value={f.verfuegbarkeit} onChange={set('verfuegbarkeit')} placeholder="z. B. ab sofort, oder in 3 Monaten" style={INPUT} /></div>
        </Section>

        <Section title="Bemerkungen">
          <textarea value={f.bemerkungen} onChange={set('bemerkungen')} rows={3} placeholder="Was sollten wir noch wissen?" style={{ ...INPUT, resize: 'vertical' }} />
        </Section>

        <button onClick={save} disabled={saving} style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.8rem 1.6rem', fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', opacity: saving ? 0.7 : 1 }}>
          <Save size={16} /> {saving ? 'Wird gespeichert...' : 'Nachfolge-Profil speichern'}
        </button>
      </div>
    </div>
  );
}
