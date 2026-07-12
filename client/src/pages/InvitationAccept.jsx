import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, AlertCircle, Eye, PenLine } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', steel: '#29ABE2', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', text: '#0F172A', muted: '#64748B' };
const INPUT = { width: '100%', padding: '0.6rem 0.8rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' };
const LABEL = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#333', marginBottom: '0.3rem' };

export default function InvitationAccept() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    salutation: '', title: '', first_name: '', last_name: '', company: '', position: '',
    mobile: '', password: '', privacy_consent: false,
  });

  const load = useCallback(async () => {
    if (!token) { setErr('Kein Einladungs-Token gefunden.'); setLoading(false); return; }
    try { setInv(await api.get(`/invitations/token/${token}`)); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  async function accept() {
    setBusy(true); setErr('');
    try {
      const d = await api.post(`/invitations/token/${token}/accept`, {});
      navigate(`/projekte/${d.project_id}`);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function decline() {
    if (!window.confirm('Einladung wirklich ablehnen?')) return;
    setBusy(true);
    try { await api.post(`/invitations/token/${token}/decline`, {}); await load(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function registerAndAccept(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const d = await api.post(`/invitations/token/${token}/register`, form);
      // Direkt eingeloggt weiter — Token setzen und neu laden, damit der Kontext greift
      localStorage.setItem('phalanx_token', d.token);
      window.location.href = `/projekte/${d.project_id}`;
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: C.muted }}>Einladung wird geprüft…</div>;

  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '2rem', boxShadow: '0 2px 12px rgba(13,27,54,0.06)' };

  if (!inv) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div style={card}>
          <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', color: '#991b1b' }}>
            <AlertCircle size={20} /> <strong>Einladung nicht verfügbar</strong>
          </div>
          <p style={{ color: C.muted, fontSize: '0.88rem', marginTop: '0.75rem' }}>{err || 'Diese Einladung existiert nicht.'}</p>
          <Link to="/" style={{ color: C.accent, fontSize: '0.85rem', fontWeight: 600 }}>Zur Startseite</Link>
        </div>
      </div>
    );
  }

  const isEditor = inv.role === 'editor';
  const closed = ['declined', 'revoked', 'expired', 'accepted'].includes(inv.status);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div style={card}>
        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, fontWeight: 700 }}>Einladung</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: C.navy, margin: '0.35rem 0 0.75rem' }}>
          {inv.project ? inv.project.codename : 'Mandat'}
        </h1>
        {inv.project && (
          <div style={{ fontSize: '0.82rem', color: C.muted, marginBottom: '1rem' }}>
            {[inv.project.industry, inv.project.region].filter(Boolean).join(' · ')}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.8rem 1rem', marginBottom: '1rem' }}>
          {isEditor ? <PenLine size={18} color={C.accent} /> : <Eye size={18} color={C.accent} />}
          <div>
            <div style={{ fontWeight: 700, color: C.text, fontSize: '0.9rem' }}>Rolle: {inv.role_label}</div>
            <div style={{ fontSize: '0.78rem', color: C.muted }}>
              {isEditor
                ? 'Sie dürfen das Mandat bearbeiten und pflegen (Daten, Exposé, Unterlagen).'
                : 'Sie erhalten Leserechte — ansehen, aber keine Änderungen.'}
            </div>
          </div>
        </div>

        {inv.inviter && (
          <p style={{ fontSize: '0.85rem', color: C.text, marginBottom: '0.5rem' }}>
            Eingeladen von <strong>{inv.inviter}</strong> · an <strong>{inv.email}</strong>
          </p>
        )}
        {inv.message && (
          <div style={{ background: '#F4F8FC', borderLeft: `3px solid ${C.steel}`, padding: '0.7rem 1rem', fontSize: '0.85rem', color: '#333', marginBottom: '1rem' }}>
            {inv.message}
          </div>
        )}

        {err && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: 8, padding: '0.7rem 0.9rem', fontSize: '0.83rem', marginBottom: '1rem' }}>{err}</div>
        )}

        {/* Bereits abgeschlossen */}
        {closed && (
          <div style={{ background: inv.status === 'accepted' ? '#d1fae5' : '#f1f5f9', borderRadius: 8, padding: '0.9rem 1rem', fontSize: '0.87rem', color: inv.status === 'accepted' ? '#065f46' : '#334155' }}>
            {inv.status === 'accepted' && <><CheckCircle size={15} style={{ verticalAlign: -2 }} /> Diese Einladung wurde bereits angenommen.</>}
            {inv.status === 'declined' && 'Diese Einladung wurde abgelehnt.'}
            {inv.status === 'revoked' && 'Diese Einladung wurde zurückgezogen.'}
            {inv.status === 'expired' && 'Diese Einladung ist abgelaufen. Bitte fordern Sie eine neue an.'}
          </div>
        )}

        {/* Eingeloggt und passend → annehmen */}
        {!closed && user && inv.logged_in_matches && (
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button onClick={accept} disabled={busy} style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem 1.5rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
              {busy ? 'Wird angenommen…' : 'Einladung annehmen'}
            </button>
            <button onClick={decline} disabled={busy} style={{ background: '#fff', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.75rem 1.25rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
              Ablehnen
            </button>
          </div>
        )}

        {/* Eingeloggt, aber falsches Konto */}
        {!closed && user && !inv.logged_in_matches && (
          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '0.9rem 1rem', fontSize: '0.85rem', color: '#92400e' }}>
            Sie sind als <strong>{user.email}</strong> angemeldet, die Einladung gilt aber für <strong>{inv.email}</strong>.
            Bitte melden Sie sich mit der eingeladenen Adresse an.
          </div>
        )}

        {/* Nicht eingeloggt, Konto vorhanden → anmelden mit Rücksprung */}
        {!closed && !user && inv.has_account && (
          <div>
            <p style={{ fontSize: '0.87rem', color: C.text, marginBottom: '0.75rem' }}>
              Für <strong>{inv.email}</strong> besteht bereits ein Konto. Bitte melden Sie sich an, um die Einladung anzunehmen.
            </p>
            <Link
              to={`/login?redirect=${encodeURIComponent(`/einladung?token=${token}`)}`}
              style={{ display: 'inline-block', background: C.navy, color: '#fff', borderRadius: 8, padding: '0.75rem 1.5rem', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}>
              Anmelden und annehmen
            </Link>
          </div>
        )}

        {/* Nicht eingeloggt, kein Konto → direkt anlegen (vorab freigeschaltet) */}
        {!closed && !user && !inv.has_account && (
          <form onSubmit={registerAndAccept}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: C.navy, margin: '1rem 0 0.25rem' }}>Konto anlegen</h2>
            <p style={{ fontSize: '0.8rem', color: C.muted, marginBottom: '1rem' }}>
              Ihre E-Mail-Adresse <strong>{inv.email}</strong> ist durch die Einladung bereits bestätigt — Sie werden nach dem Anlegen direkt zum Mandat weitergeleitet.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={LABEL}>Anrede *</label>
                <select value={form.salutation} onChange={set('salutation')} required style={INPUT}>
                  <option value="">Bitte wählen</option>
                  <option value="Herr">Herr</option>
                  <option value="Frau">Frau</option>
                  <option value="Divers">Divers</option>
                </select>
              </div>
              <div><label style={LABEL}>Titel</label><input value={form.title} onChange={set('title')} placeholder="Dr." style={INPUT} /></div>
              <div><label style={LABEL}>Vorname *</label><input value={form.first_name} onChange={set('first_name')} required style={INPUT} /></div>
              <div><label style={LABEL}>Nachname *</label><input value={form.last_name} onChange={set('last_name')} required style={INPUT} /></div>
              <div><label style={LABEL}>Unternehmen</label><input value={form.company} onChange={set('company')} style={INPUT} /></div>
              <div><label style={LABEL}>Position</label><input value={form.position} onChange={set('position')} style={INPUT} /></div>
              <div><label style={LABEL}>Mobilnummer *</label><input value={form.mobile} onChange={set('mobile')} required placeholder="+49 …" style={INPUT} /></div>
              <div><label style={LABEL}>Passwort * (min. 8 Zeichen)</label><input type="password" value={form.password} onChange={set('password')} required minLength={8} style={INPUT} /></div>
            </div>

            <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.8rem', color: '#444', margin: '0.75rem 0 1rem' }}>
              <input type="checkbox" checked={form.privacy_consent} onChange={set('privacy_consent')} required style={{ marginTop: 3 }} />
              <span>Ich stimme der <Link to="/datenschutz" target="_blank" style={{ color: C.accent }}>Datenschutzerklärung</Link> zu (Speicherung und projektbezogene Nutzung meiner Daten). *</span>
            </label>

            <button type="submit" disabled={busy} style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.8rem 1.5rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', width: '100%' }}>
              {busy ? 'Konto wird angelegt…' : 'Konto anlegen & Einladung annehmen'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
