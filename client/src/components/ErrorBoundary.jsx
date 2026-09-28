// ─────────────────────────────────────────────────────────────────────────────
// Fehlergrenze: Wenn eine Seite abstürzt, zeigt React standardmäßig nichts an, 
// eine leere graue Fläche. Das ist der schlechteste Zustand: der Nutzer sieht
// nichts, und wir erfahren nichts. Hier fangen wir den Fehler ab, zeigen ihn
// verständlich an und geben einen Weg zurück.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';

const C = { navy: '#111820', accent: '#1D4E89', border: '#E2E8F0', muted: '#64748B' };

const FASSUNG = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : null;

/**
 * Den Absturz melden (v0.424).
 *
 * Bis hierher landete er nur in der Browserkonsole, und dorthin sieht niemand.
 * Ein Interessent im FARADAY-Datenraum hing vier Tage fest, und wir erfuhren
 * davon durch eine E-Mail mit einem Bildschirmfoto.
 *
 * Absichtlich mit fetch statt über den API-Helfer: Der wirft bei einem Fehler
 * selbst, und eine Fehlermeldung, die einen Fehler auslöst, verdeckt genau die
 * Ursache, die wir suchen. Aus demselben Grund fängt der Aufruf alles ab.
 */
export function meldeFehler(fehler, komponenten) {
  try {
    const token = localStorage.getItem('phalanx_token');
    fetch('/api/fehler', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        meldung: String((fehler && fehler.message) || fehler || 'Unbekannter Fehler'),
        komponenten: String(komponenten || '').trim().split('\n').slice(0, 8).join('\n'),
        adresse: window.location.pathname,
        fassung: FASSUNG,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* melden ist Kür, nicht Pflicht */ }
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // In die Konsole: damit der Fehler im Browser-Log auffindbar bleibt
    console.error('Seitenfehler:', error, info?.componentStack);
    // Und an den Server, sonst erfahren wir davon erst per E-Mail.
    meldeFehler(error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const msg = String(this.state.error?.message || this.state.error);
    const stack = String(this.state.info?.componentStack || '').trim().split('\n').slice(0, 6).join('\n');

    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <h1 style={{ color: C.navy, fontSize: '1.4rem', marginBottom: '0.5rem' }}>Diese Seite konnte nicht geladen werden</h1>
        <p style={{ color: C.muted, fontSize: '0.9rem', lineHeight: 1.6 }}>
          In der Anwendung ist ein Fehler aufgetreten. Die Meldung unten hilft bei der Behebung, 
          bitte schicken Sie sie uns, wenn das Problem bleibt.
        </p>

        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.9rem 1rem', margin: '1.2rem 0' }}>
          <div style={{ color: '#991b1b', fontWeight: 700, fontSize: '0.9rem', marginBottom: 6 }}>{msg}</div>
          {stack && (
            <pre style={{ margin: 0, fontSize: '0.72rem', color: '#7f1d1d', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{stack}</pre>
          )}
        </div>

        {/* Die Fassung gehört in die Meldung: Ohne sie sagt ein Bildschirmfoto
            nicht, welcher Stand abgestürzt ist, und man sucht im falschen. */}
        <p style={{ color: C.muted, fontSize: '0.78rem', marginTop: '-0.6rem', marginBottom: '1.2rem' }}>
          Fassung {FASSUNG ? 'v' + String(FASSUNG).replace(/\.0$/, '') : 'unbekannt'} · {new Date().toLocaleString('de-DE')}
          {' · '}Diese Meldung wurde automatisch an uns übermittelt.
        </p>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button onClick={() => window.location.reload()} style={{
            background: C.navy, color: '#fff', border: 'none', borderRadius: 8,
            padding: '0.6rem 1.2rem', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
          }}>Seite neu laden</button>
          <button onClick={() => { window.location.href = '/'; }} style={{
            background: '#fff', color: C.navy, border: `1px solid ${C.border}`, borderRadius: 8,
            padding: '0.6rem 1.2rem', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
          }}>Zur Startseite</button>
        </div>
      </div>
    );
  }
}
