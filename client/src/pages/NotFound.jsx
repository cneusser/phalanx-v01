import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const C = { navy: '#14314F', steel: '#A5C8E4', bg: '#F3F7FB' };

export default function NotFound() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ width: 72, height: 72, background: `${C.navy}12`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <Shield size={32} color={C.navy} />
        </div>
        <div style={{ fontSize: '5rem', fontWeight: 800, color: `${C.navy}20`, lineHeight: 1, marginBottom: '0.5rem' }}>404</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: C.navy, marginBottom: '0.75rem' }}>Seite nicht gefunden</h1>
        <p style={{ color: '#666', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '2rem' }}>
          Die angeforderte Seite existiert nicht oder wurde verschoben. Bitte überprüfen Sie die URL oder kehren Sie zur Startseite zurück.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" style={{ background: C.navy, color: '#fff', padding: '0.7rem 1.5rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>
            Zur Startseite
          </Link>
          <Link to="/projekte" style={{ background: 'transparent', border: `1px solid ${C.navy}`, color: C.navy, padding: '0.7rem 1.5rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>
            Transaktionen ansehen
          </Link>
        </div>
      </div>
    </div>
  );
}
