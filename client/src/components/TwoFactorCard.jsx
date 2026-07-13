// ─────────────────────────────────────────────────────────────────────────────
// Sicherheit: Zwei-Faktor-Authentifizierung einrichten (Profil).
//
// Ablauf: Einrichtung starten → Geheimnis in der Authenticator-App hinterlegen
// (Link antippen oder Code abtippen) → mit einem Code bestätigen → Backup-Codes
// notieren. Die Backup-Codes werden genau einmal angezeigt.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { Shield, ShieldCheck, Copy, Check } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', bg: '#F8FAFC', border: '#E2E8F0', text: '#0F172A', muted: '#64748B' };

export default function TwoFactorCard() {
  const [status, setStatus] = useState(null);
  const [setup, setSetup] = useState(null);       // { secret, otpauth_url }
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState(null);       // Backup-Codes (einmalig)
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    api.get('/auth/2fa/status').then(setStatus).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  async function start() {
    setBusy(true); setMsg('');
    try { setSetup(await api.post('/auth/2fa/setup', {})); }
    catch (e) { setMsg('Fehler: ' + e.message); }
    finally { setBusy(false); }
  }

  async function enable() {
    setBusy(true); setMsg('');
    try {
      const r = await api.post('/auth/2fa/enable', { code: code.trim() });
      setCodes(r.backup_codes); setSetup(null); setCode(''); load();
      setMsg('Zwei-Faktor-Authentifizierung ist aktiv ✓');
    } catch (e) { setMsg('Fehler: ' + e.message); }
    finally { setBusy(false); }
  }

  async function disable() {
    const c = window.prompt('Zum Deaktivieren bitte einen aktuellen Code aus der App eingeben:');
    if (!c) return;
    setBusy(true); setMsg('');
    try { await api.post('/auth/2fa/disable', { code: c.trim() }); setCodes(null); load(); setMsg('2FA deaktiviert.'); }
    catch (e) { setMsg('Fehler: ' + e.message); }
    finally { setBusy(false); }
  }

  const copySecret = () => {
    navigator.clipboard?.writeText(setup.secret).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  if (!status) return null;

  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: '1.1rem 1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.5rem' }}>
        {status.enabled ? <ShieldCheck size={18} color="#059669" /> : <Shield size={18} color={C.muted} />}
        <div style={{ fontWeight: 800, color: C.navy, fontSize: '0.95rem' }}>Zwei-Faktor-Authentifizierung</div>
        <span style={{
          background: status.enabled ? '#d1fae5' : '#fef3c7', color: status.enabled ? '#065f46' : '#92400e',
          padding: '0.1rem 0.5rem', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700,
        }}>{status.enabled ? 'aktiv' : 'nicht aktiv'}</span>
      </div>

      <p style={{ fontSize: '0.83rem', color: C.muted, lineHeight: 1.6, margin: '0 0 0.9rem' }}>
        Ein zweiter Faktor schützt Ihr Konto auch dann, wenn Ihr Passwort in falsche Hände gerät.
        Sie brauchen dafür eine Authenticator-App (Google Authenticator, Microsoft Authenticator, 1Password, Authy).
        {status.required && <strong style={{ color: '#92400e' }}> Für Ihre Rolle ist 2FA verpflichtend.</strong>}
      </p>

      {msg && (
        <div style={{ background: msg.startsWith('Fehler') ? '#fee2e2' : '#d1fae5', color: msg.startsWith('Fehler') ? '#991b1b' : '#065f46', borderRadius: 8, padding: '0.6rem 0.8rem', fontSize: '0.82rem', marginBottom: '0.8rem' }}>{msg}</div>
      )}

      {/* Backup-Codes — genau einmal sichtbar */}
      {codes && (
        <div style={{ background: '#FFFBEB', border: '1px solid #fcd34d', borderRadius: 8, padding: '0.9rem 1rem', marginBottom: '0.9rem' }}>
          <div style={{ fontWeight: 800, color: '#92400e', fontSize: '0.85rem', marginBottom: 6 }}>
            Backup-Codes — jetzt sichern, sie werden nicht wieder angezeigt
          </div>
          <div style={{ fontSize: '0.78rem', color: '#92400e', marginBottom: 8 }}>
            Jeder Code funktioniert einmal. Nutzen Sie sie, wenn Sie keinen Zugriff auf Ihr Telefon haben.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 6, fontFamily: 'monospace', fontSize: '0.85rem', color: C.navy }}>
            {codes.map(c => <div key={c} style={{ background: '#fff', borderRadius: 5, padding: '0.35rem 0.5rem', textAlign: 'center', border: '1px solid #fde68a' }}>{c}</div>)}
          </div>
          <button onClick={() => setCodes(null)} style={{ marginTop: 10, background: '#92400e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.4rem 0.9rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
            Habe ich notiert
          </button>
        </div>
      )}

      {/* Einrichtung */}
      {setup && (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.9rem 1rem', marginBottom: '0.9rem' }}>
          <div style={{ fontSize: '0.82rem', color: C.text, marginBottom: 8, lineHeight: 1.6 }}>
            <strong>1.</strong> Auf dem Handy: <a href={setup.otpauth_url} style={{ color: C.accent, fontWeight: 700 }}>diesen Link antippen</a> — er öffnet die Authenticator-App.
            Am Rechner: das Geheimnis manuell in der App hinterlegen.
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
            <code style={{ flex: 1, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6, padding: '0.5rem 0.7rem', fontSize: '0.85rem', letterSpacing: '0.05em', wordBreak: 'break-all' }}>
              {setup.secret}
            </code>
            <button onClick={copySecret} title="Kopieren" style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6, padding: '0.5rem', cursor: 'pointer', color: C.navy }}>
              {copied ? <Check size={15} color="#059669" /> : <Copy size={15} />}
            </button>
          </div>
          <div style={{ fontSize: '0.82rem', color: C.text, marginBottom: 6 }}><strong>2.</strong> Code aus der App eingeben:</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="123456" inputMode="numeric"
              style={{ flex: 1, padding: '0.55rem 0.7rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '1rem', letterSpacing: '0.2em', textAlign: 'center', fontFamily: 'monospace', outline: 'none' }} />
            <button onClick={enable} disabled={busy || code.trim().length < 6} style={{
              background: busy || code.trim().length < 6 ? '#cbd5e1' : C.navy, color: '#fff', border: 'none',
              borderRadius: 8, padding: '0.55rem 1.2rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
            }}>Aktivieren</button>
          </div>
        </div>
      )}

      {status.enabled ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: C.muted }}>
            {status.backup_codes_remaining} Backup-Code(s) übrig
          </span>
          {!status.required && (
            <button onClick={disable} disabled={busy} style={{
              background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8,
              padding: '0.45rem 0.9rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
            }}>Deaktivieren</button>
          )}
        </div>
      ) : !setup && (
        <button onClick={start} disabled={busy} style={{
          background: C.navy, color: '#fff', border: 'none', borderRadius: 8,
          padding: '0.6rem 1.2rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
        }}>{busy ? 'Moment…' : 'Zwei-Faktor-Authentifizierung einrichten'}</button>
      )}
    </div>
  );
}
