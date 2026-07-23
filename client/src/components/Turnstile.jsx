import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

// Cloudflare-Turnstile-Widget (Roboter-Test). Zeigt nichts an, solange kein
// Site-Key konfiguriert ist, dann funktionieren die Formulare unverändert.
//
// Wichtig: Der Bot-Test darf legitime Nutzer NICHT aussperren. Kann das Widget
// nicht laden oder abschließen (blockiertes Netzwerk zu challenges.cloudflare.com,
// Browser-Erweiterung, Cloudflare-Störung), liefern wir ein Ersatz-Token
// ('__unavailable__'). Der Server lässt die Anmeldung dann durch und protokolliert
// den Fall, statt den Nutzer zu blockieren. onToken('') bleibt dem echten
// „noch nicht gelöst"-Zustand vorbehalten.
const UNAVAILABLE = '__unavailable__';
const READY_TIMEOUT_MS = 8000;

let scriptLoading = null;
function loadScript() {
  if (window.turnstile) return Promise.resolve();
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true; s.defer = true;
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
  return scriptLoading;
}

export default function Turnstile({ onToken }) {
  const ref = useRef(null);
  const widgetId = useRef(null);
  const solved = useRef(false);
  const [siteKey, setSiteKey] = useState(undefined);   // undefined = noch laden
  const [status, setStatus] = useState('loading');     // loading | ready | unavailable

  useEffect(() => {
    let alive = true;
    api.get('/auth/config')
      .then(cfg => { if (alive) setSiteKey(cfg.turnstile_site_key || null); })
      .catch(() => { if (alive) setSiteKey(null); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!siteKey) { if (siteKey === null && onToken) onToken(''); return; }
    let cancelled = false;

    // Sicherheitsnetz: Kommt binnen einiger Sekunden kein Token, gilt der Test als
    // nicht verfügbar, damit niemand vor einem leeren Kästchen festhängt.
    const timer = setTimeout(() => {
      if (cancelled || solved.current) return;
      setStatus('unavailable');
      if (onToken) onToken(UNAVAILABLE);
    }, READY_TIMEOUT_MS);

    const fail = () => {
      if (cancelled) return;
      setStatus('unavailable');
      if (onToken) onToken(UNAVAILABLE);
    };

    loadScript().then(() => {
      if (cancelled || !ref.current || !window.turnstile) return;
      setStatus('ready');
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token) => { solved.current = true; if (onToken) onToken(token); },
        'expired-callback': () => { solved.current = false; if (onToken) onToken(''); },
        'error-callback': fail,
        'timeout-callback': fail,
      });
    }).catch(fail);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      try { if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current); } catch { /* egal */ }
    };
  }, [siteKey, onToken]);

  if (!siteKey) return null;
  if (status === 'unavailable') {
    return (
      <div style={{ margin: '0.6rem 0', fontSize: '0.78rem', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.55rem 0.75rem', lineHeight: 1.5 }}>
        Die Sicherheitsprüfung ist gerade nicht erreichbar. Sie können sich trotzdem anmelden.
      </div>
    );
  }
  return <div ref={ref} style={{ margin: '0.75rem 0', minHeight: 4 }} />;
}
