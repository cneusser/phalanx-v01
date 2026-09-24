// ─────────────────────────────────────────────────────────────────────────────
// Pflegeseite ohne Anmeldung (v0.405).
//
// Der Link aus dem Mailing führt hierher. Gezeigt werden nur die Felder, die bei
// dieser Firma tatsächlich fehlen. Wer nichts ändern will, klickt auf
// „Angaben bestätigen". Beides beendet den Vorgang, der Link gilt danach nicht
// mehr.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, AlertCircle, ShieldCheck, Save, BellOff } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', steel: '#29ABE2', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', muted: '#64748B' };
const INPUT = { width: '100%', padding: '0.65rem 0.8rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', background: '#fff' };
const LABEL = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: C.navy, marginBottom: '0.3rem' };

const REGIONEN = ['Baden-Württemberg', 'Bayern', 'Berlin und Brandenburg', 'Hessen', 'Nordrhein-Westfalen',
  'Niedersachsen und Bremen', 'Rheinland-Pfalz und Saarland', 'Sachsen', 'Sachsen-Anhalt und Thüringen',
  'Schleswig-Holstein und Hamburg', 'Mecklenburg-Vorpommern', 'Österreich', 'Schweiz'];

// Die Seite ist öffentlich, also bewusst ohne den API-Client mit Bearer-Token.
async function hole(pfad, methode = 'GET', koerper = null) {
  const cfg = { method: methode, headers: { 'Content-Type': 'application/json' } };
  if (koerper) cfg.body = JSON.stringify(koerper);
  const res = await fetch(`/api/stammdaten${pfad}`, cfg);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.error || 'Es hat nicht funktioniert.');
  return json.data || {};
}

function Rahmen({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '2.5rem 1rem' }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <Link to="/" style={{ fontWeight: 800, fontSize: '1.15rem', color: C.navy, textDecoration: 'none', letterSpacing: '-0.02em' }}>
            CapitalMatch
          </Link>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '1.8rem', boxShadow: '0 2px 14px rgba(13,27,54,0.06)' }}>
          {children}
        </div>
        <p style={{ textAlign: 'center', fontSize: '0.74rem', color: C.muted, marginTop: '1.2rem', lineHeight: 1.6 }}>
          <Link to="/datenschutz" style={{ color: C.muted }}>Datenschutz</Link>
          {' · '}
          <Link to="/impressum" style={{ color: C.muted }}>Impressum</Link>
        </p>
      </div>
    </div>
  );
}

function Hinweis({ art, text }) {
  if (!text) return null;
  const farbe = art === 'fehler' ? { bg: '#FEF2F2', rand: '#FECACA', schrift: '#991B1B' } : { bg: '#F0FDF4', rand: '#BBF7D0', schrift: '#166534' };
  const Icon = art === 'fehler' ? AlertCircle : CheckCircle;
  return (
    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', background: farbe.bg, border: `1px solid ${farbe.rand}`, color: farbe.schrift, borderRadius: 9, padding: '0.7rem 0.85rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
      <Icon size={16} style={{ flexShrink: 0, marginTop: 2 }} />
      <span>{text}</span>
    </div>
  );
}

export default function Stammdaten() {
  const { token } = useParams();
  const [daten, setDaten] = useState(null);
  const [form, setForm] = useState({});
  const [laden, setLaden] = useState(true);
  const [fehler, setFehler] = useState('');
  const [erfolg, setErfolg] = useState('');
  const [busy, setBusy] = useState(false);
  const [abgemeldet, setAbgemeldet] = useState(false);

  const oeffnen = useCallback(async () => {
    try {
      const d = await hole(`/${token}`);
      setDaten(d);
      setForm({ ...d.firma, ansprechperson_rolle: d.kontakt.responsibility || '', ansprechperson_email: d.kontakt.email || '' });
    } catch (e) { setFehler(e.message); }
    setLaden(false);
  }, [token]);

  useEffect(() => { oeffnen(); }, [oeffnen]);

  const setzen = (k, v) => setForm((f) => {
    const neu = { ...f, [k]: v };
    // Wechselt der Sektor, passt der bisherige Schwerpunkt meist nicht mehr.
    if (k === 'sektor') neu.schwerpunkt = '';
    return neu;
  });

  const speichern = async () => {
    setBusy(true); setFehler(''); setErfolg('');
    try {
      await hole(`/${token}`, 'POST', {
        firma: {
          sektor: form.sektor, schwerpunkt: form.schwerpunkt, region: form.region, employees: form.employees,
          street: form.street, postal_code: form.postal_code, city: form.city, country: form.country,
        },
        kontakt: { responsibility: form.ansprechperson_rolle, email: form.ansprechperson_email },
      });
      setErfolg('Vielen Dank, Ihre Angaben sind gespeichert. Sie können dieses Fenster schließen.');
      setDaten((d) => ({ ...d, fertig: true }));
    } catch (e) { setFehler(e.message); }
    setBusy(false);
  };

  const bestaetigen = async () => {
    setBusy(true); setFehler(''); setErfolg('');
    try {
      await hole(`/${token}/bestaetigen`, 'POST');
      setErfolg('Danke für die Bestätigung. Ich melde mich in dieser Sache nicht wieder.');
      setDaten((d) => ({ ...d, fertig: true }));
    } catch (e) { setFehler(e.message); }
    setBusy(false);
  };

  const abmelden = async () => {
    setBusy(true); setFehler('');
    try {
      await hole(`/${token}/abmelden`, 'POST');
      setAbgemeldet(true);
    } catch (e) { setFehler(e.message); }
    setBusy(false);
  };

  if (laden) return <Rahmen><p style={{ color: C.muted, fontSize: '0.9rem', margin: 0 }}>Einen Moment bitte.</p></Rahmen>;

  if (abgemeldet) {
    return (
      <Rahmen>
        <BellOff size={26} color={C.accent} />
        <h1 style={{ fontSize: '1.15rem', color: C.navy, margin: '0.8rem 0 0.5rem' }}>Abgemeldet</h1>
        <p style={{ fontSize: '0.9rem', color: C.muted, lineHeight: 1.65, margin: 0 }}>
          Sie erhalten zu diesem Mailing keine weitere Nachricht. Ihr Zugang und alle übrigen
          Benachrichtigungen bleiben davon unberührt.
        </p>
      </Rahmen>
    );
  }

  if (!daten) {
    return (
      <Rahmen>
        <Hinweis art="fehler" text={fehler || 'Der Link ist nicht mehr gültig.'} />
        <p style={{ fontSize: '0.85rem', color: C.muted, margin: 0, lineHeight: 1.65 }}>
          Falls Sie Ihre Angaben noch ändern möchten, schreiben Sie mir kurz. Ich schicke Ihnen einen neuen Link.
        </p>
      </Rahmen>
    );
  }

  if (daten.fertig) return <Rahmen><Hinweis art="ok" text={erfolg} /></Rahmen>;

  const fehlend = daten.fehlend || [];
  const labels = daten.labels || {};
  const vok = daten.vokabular || {};
  const schwerpunkte = (vok.schwerpunkte || {})[form.sektor] || [];
  const zeigt = (k) => fehlend.includes(k);

  return (
    <Rahmen>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <ShieldCheck size={18} color={C.steel} />
        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: C.steel, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Ihre Angaben
        </span>
      </div>
      <h1 style={{ fontSize: '1.3rem', color: C.navy, margin: '0 0 0.4rem', letterSpacing: '-0.02em' }}>{daten.firma.name}</h1>
      <p style={{ fontSize: '0.88rem', color: C.muted, lineHeight: 1.65, marginTop: 0 }}>
        {fehlend.length
          ? 'Bitte ergänzen Sie die folgenden Angaben. Danach sind Sie fertig, eine Anmeldung ist nicht nötig.'
          : 'Bei Ihnen fehlt derzeit nichts. Ein Klick genügt, damit ich weiß, dass der Stand aktuell ist.'}
      </p>

      <Hinweis art="fehler" text={fehler} />
      <Hinweis art="ok" text={erfolg} />

      {zeigt('sektor') && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={LABEL}>{labels.sektor}</label>
          <select style={INPUT} value={form.sektor || ''} onChange={(e) => setzen('sektor', e.target.value)}>
            <option value="">Bitte wählen</option>
            {(vok.sektoren || []).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {form.sektor && schwerpunkte.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={LABEL}>Schwerpunkt <span style={{ fontWeight: 400, color: C.muted }}>(freiwillig)</span></label>
          <select style={INPUT} value={form.schwerpunkt || ''} onChange={(e) => setzen('schwerpunkt', e.target.value)}>
            <option value="">Keine Angabe</option>
            {schwerpunkte.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {zeigt('region') && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={LABEL}>{labels.region}</label>
          <select style={INPUT} value={form.region || ''} onChange={(e) => setzen('region', e.target.value)}>
            <option value="">Bitte wählen</option>
            {REGIONEN.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      )}

      {zeigt('employees') && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={LABEL}>{labels.employees}</label>
          <input type="number" min="1" style={INPUT} value={form.employees || ''}
            onChange={(e) => setzen('employees', e.target.value)} placeholder="zum Beispiel 45" />
        </div>
      )}

      {(zeigt('street') || zeigt('postal_code') || zeigt('city') || zeigt('country')) && (
        <div style={{ marginBottom: '1rem' }}>
          {zeigt('street') && (
            <div style={{ marginBottom: '0.7rem' }}>
              <label style={LABEL}>{labels.street}</label>
              <input style={INPUT} value={form.street || ''} onChange={(e) => setzen('street', e.target.value)} />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.6rem', marginBottom: zeigt('country') ? '0.7rem' : 0 }}>
            {zeigt('postal_code') && (
              <div>
                <label style={LABEL}>{labels.postal_code}</label>
                <input style={INPUT} value={form.postal_code || ''} onChange={(e) => setzen('postal_code', e.target.value)} />
              </div>
            )}
            {zeigt('city') && (
              <div style={{ gridColumn: zeigt('postal_code') ? 'auto' : '1 / -1' }}>
                <label style={LABEL}>{labels.city}</label>
                <input style={INPUT} value={form.city || ''} onChange={(e) => setzen('city', e.target.value)} />
              </div>
            )}
          </div>
          {zeigt('country') && (
            <div>
              <label style={LABEL}>{labels.country}</label>
              <select style={INPUT} value={form.country || ''} onChange={(e) => setzen('country', e.target.value)}>
                <option value="">Bitte wählen</option>
                {(vok.laender || []).map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {zeigt('ansprechperson_rolle') && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={LABEL}>Ihre Rolle im Unternehmen</label>
          <input style={INPUT} value={form.ansprechperson_rolle || ''}
            onChange={(e) => setzen('ansprechperson_rolle', e.target.value)} placeholder="zum Beispiel Geschäftsführung" />
        </div>
      )}

      {zeigt('ansprechperson_email') && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={LABEL}>Ihre E-Mail-Adresse</label>
          <input type="email" style={INPUT} value={form.ansprechperson_email || ''}
            onChange={(e) => setzen('ansprechperson_email', e.target.value)} />
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '1.4rem' }}>
        {fehlend.length > 0 && (
          <button type="button" onClick={speichern} disabled={busy} style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: C.navy, color: '#fff',
            border: 'none', borderRadius: 9, padding: '0.7rem 1.2rem', fontSize: '0.9rem', fontWeight: 700,
            cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
          }}>
            <Save size={16} /> Angaben speichern
          </button>
        )}
        <button type="button" onClick={bestaetigen} disabled={busy} style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
          background: fehlend.length ? '#fff' : C.navy, color: fehlend.length ? C.navy : '#fff',
          border: `1.5px solid ${C.navy}`, borderRadius: 9, padding: '0.7rem 1.2rem', fontSize: '0.9rem',
          fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
        }}>
          <CheckCircle size={16} /> Angaben bestätigen
        </button>
      </div>

      <p style={{ fontSize: '0.76rem', color: C.muted, marginTop: '1.4rem', lineHeight: 1.6, borderTop: `1px solid ${C.border}`, paddingTop: '0.9rem' }}>
        Ihre Angaben landen nur in Ihrer Firmenakte bei CapitalMatch und werden nicht weitergegeben.
        {' '}
        <button type="button" onClick={abmelden} disabled={busy} style={{
          background: 'none', border: 'none', padding: 0, color: C.accent, fontSize: '0.76rem',
          textDecoration: 'underline', cursor: 'pointer',
        }}>Keine weitere Nachricht zu diesem Mailing</button>
      </p>
    </Rahmen>
  );
}
