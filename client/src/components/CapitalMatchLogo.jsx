import React from 'react';

// CapitalMatch brand colors
export const CM = {
  light: '#29ABE2',  // "Capital" — sky blue
  dark:  '#1A4D8A',  // "Match"   — deep navy
};

const FONT = "'Nunito', 'Poppins', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

/**
 * CapitalMatch Logo — pure CSS text, always works.
 *
 * Props:
 *   textSize  – base font size in px (default 22)
 *   white     – true = white text for dark backgrounds (Navbar, Footer, Hero)
 *               false = brand colours for light backgrounds (Login, Register)
 *   showClaim – show tagline "Kapital suchen. Partner finden."
 *   compact   – single-line "CapitalMatch" (Navbar/Footer)
 */
export default function CapitalMatchLogo({
  textSize  = 22,
  height    = null,  // legacy prop, unused
  size      = null,  // legacy prop, unused
  white     = false,
  showClaim = false,
  compact   = false,
}) {
  const colorCapital = white ? 'rgba(255,255,255,0.90)' : CM.light;
  const colorMatch   = white ? '#ffffff'                 : CM.dark;
  const colorClaim   = white ? 'rgba(255,255,255,0.60)' : '#6b7280';

  const wordStyle = (color) => ({
    fontFamily:    FONT,
    fontWeight:    800,
    fontSize:      textSize,
    color,
    letterSpacing: '-0.03em',
    lineHeight:    compact ? 1 : 1.1,
  });

  const claim = showClaim && !compact ? (
    <span style={{
      display:       'block',
      fontFamily:    FONT,
      fontWeight:    500,
      fontSize:      Math.round(textSize * 0.38),
      color:         colorClaim,
      letterSpacing: '0.04em',
      marginTop:     '0.45em',
      whiteSpace:    'nowrap',
    }}>
      Kapital suchen. Partner finden.
    </span>
  ) : null;

  if (compact) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'baseline', userSelect: 'none', lineHeight: 1 }}>
        <span style={wordStyle(colorCapital)}>Capital</span>
        <span style={wordStyle(colorMatch)}>Match</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', userSelect: 'none', lineHeight: 1 }}>
      <span style={wordStyle(colorCapital)}>Capital</span>
      <span style={wordStyle(colorMatch)}>Match</span>
      {claim}
    </div>
  );
}
