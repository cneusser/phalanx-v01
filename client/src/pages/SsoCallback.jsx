import React, { useEffect, useState } from 'react';
import { api, setzeGastansicht } from '../api/client';

// Landeseite nach dem SSO-Login: Phalanx OS leitet auf /sso#token=... zurück.
// Wir lesen das Token aus dem Hash (nicht aus der Query, damit es nicht in
// Server-Logs landet), legen es ab und laden die App neu. Der AuthProvider zieht
// daraufhin das Profil über /auth/me.
export default function SsoCallback() {
  const [error, setError] = useState('');

  // ── Das Token erst prüfen, dann weiterleiten (v0.465) ──────────────────
  //
  // Vorher wurde das Token abgelegt und sofort auf /admin umgeleitet. Hielt
  // der Server es dort nicht, warf die Anwendung es weg und schickte den
  // Benutzer auf die Anmeldeseite. Dort steht dann kein Grund, denn die
  // Umleitung kommt aus der Anwendung und nicht aus dem Anmeldeverfahren. Der
  // Benutzer sieht nur: Anmeldung, Anmeldung, Anmeldung.
  //
  // Jetzt wird einmal nachgefragt, bevor umgeleitet wird. Scheitert es,
  // steht hier, woran.
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
      if (!m || !m[1]) {
        setError('Kein gültiges Anmelde-Token empfangen.');
        return;
      }
      localStorage.setItem('phalanx_token', decodeURIComponent(m[1]));
      api.get('/auth/me')
        .then((d) => {
          const rolle = d && d.user && d.user.role;
          const intern = ['super_admin', 'tenant_owner', 'advisor', 'assistant', 'analyst'].includes(rolle);
          window.location.replace(intern ? '/admin' : '/dashboard');
        })
        .catch((e) => {
          // Nur bei 401 ist das Token wirklich unbrauchbar. Bei allem anderen
          // bleibt es liegen: Ein zweiter Anmeldeversuch hilft dort nicht,
          // und ein weggeworfenes Token verdeckt nur die Ursache.
          if (e && e.status === 401) {
            try { localStorage.removeItem('phalanx_token'); } catch { /* egal */ }
            setError(`Die Anmeldung wurde abgeschlossen, der Zugang aber nicht anerkannt: ${e.message}`);
          } else {
            setError(`Die Anmeldung hat geklappt, Ihr Konto lässt sich aber nicht laden: ${
              (e && e.message) || 'Der Server antwortet nicht.'}`);
          }
        });
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
