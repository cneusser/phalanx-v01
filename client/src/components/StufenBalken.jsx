import React, { useEffect, useState } from 'react';
import { FlaskConical } from 'lucide-react';

/**
 * Der Balken, der die Teststufe unverwechselbar macht (v0.482).
 *
 * Anlass: Eine zweite Stufe, die aussieht wie die Produktion, ist eine Falle.
 * Irgendwann pflegt dort jemand einen echten Interessenten ein und wundert
 * sich, dass nichts ankommt. Deshalb steht dieser Balken ganz oben, auf jeder
 * Seite, auch vor der Anmeldung, und lässt sich nicht wegklicken.
 *
 * Auf der Produktion antwortet der Server mit `ist_teststufe: false`, und
 * dieses Bauteil zeichnet nichts. Scheitert die Abfrage, zeichnet es ebenfalls
 * nichts: Ein Balken, der wegen eines Netzfehlers erscheint, wäre schlimmer
 * als keiner, weil man ihn nach dem dritten Mal nicht mehr liest.
 */
export default function StufenBalken() {
  const [stufe, setStufe] = useState(null);

  useEffect(() => {
    let abgebrochen = false;
    fetch('/api/stufe')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!abgebrochen && d && d.data) setStufe(d.data); })
      .catch(() => { /* kein Balken ohne Antwort */ });
    return () => { abgebrochen = true; };
  }, []);

  if (!stufe || !stufe.ist_teststufe) return null;

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 600,
      background: 'repeating-linear-gradient(135deg, #7c2d12 0 14px, #9a3412 14px 28px)',
      color: '#fff', padding: '0.5rem 1rem',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '0.8rem', flexWrap: 'wrap', boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.02em' }}>
        <FlaskConical size={15} />
        TESTSTUFE
      </span>
      <span style={{ fontSize: '0.78rem', opacity: 0.95 }}>
        {stufe.hinweis}
      </span>
    </div>
  );
}
