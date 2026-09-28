import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useT } from '../i18n';

/**
 * Welche Fassung sehe ich gerade?
 *
 * Diese Anzeige gibt es, weil die Frage nicht zu beantworten war. Eine
 * Änderung war fertig, getestet und committet, aber nicht deployed, und von
 * aussen sieht das genauso aus wie ein Fehler in der Änderung. Dazu kann der
 * Browser eine alte Fassung im Speicher halten, dann sehen zwei Personen
 * verschiedene Dinge und keiner weiss warum.
 *
 * Also: links die Fassung, die dieser Browser geladen hat, rechts die, die der
 * Server ausliefert. Weichen sie voneinander ab, steht es da, mit einem Knopf
 * zum Neuladen. Das ist der häufigste Fall und der ärgerlichste, weil man ihn
 * ohne Hinweis für einen Programmfehler hält.
 *
 * __APP_VERSION__ und __BUILD_TIME__ setzt Vite beim Bauen ein (vite.config.js).
 */
const GELADEN = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : null;
const GEBAUT = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : null;

// „0.421.0" liest sich in der Oberfläche als „v0.421", so wie im Changelog.
const kurz = (v) => (v ? 'v' + String(v).replace(/\.0$/, '') : '?');

export default function Fassung({ hell = false }) {
  const t = useT();
  const [server, setServer] = useState(null);

  useEffect(() => {
    let abgebrochen = false;
    api.get('/version')
      .then((d) => { if (!abgebrochen) setServer(d); })
      .catch(() => { /* ohne Antwort zeigen wir schlicht nur den Browserstand */ });
    return () => { abgebrochen = true; };
  }, []);

  const veraltet = Boolean(GELADEN && server && server.version && server.version !== GELADEN);
  const farbe = hell ? 'rgba(255,255,255,0.55)' : '#5d6670';

  const titel = [
    `Im Browser: ${kurz(GELADEN)}`,
    GEBAUT ? `gebaut ${new Date(GEBAUT).toLocaleString('de-DE')}` : null,
    server && server.version ? `Auf dem Server: ${kurz(server.version)}` : null,
    server && server.commit ? `Commit ${server.commit}` : null,
  ].filter(Boolean).join('\n');

  return (
    <span style={{ fontSize: '0.72rem', color: farbe, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <Link
        to="/changelog"
        title={titel}
        style={{ color: farbe, textDecoration: 'none', borderBottom: `1px dotted ${farbe}` }}
      >
        {kurz(GELADEN)}
      </Link>
      {veraltet && (
        <button
          onClick={() => window.location.reload(true)}
          style={{
            background: '#c9a96e', color: '#10202c', border: 'none', borderRadius: 3,
            padding: '0.15rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          {t('fassung.neu_laden', 'Neue Fassung, neu laden')} ({kurz(server.version)})
        </button>
      )}
    </span>
  );
}
