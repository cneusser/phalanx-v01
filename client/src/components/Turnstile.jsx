import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

// Cloudflare-Turnstile-Widget (Roboter-Test). Zeigt nichts an, solange kein
// Site-Key konfiguriert ist, dann funktionieren die Formulare unverändert.
// onToken(token) liefert das Token; bei fehlender Konfiguration wird '' geliefert,
// damit das Formular ohne Bot-Test absendbar bleibt.
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
  const [siteKey, setSiteKey] = useState(undefined);   // undefined = noch laden

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
    loadScript().then(() => {
      if (cancelled || !ref.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token) => onToken && onToken(token),
        'expired-callback': () => onToken && onToken(''),
        'error-callback': () => onToken && onToken(''),
      });
    }).catch(() => { if (onToken) onToken(''); });
    return () => {
      cancelled = true;
      try { if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current); } catch { /* egal */ }
    };
  }, [siteKey, onToken]);

  if (!siteKey) return null;
  return <div ref={ref} style={{ margin: '0.75rem 0' }} />;
}
