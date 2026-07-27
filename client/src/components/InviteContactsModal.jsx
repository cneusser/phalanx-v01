import React, { useState } from 'react';
import { api } from '../api/client';
import { X, Mail, Upload, CheckCircle, AlertCircle } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', text: '#0F172A', muted: '#64748B' };
const INPUT = { width: '100%', padding: '0.6rem 0.75rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' };

// Einladungs-Strecke: E-Mails einfügen ODER Excel/CSV hochladen. Für jede Adresse
// wird ein CRM-Kontakt angelegt (falls neu) und eine DSGVO-konforme Double-Opt-in-
// Einladung verschickt. Die Person füllt beim Onboarding Interesse und Daten selbst.
export default function InviteContactsModal({ onClose, onDone }) {
  const [mode, setMode] = useState('paste');   // paste | file
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);

  async function sendPaste() {
    setBusy(true); setErr('');
    try {
      const r = await api.post('/crm/invite/emails', { text });
      setResult(r); onDone && onDone();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }
  async function sendFile() {
    if (!file) { setErr('Bitte wählen Sie eine Datei.'); return; }
    setBusy(true); setErr('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const r = await api.upload('/crm/invite/import-file', fd);
      setResult(r); onDone && onDone();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: '1.75rem', width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontWeight: 700, color: C.text, fontSize: '1.1rem', margin: 0 }}>Kontakte einladen</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
        </div>

        {result ? (
          <div>
            <div style={{ background: '#d1fae5', borderRadius: 8, padding: '0.9rem 1rem', color: '#065f46', fontSize: '0.88rem', marginBottom: '0.9rem' }}>
              <CheckCircle size={16} style={{ verticalAlign: -3 }} /> {result.invited} Einladung{result.invited === 1 ? '' : 'en'} verschickt.
              {result.skipped > 0 && <span> {result.skipped} übersprungen.</span>}
            </div>
            {result.details?.skipped?.length > 0 && (
              <div style={{ fontSize: '0.8rem', color: C.muted, marginBottom: '0.9rem' }}>
                <div style={{ fontWeight: 600, color: C.text, marginBottom: 4 }}>Übersprungen:</div>
                {result.details.skipped.map((s, i) => <div key={i}>{s.email}: {s.reason}</div>)}
              </div>
            )}
            <button onClick={onClose} style={{ width: '100%', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Fertig</button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '0.83rem', color: C.muted, lineHeight: 1.5, marginTop: 0 }}>
              Die Eingeladenen bestätigen zuerst die Einwilligung (DSGVO) und füllen dann selbst ihr Profil und ihr Interesse (Käufer oder Verkäufer) aus. So kommen viele Daten sauber und rechtssicher herein.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button onClick={() => setMode('paste')} style={{ flex: 1, padding: '0.5rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', border: `1.5px solid ${mode === 'paste' ? C.accent : C.border}`, background: mode === 'paste' ? '#EDF4FA' : '#fff', color: C.navy }}><Mail size={13} style={{ verticalAlign: -2 }} /> E-Mails einfügen</button>
              <button onClick={() => setMode('file')} style={{ flex: 1, padding: '0.5rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', border: `1.5px solid ${mode === 'file' ? C.accent : C.border}`, background: mode === 'file' ? '#EDF4FA' : '#fff', color: C.navy }}><Upload size={13} style={{ verticalAlign: -2 }} /> Excel / CSV</button>
            </div>

            {err && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '0.6rem 0.8rem', fontSize: '0.82rem', marginBottom: '0.8rem' }}><AlertCircle size={14} style={{ verticalAlign: -2 }} /> {err}</div>}

            {mode === 'paste' ? (
              <>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#333', marginBottom: '0.3rem' }}>E-Mail-Adressen (mehrere erlaubt)</label>
                <textarea value={text} onChange={e => setText(e.target.value)} rows={6} placeholder="max@example.com, anna@firma.de&#10;weitere pro Zeile …" style={{ ...INPUT, resize: 'vertical', fontFamily: 'inherit' }} />
                <div style={{ fontSize: '0.74rem', color: C.muted, margin: '0.4rem 0 0.9rem' }}>Getrennt durch Komma, Semikolon oder Zeilenumbruch. Doppelte und bereits eingeladene werden automatisch übersprungen.</div>
                <button onClick={sendPaste} disabled={busy || !text.trim()} style={{ width: '100%', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem', fontWeight: 700, cursor: 'pointer', opacity: busy || !text.trim() ? 0.5 : 1 }}>
                  {busy ? 'Wird verschickt …' : 'Einladungen verschicken'}
                </button>
              </>
            ) : (
              <>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#333', marginBottom: '0.3rem' }}>Excel- oder CSV-Datei</label>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setFile(e.target.files[0])} style={{ ...INPUT, padding: '0.45rem' }} />
                <div style={{ fontSize: '0.74rem', color: C.muted, margin: '0.4rem 0 0.9rem' }}>Spalten werden erkannt: E-Mail (Pflicht), Vorname, Nachname. Andere Spalten werden ignoriert.</div>
                <button onClick={sendFile} disabled={busy || !file} style={{ width: '100%', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem', fontWeight: 700, cursor: 'pointer', opacity: busy || !file ? 0.5 : 1 }}>
                  {busy ? 'Wird gelesen …' : 'Datei einlesen und einladen'}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
