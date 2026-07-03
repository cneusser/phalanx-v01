import React from 'react';
// Offizielles CapitalMatch-Logo (markenrechtlich geschützt).
// Vite-Import: Die Datei wird fest ins Build-Bundle kompiliert und kann zur
// Laufzeit nicht fehlen. Zum Austausch einfach die Datei
// client/src/assets/capitalmatch-logo.png ersetzen (gleicher Dateiname).
import logoUrl from '../assets/capitalmatch-logo.png';

// CapitalMatch brand colors (weiter von anderen Komponenten genutzt)
export const CM = {
  light: '#29ABE2',  // "Capital" — sky blue
  dark:  '#1A4D8A',  // "Match"   — deep navy
};

const FONT = "'Nunito', 'Poppins', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

/**
 * CapitalMatch Logo — offizielle Bildmarke.
 *
 * Props (API unverändert zu früher):
 *   textSize  – Basisgröße in px (steuert die Logo-Höhe; default 22)
 *   white     – true = Einsatz auf dunklem Hintergrund (Navbar, Footer, Hero):
 *               Logo wird auf einer weißen Schutzfläche gezeigt, damit die
 *               Markenfarben lesbar bleiben und unverändert sind.
 *   showClaim – Tagline "Kapital suchen. Partner finden." unter dem Logo
 *   compact   – kleinere Darstellung (Navbar/Footer)
 */
export default function CapitalMatchLogo({
  textSize  = 22,
  height    = null,  // legacy prop, unused
  size      = null,  // legacy prop, unused
  white     = false,
  showClaim = false,
  compact   = false,
}) {
  // Logo ist zweizeilig gesetzt → Höhe ≈ 2 Textzeilen
  const imgHeight = Math.round(textSize * (compact ? 1.9 : 2.2));
  const colorClaim = white ? 'rgba(255,255,255,0.60)' : '#6b7280';

  const img = (
    <img
      src={logoUrl}
      alt="CapitalMatch"
      style={{ height: imgHeight, width: 'auto', display: 'block', userSelect: 'none' }}
      draggable={false}
    />
  );

  // Auf dunklem Grund: weiße Schutzfläche (markenkonform, Farben unverändert)
  const mark = white ? (
    <span style={{
      display: 'inline-flex',
      background: '#ffffff',
      borderRadius: 6,
      padding: `${Math.max(3, Math.round(imgHeight * 0.14))}px ${Math.max(6, Math.round(imgHeight * 0.2))}px`,
      lineHeight: 0,
    }}>
      {img}
    </span>
  ) : img;

  const claim = showClaim && !compact ? (
    <span style={{
      display:       'block',
      fontFamily:    FONT,
      fontWeight:    500,
      fontSize:      Math.round(textSize * 0.38),
      color:         colorClaim,
      letterSpacing: '0.04em',
      marginTop:     '0.55em',
      whiteSpace:    'nowrap',
    }}>
      Kapital suchen. Partner finden.
    </span>
  ) : null;

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', userSelect: 'none' }}>
      {mark}
      {claim}
    </span>
  );
}
