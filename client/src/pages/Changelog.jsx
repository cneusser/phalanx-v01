/**
 * Was hat sich wann geändert?
 *
 * Den Changelog gab es bisher nur im Verwaltungsbereich, also für genau eine
 * Person. Hier steht er für alle angemeldeten Nutzer, zusammen mit der Angabe,
 * welche Fassung gerade läuft. Wer eine Änderung erwartet und sie nicht sieht,
 * soll nachsehen können, ob sie überhaupt schon draussen ist, statt einen
 * Fehler zu melden, den es nicht gibt.
 *
 * Die Einträge selbst sind deutsch: sie werden beim Bauen geschrieben, nicht
 * übersetzt. Die Rahmentexte sind zweisprachig.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useT, useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { Clock, ChevronLeft } from 'lucide-react';

const C = { navy: '#111820', bg: '#f4f6f7', card: '#FFFFFF', border: '#d8dde1', text: '#0F172A', muted: '#5d6670' };

const GELADEN = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : null;
const GEBAUT = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : null;
const kurz = (v) => (v ? 'v' + String(v).replace(/\.0$/, '') : '?');

export default function Changelog() {
  const t = useT();
  const { lang } = useI18n();
  const { user } = useAuth();
  const [eintraege, setEintraege] = useState([]);
  const [server, setServer] = useState(null);
  const [laedt, setLaedt] = useState(true);

  useEffect(() => {
    api.get('/version').then(setServer).catch(() => {});
    if (!user) { setLaedt(false); return; }
    api.get('/community/changelog')
      .then((d) => setEintraege(d || []))
      .catch(() => {})
      .finally(() => setLaedt(false));
  }, [user]);

  const datum = (d) => (d ? new Date(d).toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE') : '');
  const veraltet = Boolean(GELADEN && server && server.version && server.version !== GELADEN);

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <div style={{ background: C.navy, color: '#fff', padding: '1.75rem 1.5rem' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ChevronLeft size={14} /> {t('cl.zurueck', 'Zur Startseite')}
          </Link>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.6rem 0 0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={20} /> {t('cl.titel', 'Änderungen')}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.88rem', margin: 0 }}>
            {t('cl.intro', 'Was wann dazugekommen ist, und welche Fassung Sie gerade sehen.')}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '1.5rem' }}>
        {/* Welche Fassung läuft */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1.1rem 1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.9rem', fontSize: '0.85rem' }}>
            <div>
              <div style={{ color: C.muted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                {t('cl.im_browser', 'In Ihrem Browser')}
              </div>
              <div style={{ fontWeight: 700, color: C.navy, fontSize: '1.05rem' }}>{kurz(GELADEN)}</div>
              {GEBAUT && <div style={{ color: C.muted, fontSize: '0.75rem' }}>{t('cl.gebaut', 'gebaut')} {new Date(GEBAUT).toLocaleString(lang === 'en' ? 'en-GB' : 'de-DE')}</div>}
            </div>
            <div>
              <div style={{ color: C.muted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                {t('cl.auf_server', 'Auf dem Server')}
              </div>
              <div style={{ fontWeight: 700, color: C.navy, fontSize: '1.05rem' }}>{server ? kurz(server.version) : '…'}</div>
              {server && server.commit && <div style={{ color: C.muted, fontSize: '0.75rem' }}>Commit {server.commit}</div>}
            </div>
          </div>
          {server && (server.hinweise || []).length > 0 && (
            <div style={{ marginTop: '0.9rem' }}>
              {server.hinweise.map((h, i) => (
                <div key={i} style={{
                  background: h.schwere === 'fehler' ? '#fdecec' : '#fdf6e8',
                  borderLeft: `3px solid ${h.schwere === 'fehler' ? '#b3261e' : '#c9a96e'}`,
                  padding: '0.7rem 0.9rem', fontSize: '0.84rem', marginBottom: '0.4rem', lineHeight: 1.55,
                }}>
                  <strong>{h.schwere === 'fehler' ? 'Konfiguration' : 'Hinweis'}: </strong>{h.text}
                </div>
              ))}
            </div>
          )}
          {veraltet && (
            <div style={{ marginTop: '0.9rem', background: '#fdf6e8', borderLeft: '3px solid #c9a96e', padding: '0.7rem 0.9rem', fontSize: '0.85rem' }}>
              {t('cl.veraltet', 'Ihr Browser zeigt eine ältere Fassung. Ein Neuladen holt die aktuelle.')}{' '}
              <button onClick={() => window.location.reload(true)} style={{ background: 'none', border: 'none', color: C.navy, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                {t('cl.jetzt_laden', 'Jetzt neu laden')}
              </button>
            </div>
          )}
        </div>

        {/* Die Einträge */}
        {!user && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1.25rem', fontSize: '0.88rem', color: C.muted }}>
            {t('cl.nur_angemeldet', 'Die Liste der Änderungen sehen angemeldete Nutzer.')}{' '}
            <Link to="/login" style={{ color: C.navy, fontWeight: 700 }}>{t('nav.login', 'Anmelden')}</Link>
          </div>
        )}
        {user && laedt && <div style={{ color: C.muted, fontSize: '0.88rem' }}>{t('cl.laedt', 'Wird geladen…')}</div>}
        {user && !laedt && eintraege.length === 0 && (
          <div style={{ color: C.muted, fontSize: '0.88rem' }}>{t('cl.leer', 'Noch keine Einträge.')}</div>
        )}

        {eintraege.map((e) => (
          <div key={e.id || e.version} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1.1rem 1.25rem', marginBottom: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.7rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <span style={{
                background: e.version === kurz(server && server.version) ? '#c9a96e' : '#eef1f3',
                color: e.version === kurz(server && server.version) ? '#10202c' : C.navy,
                borderRadius: 4, padding: '0.1rem 0.5rem', fontSize: '0.78rem', fontWeight: 700,
              }}>{e.version}</span>
              <span style={{ fontWeight: 700, color: C.navy, fontSize: '0.95rem' }}>{e.title}</span>
              <span style={{ color: C.muted, fontSize: '0.78rem', marginLeft: 'auto' }}>{datum(e.released_on)}</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: '0.35rem', fontSize: '0.86rem', color: C.text, lineHeight: 1.55 }}>
              {(e.items || []).map((i, n) => <li key={n}>{i}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
