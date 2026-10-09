import React, { useEffect, useState } from 'react';
import { setzeGastansicht } from '../api/client';

// Landeseite nach dem SSO-Login: Phalanx OS leitet auf /sso#token=... zurück.
// Wir lesen das Token aus dem Hash (nicht aus der Query, damit es nicht in
// Server-Logs landet), legen es ab und laden die App neu. Der AuthProvider zieht
// daraufhin das Profil über /auth/me.
export default function SsoCallback() {
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      // Eine laufende Gastansicht endet hier (v0.450). Sonst liegt das Token
      // im Speicher und wird trotzdem nicht mitgeschickt: Die Anwendung haelt
      // den Angemeldeten fuer einen Besucher, schickt ihn auf die
      // Anmeldeseite, von dort geht er wieder ueber Phalanx OS, und das ist
      // die Endlosschleife. Wer sich anmeldet, will keine Vorschau mehr.
      setzeGastansicht(false);

      const hash = window.location.hash || '';
      const m = hash.match(/token=([^&]+)/);
      if (m && m[1]) {
        localStorage.setItem('phalanx_token', decodeURIComponent(m[1]));
        window.location.replace('/admin');
        return;
      }
      setError('Kein gültiges Anmelde-Token empfangen.');
    } catch {
      setError('Anmeldung konnte nicht abgeschlossen werden.');
    }
  }, []);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
      <div style={{ textAlign: 'center' }}>
        {error ? (
          <>
            <p style={{ marginBottom: '0.8rem' }}>{error}</p>
            <a href="/login" style={{ color: '#174a6a', fontWeight: 700 }}>Zur Anmeldung</a>
          </>
        ) : (
          <p>Anmeldung wird abgeschlossen…</p>
        )}
      </div>
    </div>
  );
}
