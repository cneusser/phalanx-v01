// ─────────────────────────────────────────────────────────────────────────────
// Fehlergrenze: Wenn eine Seite abstürzt, zeigt React standardmäßig nichts an, 
// eine leere graue Fläche. Das ist der schlechteste Zustand: der Nutzer sieht
// nichts, und wir erfahren nichts. Hier fangen wir den Fehler ab, zeigen ihn
// verständlich an und geben einen Weg zurück.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';

const C = { navy: '#0D1B36', accent: '#1D4E89', border: '#E2E8F0', muted: '#64748B' };

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
