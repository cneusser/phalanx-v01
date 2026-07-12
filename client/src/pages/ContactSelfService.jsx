import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { ShieldCheck, CheckCircle, AlertCircle, Save } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', steel: '#29ABE2', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', text: '#0F172A', muted: '#64748B' };
const INPUT = { width: '100%', padding: '0.6rem 0.8rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' };
const LABEL = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#333', marginBottom: '0.3rem' };

const INDUSTRIES = ['Bau & Baustoffe', 'Industrie & Maschinenbau', 'Handel & Konsumgüter', 'IT & Software',
  'Dienstleistung', 'Gesundheit & Pflege', 'Logistik & Transport', 'Energie & Umwelt', 'Lebensmittel',
  'Handwerk', 'Immobilien', 'Medien & Marketing'];
const REGIONS = ['Baden-Württemberg', 'Bayern', 'Berlin/Brandenburg', 'Hessen', 'NRW', 'Niedersachsen',
  'Sachsen', 'Norddeutschland', 'Ostdeutschland', 'Deutschland (bundesweit)', 'Österreich', 'Schweiz', 'DACH'];

// Mehrfachauswahl als Chips
function Chips({ label, options, value, onChange }) {
  const toggle = (o) => onChange(value.includes(o) ? value.filter(x => x !== o) : [...value, o]);
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={LABEL}>{label}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
        {options.map(o => {
          const on = value.includes(o);
          return (
            <button key={o} type="button" onClick={() => toggle(o)} style={{
              border: `1.5px solid ${on ? C.navy : C.border}`, background: on ? C.navy : '#fff',
              color: on ? '#fff' : C.muted, borderRadius: 20, padding: '0.3rem 0.75rem',
              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
            }}>{o}</button>
          );
        })}
      </div>
    </div>
  );
}

export default function ContactSelfService() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [data, setData] = useState(null);
  const [f, setF] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) { setErr('Kein Token gefunden.'); setLoading(false); return; }
    try {
      const d = await api.get(`/crm/profile/${token}`);
      setData(d);
      setF({ ...d.profile, focus_industries: d.profile.focus_industries || [], focus_regions: d.profile.focus_regions || [] });
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setBusy(true); setErr(''); setDone('');
    try {
      const r = await api.put(`/crm/profile/${token}`, f);
      setDone(r.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function unsubscribe(full) {
    const msg = full
      ? 'Möchten Sie der Kontaktaufnahme vollständig widersprechen? Wir werden Sie dann nicht mehr kontaktieren.'
      : 'Möchten Sie vorerst keine E-Mails mehr von uns erhalten?';
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      const r = await api.post(`/crm/profile/${token}/unsubscribe`, { full });
      setDone(r.message);
      if (full) setData(null);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '2rem', boxShadow: '0 2px 12px rgba(13,27,54,0.06)' };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: C.muted }}>Ihre Angaben werden geladen…</div>;

  if (!data || !f) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div style={card}>
          {done ? (
            <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', color: '#065f46' }}>
              <CheckCircle size={20} /> <strong>{done}</strong>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', color: '#991b1b' }}>
                <AlertCircle size={20} /> <strong>Link nicht verfügbar</strong>
              </div>
              <p style={{ color: C.muted, fontSize: '0.88rem', marginTop: '0.75rem' }}>{err}</p>
            </>
          )}
          <Link to="/" style={{ color: C.accent, fontSize: '0.85rem', fontWeight: 600 }}>Zur Startseite</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <ShieldCheck size={22} color={C.accent} />
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: C.navy, margin: 0 }}>Ihre Angaben bei uns</h1>
        </div>
        <p style={{ fontSize: '0.88rem', color: C.text, lineHeight: 1.7 }}>
          Das ist alles, was die Phalanx GmbH zu Ihnen gespeichert hat. Bitte prüfen und korrigieren Sie es —
          so sprechen wir Sie nur mit Transaktionen an, die wirklich zu Ihnen passen.
        </p>
        {data.companies?.length > 0 && (
          <div style={{ fontSize: '0.82rem', color: C.muted, marginBottom: '0.5rem' }}>
            Zugeordnet zu: <strong>{data.companies.map(c => c.name).join(', ')}</strong>
          </div>
        )}
        {data.requires_approval && (
          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e', borderRadius: 8, padding: '0.6rem 0.9rem', fontSize: '0.8rem', margin: '0.75rem 0' }}>
            Hinweis: Ihre Änderungen werden von uns kurz geprüft, bevor sie übernommen werden.
          </div>
        )}

        {done && (
          <div style={{ background: '#d1fae5', color: '#065f46', borderRadius: 8, padding: '0.8rem 1rem', fontSize: '0.87rem', margin: '1rem 0', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <CheckCircle size={16} /> {done}
          </div>
        )}
        {err && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: 8, padding: '0.7rem 0.9rem', fontSize: '0.83rem', margin: '1rem 0' }}>{err}</div>
        )}

        <form onSubmit={save} style={{ marginTop: '1.25rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: C.muted, letterSpacing: '0.05em', marginBottom: '0.6rem' }}>KONTAKTDATEN</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
            <div><label style={LABEL}>Anrede</label>
              <select value={f.salutation || ''} onChange={set('salutation')} style={INPUT}>
                <option value="">—</option><option>Herr</option><option>Frau</option><option>Divers</option>
              </select>
            </div>
            <div><label style={LABEL}>Titel</label><input value={f.title || ''} onChange={set('title')} style={INPUT} /></div>
            <div><label style={LABEL}>Vorname</label><input value={f.first_name || ''} onChange={set('first_name')} style={INPUT} /></div>
            <div><label style={LABEL}>Nachname</label><input value={f.last_name || ''} onChange={set('last_name')} style={INPUT} /></div>
            <div><label style={LABEL}>E-Mail</label><input value={f.email || ''} onChange={set('email')} style={INPUT} /></div>
            <div><label style={LABEL}>Mobil</label><input value={f.mobile || ''} onChange={set('mobile')} style={INPUT} /></div>
            <div><label style={LABEL}>Telefon</label><input value={f.phone || ''} onChange={set('phone')} style={INPUT} /></div>
            <div><label style={LABEL}>LinkedIn</label><input value={f.linkedin_url || ''} onChange={set('linkedin_url')} style={INPUT} /></div>
            <div><label style={LABEL}>Position / Funktion</label><input value={f.responsibility || ''} onChange={set('responsibility')} style={INPUT} /></div>
            <div><label style={LABEL}>Standort</label><input value={f.location || ''} onChange={set('location')} style={INPUT} /></div>
          </div>

          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: C.muted, letterSpacing: '0.05em', margin: '1.5rem 0 0.6rem' }}>WONACH SUCHEN SIE?</div>
          <Chips label="Brancheninteressen" options={INDUSTRIES} value={f.focus_industries} onChange={(v) => setF(s => ({ ...s, focus_industries: v }))} />
          <Chips label="Geografischer Fokus" options={REGIONS} value={f.focus_regions} onChange={(v) => setF(s => ({ ...s, focus_regions: v }))} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
            <div><label style={LABEL}>Ticketgröße von (Mio. €)</label>
              <input type="number" min={0} value={f.ticket_min ?? ''} onChange={set('ticket_min')} style={INPUT} />
            </div>
            <div><label style={LABEL}>Ticketgröße bis (Mio. €)</label>
              <input type="number" min={0} value={f.ticket_max ?? ''} onChange={set('ticket_max')} style={INPUT} />
            </div>
          </div>
          <div style={{ marginTop: '0.7rem' }}>
            <label style={LABEL}>Investitionsschwerpunkt (frei)</label>
            <textarea value={f.investment_focus || ''} onChange={set('investment_focus')} rows={3}
              placeholder="z. B. Nachfolgeregelungen im Mittelstand, EBITDA ab 0,5 Mio. €, Mehrheitsbeteiligungen …"
              style={{ ...INPUT, resize: 'vertical' }} />
          </div>

          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: C.muted, letterSpacing: '0.05em', margin: '1.5rem 0 0.6rem' }}>WIE DÜRFEN WIR SIE KONTAKTIEREN?</div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[['email', 'Per E-Mail'], ['phone', 'Lieber telefonisch'], ['none', 'Vorerst gar nicht']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setF(s => ({ ...s, comm_preference: k }))} style={{
                border: `1.5px solid ${f.comm_preference === k ? C.navy : C.border}`,
                background: f.comm_preference === k ? C.navy : '#fff',
                color: f.comm_preference === k ? '#fff' : C.muted,
                borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
              }}>{l}</button>
            ))}
          </div>

          <button type="submit" disabled={busy} style={{
            marginTop: '1.5rem', width: '100%', background: C.navy, color: '#fff', border: 'none',
            borderRadius: 8, padding: '0.85rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          }}>
            <Save size={16} /> {busy ? 'Wird gespeichert…' : 'Angaben speichern'}
          </button>
        </form>

        {/* DSGVO — Abmeldung */}
        <div style={{ borderTop: `1px solid ${C.border}`, marginTop: '1.75rem', paddingTop: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: C.muted, lineHeight: 1.6 }}>
            Sie möchten nicht mehr von uns hören? Sie können die Kontaktaufnahme jederzeit einschränken oder
            vollständig widersprechen — ohne Angabe von Gründen.
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.7rem', flexWrap: 'wrap' }}>
            <button onClick={() => unsubscribe(false)} disabled={busy} style={{ background: '#fff', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              Keine E-Mails mehr
            </button>
            <button onClick={() => unsubscribe(true)} disabled={busy} style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
              Kontaktaufnahme vollständig widersprechen
            </button>
          </div>
          <div style={{ fontSize: '0.72rem', color: C.muted, marginTop: '0.75rem' }}>
            Weitere Informationen in unserer <Link to="/datenschutz" target="_blank" style={{ color: C.accent }}>Datenschutzerklärung</Link>.
          </div>
        </div>
      </div>
    </div>
  );
}
