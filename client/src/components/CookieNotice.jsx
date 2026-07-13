// ─────────────────────────────────────────────────────────────────────────────
// Cookie-Hinweis — bewusst KEIN Consent-Layer mit Häkchen.
//
// Grund: CapitalMatch setzt keine Analyse-, Marketing- oder Tracking-Cookies.
// Gespeichert werden ausschließlich technisch erforderliche Angaben im lokalen
// Speicher des Browsers (Anmeldung, Sprachwahl). Nach § 25 Abs. 2 Nr. 2 TTDSG ist
// dafür keine Einwilligung nötig — wohl aber Transparenz. Ein Banner mit
// „Alle akzeptieren / Alle ablehnen" würde eine Wahl vortäuschen, die es hier
// nicht gibt; das wäre unehrlich und rechtlich nicht besser.
//
// Sobald wirklich einwilligungspflichtige Dienste hinzukommen (z. B. Matomo mit
// Cookies, Ads-Pixel), muss dieser Hinweis durch ein echtes Consent-Management
// ersetzt werden — mit Opt-in vor dem Setzen.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const KEY = 'cm_cookie_notice';

export default function CookieNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try { if (localStorage.getItem(KEY) !== 'seen') setShow(true); } catch { /* privater Modus */ }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(KEY, 'seen'); } catch { /* egal */ }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 2000,
      maxWidth: 560, margin: '0 auto',
      background: '#0D2A4A', color: '#fff', borderRadius: 12,
      padding: '1.1rem 1.25rem', boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
    }}>
      <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: 6 }}>
        Wir verzichten auf Tracking
      </div>
      <div style={{ fontSize: '0.83rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.85)' }}>
        CapitalMatch setzt <strong>keine Analyse-, Werbe- oder Tracking-Cookies</strong>. Gespeichert wird nur, was für den
        Betrieb nötig ist: Ihre Anmeldung und Ihre Spracheinstellung — lokal in Ihrem Browser. Einzelheiten in der{' '}
        <Link to="/cookies" style={{ color: '#8AB4D4', fontWeight: 700 }}>Cookie-Richtlinie</Link> und der{' '}
        <Link to="/datenschutz" style={{ color: '#8AB4D4', fontWeight: 700 }}>Datenschutzerklärung</Link>.
      </div>
      <button onClick={dismiss} style={{
        marginTop: '0.9rem', background: '#fff', color: '#0D2A4A', border: 'none', borderRadius: 8,
        padding: '0.55rem 1.3rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
      }}>
        Verstanden
      </button>
    </div>
  );
}
